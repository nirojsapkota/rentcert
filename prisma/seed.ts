// Development seed: one verified demo user with fictional properties. Never seed real data.
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { addMonths, parseCalendarDate, todayIn } from "../src/lib/calendar-date";

const DEMO_EMAIL = "demo@rentcert.local";
const DEMO_PASSWORD = "demo-password-123";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a production database.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

    const userId = randomUUID();
    await db.user.create({
      data: {
        id: userId,
        email: DEMO_EMAIL,
        emailVerified: true,
        firstName: "Demo",
        lastName: "Landlord",
        name: "Demo Landlord",
        accounts: {
          create: { id: randomUUID(), accountId: userId, providerId: "credential", password: await hashPassword(DEMO_PASSWORD) },
        },
        properties: {
          create: [
            { addressLine1: "12 Example Street", suburb: "Narre Warren", state: "VIC", postcode: "3805", leaseStartDate: new Date("2024-10-12") },
            { addressLine1: "4 Sample Road", addressLine2: "Unit 2", suburb: "Brunswick", state: "VIC", postcode: "3056", nickname: "Brunswick unit" },
            { addressLine1: "8 Placeholder Avenue", suburb: "Parramatta", state: "NSW", postcode: "2150", leaseStartDate: new Date("2025-03-01") },
          ],
        },
      },
    });

    // Compliance records chosen relative to today so the dashboard shows every status.
    const today = todayIn("Australia/Melbourne");
    const requirements = await db.complianceRequirement.findMany();
    const requirement = (jurisdiction: string, code: string) =>
      requirements.find((row) => row.jurisdiction === jurisdiction && row.code === code)!;
    const [narreWarren, brunswick, parramatta] = await db.property.findMany({ where: { userId }, orderBy: { suburb: "asc" } }).then(
      (rows) => ["Narre Warren", "Brunswick", "Parramatta"].map((suburb) => rows.find((row) => row.suburb === suburb)!),
    );
    const completed = (propertyId: string, jurisdiction: string, code: string, monthsAgo: number, daysOffset = 0) => {
      const req = requirement(jurisdiction, code);
      const completedOn = addMonths(today, -monthsAgo);
      const shifted = new Date(parseCalendarDate(completedOn)!.getTime() + daysOffset * 86_400_000);
      const nextDue = addMonths(shifted.toISOString().slice(0, 10), req.recurrenceMonths);
      return {
        propertyId,
        requirementId: req.id,
        kind: "COMPLETED" as const,
        completedOn: shifted,
        nextDueOn: parseCalendarDate(nextDue)!,
        providerName: "Example Safety Services",
      };
    };
    await db.complianceRecord.createMany({
      data: [
        completed(narreWarren.id, "VIC", "smoke_alarm", 12, 14), // due in about 2 weeks
        completed(narreWarren.id, "VIC", "electrical", 24, -10), // overdue by about 10 days
        completed(narreWarren.id, "VIC", "gas", 36), // older gas check (history)
        completed(narreWarren.id, "VIC", "gas", 6), // current gas check, upcoming
        completed(brunswick.id, "VIC", "smoke_alarm", 2),
        completed(brunswick.id, "VIC", "electrical", 20),
        completed(parramatta.id, "GENERIC", "smoke_alarm", 11),
        { propertyId: parramatta.id, requirementId: requirement("GENERIC", "electrical").id, kind: "UNKNOWN_LAST_CHECK", nextDueOn: parseCalendarDate(today)! },
      ],
    });
    await db.propertyRequirementExclusion.createMany({
      data: [
        { propertyId: brunswick.id, requirementCode: "gas" },
        { propertyId: parramatta.id, requirementCode: "gas" },
      ],
    });

    console.info(`Seeded ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}) with 3 properties and sample compliance records.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
