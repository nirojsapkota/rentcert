# RentCert production runbook

Architecture: one EC2 instance (`t3.small`, Ubuntu 24.04) runs the `web` and `worker`
containers and PostgreSQL 16 (a Kamal accessory) with Kamal. kamal-proxy terminates HTTPS.
PostgreSQL data lives on a separate encrypted EBS volume (`/mnt/rentcert-data`). Documents are in a
private S3 bucket. Email goes through Amazon SES. Configuration is in SSM Parameter Store
(`/rentcert/prod/*`). Everything is in `ap-southeast-2`. All AWS commands use the `rentcert`
profile, never root.

Cost-first choice: PostgreSQL runs on the host instead of RDS (saves about US$18/month). What
that gives up: the worst-case data loss is about 1 hour (hourly dumps) instead of about 5 minutes,
and a lost instance means restoring from backup. Move to RDS once there is revenue (section 6).

## 1. One-time setup

### 1.1 Terraform state bucket

```bash
cd infra/bootstrap
terraform init
terraform apply          # creates rentcert-tfstate-<account id>
```

### 1.2 Deploy SSH key

Kamal still speaks SSH, but only through Systems Manager (port 22 is closed).

```bash
ssh-keygen -t ed25519 -C rentcert-deploy -f ~/.ssh/rentcert-deploy -N ""
```

### 1.3 Infrastructure

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # fill in: deploy_ssh_public_key, budget_email; domain when you have it
terraform init -backend-config="bucket=rentcert-tfstate-$(aws sts get-caller-identity --profile rentcert --query Account --output text)"
terraform plan -out plan.tfplan
terraform apply plan.tfplan
terraform output
```

Estimated cost: about US$25–27/month (EC2 t3.small $19.30, public IPv4 $3.65, 30 GB root and
10 GB data gp3 volumes $3.85, snapshots and S3 backups under $1, ECR cents; Parameter Store
standard tier is free). A budget alert emails you at US$30.

### 1.4 Domain, DNS and email (needs a domain)

1. Buy a domain (Route 53 → Registered domains can register `.com.au` and others).
2. Set `domain` (for example `app.rentcert.com.au`), `mail_from_domain` (for example
   `rentcert.com.au`) and, if DNS is in Route 53, `route53_zone_id` in `terraform.tfvars`. Then
   run `terraform apply` again.
3. If DNS is elsewhere, add the records from `terraform output dns_records_to_add`.
4. SES starts in the sandbox (it can only send to verified addresses). In the SES console,
   request production access for `ap-southeast-2`.

### 1.5 Application secrets

Terraform creates these SSM parameters with the value `unset`. Set each one (SecureString):

```bash
aws ssm put-parameter --profile rentcert --overwrite --type SecureString \
  --name /rentcert/prod/BETTER_AUTH_SECRET --value "$(openssl rand -base64 32)"
```


| Key | Value |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | From the Stripe dashboard (live mode). Webhook endpoint: `https://<domain>/api/webhooks/stripe` |
| `STRIPE_PRICE_PROPERTY`, `STRIPE_PRICE_PORTFOLIO` | Price ids of the two monthly AUD prices |
| `SENTRY_DSN` | Optional; from Sentry |
| `ALERT_EMAIL` | Where job alerts go |

Parameters written by Terraform (`DATABASE_URL`, `POSTGRES_PASSWORD`, `AWS_S3_BUCKET`,
`AWS_BACKUP_BUCKET`, `MAILER_FROM`, `BETTER_AUTH_URL`) must not be edited by hand.

### 1.6 GitHub

In the repository settings, create an environment named `production` (optionally with required
reviewers), and add:

- Variables: `RENTCERT_HOST` (= `terraform output -raw instance_id`), `RENTCERT_REGISTRY`
  (= `terraform output -raw ecr_registry`), `RENTCERT_DOMAIN`, `AWS_DEPLOY_ROLE_ARN`
  (= `terraform output -raw deploy_role_arn`), and optionally `NEXT_PUBLIC_SENTRY_DSN`.
- Secret: `DEPLOY_SSH_PRIVATE_KEY` (contents of `~/.ssh/rentcert-deploy`).

### 1.7 First deploy

Deploy from your machine once, so kamal-proxy and the certificate are set up:

```bash
# needs: kamal, docker, the AWS CLI and the Session Manager plugin
export AWS_PROFILE=rentcert
export RENTCERT_HOST=$(terraform -chdir=infra output -raw instance_id)
export RENTCERT_REGISTRY=$(terraform -chdir=infra output -raw ecr_registry)
export RENTCERT_DOMAIN=app.example.com.au
ssh-add ~/.ssh/rentcert-deploy
kamal setup           # boots PostgreSQL (accessory), web and worker
```

Then grant yourself admin inside the app:
`kamal app exec --roles=web "npx tsx --import ./scripts/server-only-shim.mjs scripts/admin-grant.ts you@example.com"`.

## 2. Everyday operations

| Task | Command |
|---|---|
| Deploy | Merge to `main`; GitHub Actions deploys after CI passes (or run the Deploy workflow by hand) |
| Deploy from your machine | `kamal deploy` (with the variables from 1.7) |
| Roll back | `kamal rollback <previous version>` (`kamal app containers` lists versions) |
| Web logs | `kamal app logs --roles=web -f` |
| Worker logs | `kamal app logs --roles=worker -f` |
| Shell on the host | `aws ssm start-session --target $RENTCERT_HOST --profile rentcert` |
| Health | `curl https://<domain>/api/health` (`{"status":"ok"}`; 503 if the database or worker is down) |

Migrations run automatically before each deploy (`.kamal/hooks/pre-deploy`). Write them to be
backward compatible (expand, then contract), because old containers run briefly against the new schema.

## 3. Secrets rotation

- **App secrets:** `aws ssm put-parameter --overwrite …`, then `kamal deploy`.
- **Database password:** change it inside PostgreSQL first
  (`kamal accessory exec postgres "psql -U rentcert -c \"ALTER USER rentcert PASSWORD '…'\""`), then
  update `/rentcert/prod/POSTGRES_PASSWORD` and `/rentcert/prod/DATABASE_URL` to match, then
  `kamal deploy`. (Terraform created the first password only.)
- **Deploy SSH key:** generate a new key, update `deploy_ssh_public_key` and `terraform apply`,
  then update the GitHub secret.
- `BETTER_AUTH_SECRET` rotation signs everyone out.

## 4. Backups and restore

| Protection | Schedule | Kept | Worst-case loss |
|---|---|---|---|
| `pg_dump` to S3 (`s3://<backups bucket>/postgres/`), from a systemd timer on the host | Hourly | 30 days | about 1 hour |
| EBS snapshots of the data volume (Data Lifecycle Manager) | Daily, 03:00 Melbourne | 7 days | about 1 day, but restores the whole volume fast |
| Deleted or overwritten documents in S3 (versioning) | On change | 30 days | none |

The worker's hourly job-health check alerts (Sentry and `ALERT_EMAIL`) when the newest dump is
older than 2 hours. Check the timer on the host with `systemctl list-timers rentcert-backup.timer`
and `journalctl -u rentcert-backup`.

**Restore from a dump** (most cases):

```bash
# 1. Pick a dump
aws s3 ls s3://<backups bucket>/postgres/ --profile rentcert | tail
# 2. On the host (aws ssm start-session --target $RENTCERT_HOST --profile rentcert):
aws s3 cp s3://<backups bucket>/postgres/rentcert-<timestamp>.dump /tmp/restore.dump
# 3. Stop the app so nothing writes during the restore
kamal app stop            # from your machine
# 4. Restore (replaces the current data)
docker exec -i rentcert-postgres pg_restore -U rentcert -d rentcert --clean --if-exists --no-owner < /tmp/restore.dump
# 5. Start the app again
kamal app boot
```

**Instance lost:** `terraform apply` creates a new instance and reattaches the data volume (it
has `prevent_destroy`), then run `kamal setup`. If the volume itself is lost, create a volume from
the latest snapshot (or a blank one and restore the latest dump as above).

**Restore a deleted document** (within 30 days): list versions with
`aws s3api list-object-versions --bucket <documents bucket> --prefix documents/<userId>/<documentId>`
and copy the previous version back over the key.

Record every drill in `docs/restore-test.md`.

## 5. Incidents

- **Site down:** check `/api/health`, then `kamal app logs`, then `kamal app details`. If a deploy
  caused it, `kamal rollback`.
- **Reminders not sending:** a job-health alert fires. Check the worker logs, the SES sending
  status (sandbox or suppression list), and the `compliance_reminders` rows with `status = 'FAILED'`.
- **Suspected data exposure:** revoke sessions (rotate `BETTER_AUTH_SECRET`), collect the audit
  events, and follow the Notifiable Data Breaches scheme (OAIC) assessment steps.

## 6. Moving to RDS later

When revenue justifies about US$18/month more: create an RDS PostgreSQL 16 instance (private,
encrypted, 7-day backups), stop the app, `pg_dump` from the accessory and `pg_restore` into RDS,
point `DATABASE_URL` at RDS (with `sslmode=verify-full` and the RDS CA bundle in the image), deploy,
then remove the accessory. The git history of `infra/` (commit 03fc2ad) has a ready RDS setup.

