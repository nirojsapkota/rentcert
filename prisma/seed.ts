// Development seed: one verified demo user with fictional properties. Never seed real data.
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

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
    console.info(`Seeded ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}) with 3 properties.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
