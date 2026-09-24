# RentCert production runbook

Architecture: one EC2 instance (`t3.small`, Ubuntu 24.04) runs the `web` and `worker`
containers with Kamal. kamal-proxy terminates HTTPS. PostgreSQL is Amazon RDS (private). Documents
are in a private S3 bucket. Email goes through Amazon SES. Everything is in `ap-southeast-2`. All AWS
commands use the `rentcert` profile, never root.

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

Estimated cost: about US$30–35/month (EC2 t3.small, RDS db.t4g.micro, Elastic IP, small S3,
ECR and Secrets Manager charges). A budget alert emails you at US$40.

### 1.4 Domain, DNS and email (needs a domain)

1. Buy a domain (Route 53 → Registered domains can register `.com.au` and others).
2. Set `domain` (for example `app.rentcert.com.au`), `mail_from_domain` (for example
   `rentcert.com.au`) and, if DNS is in Route 53, `route53_zone_id` in `terraform.tfvars`. Then
   run `terraform apply` again.
3. If DNS is elsewhere, add the records from `terraform output dns_records_to_add`.
4. SES starts in the sandbox (it can only send to verified addresses). In the SES console,
   request production access for `ap-southeast-2`.

### 1.5 Application secrets

In AWS Secrets Manager (`ap-southeast-2`), edit `rentcert/prod/app` and fill in:

| Key | Value |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | From the Stripe dashboard (live mode). Webhook endpoint: `https://<domain>/api/webhooks/stripe` |
| `STRIPE_PRICE_PROPERTY`, `STRIPE_PRICE_PORTFOLIO` | Price ids of the two monthly AUD prices |
| `SENTRY_DSN` | Optional; from Sentry |
| `ALERT_EMAIL` | Where job alerts go |

`rentcert/prod/infra` is written by Terraform; do not edit it by hand.

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
kamal setup
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

- **App secrets:** edit `rentcert/prod/app`, then `kamal deploy` (or `kamal env push` + `kamal app boot`).
- **Database password:** `terraform apply -replace=random_password.db` updates RDS and
  `rentcert/prod/infra`. Then redeploy straight away.
- **Deploy SSH key:** generate a new key, update `deploy_ssh_public_key` and `terraform apply`,
  then update the GitHub secret.
- `BETTER_AUTH_SECRET` rotation signs everyone out.

## 4. Backups and restore

- RDS takes daily automated backups, kept 7 days, with point-in-time recovery to within about 5
  minutes. Deletion protection is on, and a final snapshot is taken if the database is ever deleted.
- S3 keeps deleted or overwritten documents for 30 days (versioning plus lifecycle).

**Restore the database to a point in time** (creates a new instance; the old one is untouched):

```bash
aws rds restore-db-instance-to-point-in-time --profile rentcert \
  --source-db-instance-identifier rentcert \
  --target-db-instance-identifier rentcert-restore-$(date +%Y%m%d%H%M) \
  --restore-time 2026-01-31T03:00:00Z \
  --db-subnet-group-name rentcert --vpc-security-group-ids <db security group id> \
  --db-parameter-group-name rentcert-pg16 --no-publicly-accessible
```

Then point `DATABASE_URL` at the restored endpoint (update `rentcert/prod/infra`, redeploy), or
copy the rows you need across. Record every drill in `docs/restore-test.md`.

**Restore a deleted document** (within 30 days): list versions with
`aws s3api list-object-versions --bucket <bucket> --prefix documents/<userId>/<documentId>` and
copy the previous version back over the key.

## 5. Incidents

- **Site down:** check `/api/health`, then `kamal app logs`, then `kamal app details`. If a deploy
  caused it, `kamal rollback`.
- **Reminders not sending:** a job-health alert fires. Check the worker logs, the SES sending
  status (sandbox or suppression list), and the `compliance_reminders` rows with `status = 'FAILED'`.
- **Suspected data exposure:** revoke sessions (rotate `BETTER_AUTH_SECRET`), collect the audit
  events, and follow the Notifiable Data Breaches scheme (OAIC) assessment steps.
