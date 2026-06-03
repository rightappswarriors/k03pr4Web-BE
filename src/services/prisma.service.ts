import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/kompra_db?schema=public";
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      this.logger.warn("DATABASE_URL is not set. Prisma is installed but not connected yet.");
      return;
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
