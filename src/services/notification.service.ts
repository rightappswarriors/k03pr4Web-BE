import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "./database.service";

@Injectable()
export class NotificationService {
  constructor(private readonly db: DatabaseService) {}

  async notifications(orgId: number) {
    if (!orgId) throw new BadRequestException({ error: "orgId is required" });
    return (await this.db.query(
      `SELECT id, title, message, type, "isRead" AS isread, "createdAt" AS createdat
       FROM "Notification"
       WHERE "orgId"=$1
       ORDER BY "createdAt" DESC`,
      [orgId]
    )).rows;
  }

  async markAllRead(orgId: number) {
    if (!orgId) throw new BadRequestException({ error: "orgId is required" });
    await this.db.query(`UPDATE "Notification" SET "isRead"=true WHERE "orgId"=$1 AND "isRead"=false`, [orgId]);
    return { message: "All notifications marked as read" };
  }

  async deleteNotification(id: number) {
    await this.db.query(`DELETE FROM "Notification" WHERE id=$1`, [id]);
    return { message: "Deleted successfully" };
  }
}
