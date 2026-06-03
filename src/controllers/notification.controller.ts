import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { parsePositiveId } from "../common/validation";
import { NotificationService } from "../services/notification.service";

@Controller()
export class NotificationController {
  constructor(private readonly notificationsService: NotificationService) {}

  @Get("notifications")
  notifications(@Query("orgId") orgId?: string) {
    return this.notificationsService.notifications(parsePositiveId(orgId || 0, "orgId"));
  }

  @Post("notifications/mark-all-read")
  markAllRead(@Body() body: { orgId?: number }) {
    return this.notificationsService.markAllRead(parsePositiveId(body.orgId || 0, "orgId"));
  }

  @Delete("notifications/:id")
  deleteNotification(@Param("id") id: string) {
    return this.notificationsService.deleteNotification(parsePositiveId(id));
  }
}
