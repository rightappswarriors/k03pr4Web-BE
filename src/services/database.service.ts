import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "kompra_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    max: 10,
  });

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
