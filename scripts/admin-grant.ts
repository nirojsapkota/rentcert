// Grants or revokes admin access. Usage: npm run admin:grant -- <email> [--revoke]
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) throw new Error("Usage: npm run admin:grant -- <email> [--revoke]");
  const role = flag === "--revoke" ? "USER" : "ADMIN";
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const { count } = await db.user.updateMany({ where: { email: email.trim().toLowerCase() }, data: { role } });
    if (count === 0) throw new Error(`No user with email ${email}`);
    console.info(`${email} is now ${role}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
