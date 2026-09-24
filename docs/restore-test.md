# Restore drill log

Run a restore drill before launch, then every 6 months, following `docs/runbook.md` section 4.
A backup only counts once it has been restored.

| Date | Who | What was restored | Restore time used | Checks done | Duration | Result |
|---|---|---|---|---|---|---|
| 2026-09-24 | Claude (local drill) | `pg_dump --format=custom` of a migrated and seeded PostgreSQL 16 database, restored with `pg_restore --clean --if-exists --no-owner` into a fresh PostgreSQL 16 container | n/a (latest) | Row counts matched: 1 user, 3 properties, 8 compliance records, 6 requirements, 7 migrations; dump size 42 KB | under 1 minute | Passed (production drill still to do after launch) |

Checklist for each drill:

1. Download the newest dump from the backups bucket.
2. On the host, start a scratch container: `docker run -d --name restore-drill --network kamal -e POSTGRES_USER=rentcert -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=rentcert postgres:16`.
3. `docker exec -i restore-drill pg_restore -U rentcert -d rentcert --no-owner < dump`.
4. Compare row counts (users, properties, compliance_records) with production.
5. `docker rm -f restore-drill`, then record the result above.
