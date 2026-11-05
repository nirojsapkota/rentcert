# Council directory sources

The `councils` table is configuration seeded by migration `20261013035106_add_councils`.

## Seed status

The seed holds the 28 metropolitan Melbourne council names only. No lodgement method, contact
detail or portal link is seeded, because none has been checked against an official source yet.
Every row has `verified_at = null` and shows "Not yet verified. Check with the council."

## How to verify a council

1. Find the council's pool and spa barrier registration or certificate lodgement page on its official `.vic.gov.au` site.
2. In Admin → Councils, enter the lodgement method, contact details and portal link, and put that page's address in the source URL.
3. Save. Saving with a source URL marks the row verified today; clearing the source URL clears the verification.

| Council | Source URL | Verified |
|---|---|---|
| (none yet) | | |
