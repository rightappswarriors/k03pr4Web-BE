import "dotenv/config";
import { defineConfig } from "prisma/config";
//const DBURL =  process.env.DATABASE_URL
//if (!DBURL) {
//  throw new Error("MISSING DB URL")
//}
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/kompra_db?schema=public",
  },
});
