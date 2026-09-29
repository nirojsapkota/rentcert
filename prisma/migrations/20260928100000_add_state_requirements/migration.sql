-- Phase 10: a requirement set for every Australian state (SPEC-jurisdictions.md).
-- Seeded from research on 2026-09-28. last_verified_at stays NULL until a person checks each row
-- against the official source in Admin. GENERIC stays as the fallback for a state with no active rows.

-- CreateEnum
CREATE TYPE "RequirementBasis" AS ENUM ('REQUIRED_INTERVAL', 'BEFORE_EACH_TENANCY', 'RECOMMENDED');

-- AlterTable (existing VIC and GENERIC rows are required intervals)
ALTER TABLE "compliance_requirements" ADD COLUMN "basis" "RequirementBasis" NOT NULL DEFAULT 'REQUIRED_INTERVAL';

INSERT INTO "compliance_requirements"
  ("id", "code", "jurisdiction", "name", "description", "recurrence_months", "sort_order", "basis", "source_name", "source_url", "updated_at")
VALUES
  (gen_random_uuid(), 'smoke_alarm', 'NSW', 'Smoke alarm check',
   'Landlords must check smoke alarms are working every year, and repair or replace one within 2 business days of learning it is not working.', 12, 1, 'REQUIRED_INTERVAL'::"RequirementBasis", 'NSW Government: Smoke alarms in a rental property', 'https://www.nsw.gov.au/housing-and-construction/rules/smoke-alarms-a-rental-property', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'NSW', 'Electrical safety check',
   'Not a fixed legal interval in NSW. The landlord must keep wiring and fittings safe; many landlords have a licensed electrician check them every 2 years.', 24, 2, 'RECOMMENDED'::"RequirementBasis", 'NSW Government: Electrical safety in a rental property', 'https://www.nsw.gov.au/housing-and-construction/rules/electrical-safety-a-rental-property', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'NSW', 'Gas safety check',
   'Not a fixed legal interval in NSW. The landlord must keep gas appliances safe; many landlords have a licensed gasfitter check them every 2 years.', 24, 3, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smoke_alarm', 'QLD', 'Smoke alarm check',
   'Smoke alarms tested and cleaned, and flat batteries replaced, within 30 days before each new or renewed tenancy.', 12, 1, 'BEFORE_EACH_TENANCY'::"RequirementBasis", 'Residential Tenancies Authority (QLD): Smoke alarms', 'https://www.rta.qld.gov.au/during-a-tenancy/maintenance/smoke-alarms', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'QLD', 'Electrical safety check',
   'Not a fixed legal interval in QLD. The landlord must keep wiring and fittings safe; many landlords have a licensed electrician check them every 2 years.', 24, 2, 'RECOMMENDED'::"RequirementBasis", 'Residential Tenancies Authority (QLD): Electrical safety', 'https://www.rta.qld.gov.au/during-a-tenancy/maintenance/electrical-safety', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'QLD', 'Gas safety check',
   'Not a fixed legal interval in QLD. The landlord must keep gas appliances safe; many landlords have a licensed gasfitter check them every 2 years.', 24, 3, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smoke_alarm', 'SA', 'Smoke alarm check',
   'The owner must install and maintain working smoke alarms. Official advice is to clean alarms and check batteries at least once a year.', 12, 1, 'RECOMMENDED'::"RequirementBasis", 'SA.GOV.AU: Smoke alarms', 'https://www.sa.gov.au/topics/housing/keeping-your-property-safe/smoke-alarms', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'SA', 'Electrical safety check',
   'Not a fixed legal interval in SA. The landlord must keep wiring and fittings safe; many landlords have a licensed electrician check them every 2 years.', 24, 2, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'SA', 'Gas safety check',
   'Not a fixed legal interval in SA. The landlord must keep gas appliances safe; many landlords have a licensed gasfitter check them every 2 years.', 24, 3, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smoke_alarm', 'WA', 'Smoke alarm check',
   'Compliant, mains-powered smoke alarms confirmed installed and working before each new tenancy.', 12, 1, 'BEFORE_EACH_TENANCY'::"RequirementBasis", 'WA Building and Energy: Smoke alarm laws for homes being sold, rented and hired', 'https://www.wa.gov.au/organisation/building-and-energy/smoke-alarm-laws-homes-being-sold-rented-and-hired', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'WA', 'Electrical safety check',
   'Not a fixed legal interval in WA. The landlord must keep wiring and fittings safe; many landlords have a licensed electrician check them every 2 years.', 24, 2, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'WA', 'Gas safety check',
   'Not a fixed legal interval in WA. The landlord must keep gas appliances safe; many landlords have a licensed gasfitter check them every 2 years.', 24, 3, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smoke_alarm', 'TAS', 'Smoke alarm check',
   'Smoke alarms tested and cleaned before each new tenancy, with alarms and batteries not due to expire within 30 days.', 12, 1, 'BEFORE_EACH_TENANCY'::"RequirementBasis", 'CBOS Tasmania: Smoke alarms in rental properties', 'https://cbos.tas.gov.au/topics/housing/renting/beginning-tenancy/smoke-alarms', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'TAS', 'Electrical safety check',
   'Not a fixed legal interval in TAS. The landlord must keep wiring and fittings safe; many landlords have a licensed electrician check them every 2 years.', 24, 2, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'TAS', 'Gas safety check',
   'Not a fixed legal interval in TAS. The landlord must keep gas appliances safe; many landlords have a licensed gasfitter check them every 2 years.', 24, 3, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smoke_alarm', 'ACT', 'Smoke alarm check',
   'Compliant smoke alarms installed and working before entering into each tenancy agreement.', 12, 1, 'BEFORE_EACH_TENANCY'::"RequirementBasis", 'ACT Emergency Services Agency: Smoke alarms in leased residential properties', 'https://esa.act.gov.au/sites/default/files/wp-content/uploads/smoke-alarms-ver2.pdf', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'ACT', 'Electrical safety check',
   'Not a fixed legal interval in ACT. The landlord must keep wiring and fittings safe; many landlords have a licensed electrician check them every 2 years.', 24, 2, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'ACT', 'Gas safety check',
   'Not a fixed legal interval in ACT. The landlord must keep gas appliances safe; many landlords have a licensed gasfitter check them every 2 years.', 24, 3, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smoke_alarm', 'NT', 'Smoke alarm check',
   'Each smoke alarm tested within 30 days before a tenancy begins, and any that do not work replaced.', 12, 1, 'BEFORE_EACH_TENANCY'::"RequirementBasis", 'NT Government: Smoke alarms', 'https://nt.gov.au/emergency/community-safety/fire-safety-at-home/smoke-alarms', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'NT', 'Electrical safety check',
   'Not a fixed legal interval in NT. The landlord must keep wiring and fittings safe; many landlords have a licensed electrician check them every 2 years.', 24, 2, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'NT', 'Gas safety check',
   'Not a fixed legal interval in NT. The landlord must keep gas appliances safe; many landlords have a licensed gasfitter check them every 2 years.', 24, 3, 'RECOMMENDED'::"RequirementBasis", NULL, NULL, CURRENT_TIMESTAMP);
