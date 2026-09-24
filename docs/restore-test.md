# Restore drill log

Run a restore drill before launch, then every 6 months, following `docs/runbook.md` section 4.
A backup only counts once it has been restored.

| Date | Who | What was restored | Restore time used | Checks done | Duration | Result |
|---|---|---|---|---|---|---|
| _not yet run_ | | | | Row counts for users, properties, compliance_records; sign in; open a document | | |

Checklist for each drill:

1. Restore to a new instance (point in time, about 1 hour ago).
2. Connect through the host (`aws ssm start-session`) and compare row counts with production.
3. Point a temporary app container at it (`kamal app exec` with an overridden `DATABASE_URL`) and
   sign in as a test user.
4. Delete the restored instance (`aws rds delete-db-instance … --skip-final-snapshot`).
5. Record the result above.
