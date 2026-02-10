import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Check your .env file.");
}

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.revenueEvent.createMany({
    data: [
      { amount: 1200 },
      { amount: 3400 },
      { amount: 560 },
      { amount: 890 },
      { amount: 6400 },
    ],
  });

  console.log("Seeded revenue data");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
