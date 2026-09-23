# Victorian Compliance Sources (research notes)

Researched: 2026-09-23. These notes are the basis for the seeded `ComplianceRequirement` rows.
They are NOT legal advice. A human must review each row before production launch and set
`last_verified_at` only after that review.

| Code | Seed interval | Official wording | Who performs it | Source |
|---|---|---|---|---|
| `smoke_alarm` | 12 months | Smoke alarms "tested at least once every 12 months in accordance with any instructions by the manufacturer". CAV also states: "From 25 November 2025, it will be mandatory for all rental properties to have annual smoke alarm safety checks." | No specific qualification stated for testing. Hard-wired alarms must be installed by a qualified electrician. | [CAV: Smoke alarms and fire safety](https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/keeping-the-property-safe/smoke-alarms-and-fire-safety) |
| `electrical` | 24 months | "must have all electrical installations and fittings checked by a licensed electrician at least once every 2 years" | Licensed electrician | [CAV: Rental providers – gas and electrical safety](https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/gas-electrical-and-water-safety-standards/rental-providers-gas-and-electrical-safety) |
| `gas` | 24 months | "must have gas safety checks conducted every 2 years by a licensed or registered gasfitter" | Licensed or registered gasfitter endorsed in Type A Gas Appliances Servicing | Same CAV page; [Energy Safe Victoria: Residential property safety checks](https://www.energysafe.vic.gov.au/community-safety/energy-safety-guides/home-safety/tenants-and-renting-laws) |

Legal instruments named by the sources:

- Residential Tenancies Regulations 2021, Schedule 3, regulations 5, 16 and 30 (gas and electrical).
- Residential Tenancies Act 1997, sections 68AA and 72 (smoke alarms, per the CAV page).

Other findings that affect product behaviour:

- If no gas or electrical check happened in the last 2 years when a renter occupies the
  premises, the check is to be completed "as soon as possible". RentCert therefore treats an
  unknown or older-than-interval last check date as due now.
- Rental providers must keep the record of each gas and electrical check until the next check
  record exists. This supports the certificate vault and the immutable history.
- The gas requirement only makes sense for properties with gas installations. RentCert lets
  the user mark requirements as not applicable for each property.

Open verification items:

- Read the regulation text on legislation.vic.gov.au and confirm the regulation numbers.
- Confirm whether a smoke alarm check has a qualification requirement since 25 November 2025.
- Confirm the exact trigger date wording for the first check of a new rental agreement.
