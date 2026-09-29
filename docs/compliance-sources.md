# Compliance Sources (research notes)

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


## Other states and territories (Phase 10)

Researched: 2026-09-28 (see `SPEC-jurisdictions.md`). Seeded by migration
`20260928100000_add_state_requirements` with `last_verified_at` NULL. Several findings came from
secondary sources (tenant unions, industry sites); each row must be checked against the official page
before it is marked verified.

| State | `smoke_alarm` (12 months) | `electrical`, `gas` (24 months) | Official source |
|---|---|---|---|
| NSW | REQUIRED_INTERVAL: landlord checks alarms every year; repair or replace within 2 business days; replace within 10 years (RT Regulation 2019, standard agreement cl. 42). | RECOMMENDED: no periodic check mandated. | [NSW Government: Smoke alarms](https://www.nsw.gov.au/housing-and-construction/rules/smoke-alarms-a-rental-property), [Electrical safety](https://www.nsw.gov.au/housing-and-construction/rules/electrical-safety-a-rental-property) |
| QLD | BEFORE_EACH_TENANCY: test, clean and replace flat batteries within 30 days before each new or renewed tenancy. Interconnected photoelectric alarms required in all rentals by 1 January 2027 (not tracked). | RECOMMENDED: safety switches required on power circuits (installation, not tracked); no periodic check. | [RTA: Smoke alarms](https://www.rta.qld.gov.au/during-a-tenancy/maintenance/smoke-alarms), [RTA: Electrical safety](https://www.rta.qld.gov.au/during-a-tenancy/maintenance/electrical-safety) |
| SA | RECOMMENDED: owner installs and maintains working alarms; official advice is to clean and check batteries at least yearly. | RECOMMENDED | [SA.GOV.AU: Smoke alarms](https://www.sa.gov.au/topics/housing/keeping-your-property-safe/smoke-alarms), [MFS](https://www.mfs.sa.gov.au/community-safety/safety-and-education/fact-sheets/smoke-alarm-quick-guide) |
| WA | BEFORE_EACH_TENANCY: compliant hard-wired alarms installed and working before each tenancy; replace every 10 years. At least two RCDs required (installation, not tracked). | RECOMMENDED | [WA Building and Energy](https://www.wa.gov.au/organisation/building-and-energy/smoke-alarm-laws-homes-being-sold-rented-and-hired) |
| TAS | BEFORE_EACH_TENANCY: tested and cleaned before each new tenancy; alarms and batteries not expiring within 30 days. | RECOMMENDED | [CBOS Tasmania](https://cbos.tas.gov.au/topics/housing/renting/beginning-tenancy/smoke-alarms) |
| ACT | BEFORE_EACH_TENANCY: AS 3786 alarms installed and working before any tenancy; replace at 10 years. | RECOMMENDED | [ACT ESA](https://esa.act.gov.au/sites/default/files/wp-content/uploads/smoke-alarms-ver2.pdf) |
| NT | BEFORE_EACH_TENANCY: test each alarm within 30 days before a tenancy begins; replace any that fail. | RECOMMENDED | [NT Government](https://nt.gov.au/emergency/community-safety/fire-safety-at-home/smoke-alarms) |

`BEFORE_EACH_TENANCY` rows remind yearly, because RentCert does not know renewal dates; the owner is
told to also check before each new tenancy. `RECOMMENDED` electrical and gas rows keep reminders for
owners outside Victoria and say plainly that no fixed legal interval applies.

Not modelled (not recurring checks): RCD / safety switch installation, 10-year alarm replacement,
QLD's 2027 interconnection deadline, pool barrier certificates. Admins can add a requirement to any
state from Admin → Requirements if one of these should become a reminder.
