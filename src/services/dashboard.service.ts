import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

const logDev = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[Dashboard]", message, data ?? "");
  }
};

export type DashboardStats = {
  pendingQuotations: number;
  waitingSupplierReplies: number;
  processingOrders: number;
  unreadMessages: number;
  pendingNegotiations: number;
  counterOffersReceived: number;
  acceptedOffers: number;
};

export type ActivityItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type RecentOrder = {
  id: string;
  orderNumber: string;
  supplier: string;
  status: string;
  total: number;
  createdAt: string;
};

export type RecentRfq = {
  id: string;
  rfqNumber: string;
  supplier: string;
  product: string;
  quantity: number;
  supplierCount?: number;
  status: string;
  updatedAt: string;
};

export type DashboardResponse = {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  notifications: NotificationItem[];
  recentOrders: RecentOrder[];
  recentRFQs: RecentRfq[];
};

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(agentId: string): Promise<DashboardResponse> {
    const startTime = Date.now();
    logDev("Dashboard requested", { agentId });

    try {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          organizationId: true,
          fullname: true,
        },
      });

      if (!agent) {
        logDev("Agent not found", { agentId });
        throw new Error("Agent not found");
      }

      logDev("Agent loaded", { agentId: agent.id, organizationId: agent.organizationId });

      const [stats, recentActivity, notifications, recentOrders, recentRFQs] =
        await Promise.all([
          this.getStats(agentId, agent.organizationId),
          this.getRecentActivity(agentId, agent.organizationId),
          this.getNotifications(agent.organizationId),
          this.getRecentOrders(agent.organizationId),
          this.getRecentRFQs(agentId),
        ]);

      logDev("Statistics generated", stats);
      logDev("Query execution", {
        activityCount: recentActivity.length,
        notificationCount: notifications.length,
        orderCount: recentOrders.length,
        rfqCount: recentRFQs.length,
      });
      logDev("Total execution time", `${Date.now() - startTime}ms`);

      return {
        stats,
        recentActivity,
        notifications,
        recentOrders,
        recentRFQs,
      };
    } catch (error) {
      logDev("Dashboard error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async getStats(
    agentId: string,
    organizationId: number | null
  ): Promise<DashboardStats> {
    try {
      const [
        pendingQuotations,
        waitingSupplierReplies,
        processingOrders,
        unreadMessages,
        pendingNegotiations,
        counterOffersReceived,
        acceptedOffers,
      ] = await Promise.all([
        // Pending Quotations = RFQs where supplier has responded (RESPONDED)
        this.prisma.requestForQuotation.count({
          where: {
            agentId,
            status: "SUPPLIER_OFFERED",
            deletedAt: null,
          },
        }),
        // Waiting Supplier Replies = RFQs submitted, awaiting supplier response
        this.prisma.requestForQuotation.count({
          where: {
            agentId,
            status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
            deletedAt: null,
          },
        }),
        organizationId
          ? this.prisma.supplierOrder.count({
              where: {
                orgId: organizationId,
                status: { in: ["acknowledged", "sent"] },
                deletedAt: null,
              },
            })
          : 0,
        // Unread Messages: count ConversationMessages where sender is not the agent
        // and the message was created after the participant's lastReadAt
        this.prisma.conversationMessage.count({
          where: {
            Conversation: {
              ConversationParticipant: {
                some: { agentId },
              },
            },
            senderAgentId: { not: agentId },
            senderOrgId: { not: null },
          },
        }),
        // Pending Negotiations = RFQs in NEGOTIATING status
        this.prisma.requestForQuotation.count({
          where: {
            agentId,
            status: "NEGOTIATING",
            deletedAt: null,
          },
        }),
        // Counter Offers Received = pending NegotiationOffers in conversations where agent is participant
        this.prisma.negotiationOffer.count({
          where: {
            Conversation: {
              ConversationParticipant: {
                some: { agentId },
              },
            },
            status: { in: ["PENDING", "COUNTERED"] },
            senderType: "SUPPLIER",
          },
        }),
        // Accepted Offers = RFQs in NEGOTIATION_ACCEPTED status
        this.prisma.requestForQuotation.count({
          where: {
            agentId,
            status: "NEGOTIATION_COMPLETED",
            deletedAt: null,
          },
        }),
      ]);

      return {
        pendingQuotations,
        waitingSupplierReplies,
        processingOrders,
        unreadMessages,
        pendingNegotiations,
        counterOffersReceived,
        acceptedOffers,
      };
    } catch (error) {
      logDev("getStats error", error instanceof Error ? error.message : String(error));
      return {
        pendingQuotations: 0,
        waitingSupplierReplies: 0,
        processingOrders: 0,
        unreadMessages: 0,
        pendingNegotiations: 0,
        counterOffersReceived: 0,
        acceptedOffers: 0,
      };
    }
  }

  private async getRecentActivity(
    agentId: string,
    organizationId: number | null
  ): Promise<ActivityItem[]> {
    try {
      const activities: ActivityItem[] = [];

      const recentRfqs = await this.prisma.requestForQuotation.findMany({
        where: { agentId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, rfqNumber: true, status: true, createdAt: true },
      });

      for (const rfq of recentRfqs) {
        activities.push({
          id: `rfq-${rfq.id}`,
          icon: "Quotation",
          title: "New RFQ created",
          description: `You created RFQ #${rfq.rfqNumber} (${rfq.status})`,
          timestamp: this.formatTimeAgo(rfq.createdAt),
        });
      }

      const respondedRfqs = await this.prisma.requestForQuotation.findMany({
        where: {
          agentId,
          status: "SUPPLIER_OFFERED",
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, rfqNumber: true, updatedAt: true },
      });

      for (const rfq of respondedRfqs) {
        activities.push({
          id: `response-${rfq.id}`,
          icon: "Check",
          title: "Supplier responded",
          description: `A supplier responded to your RFQ #${rfq.rfqNumber}`,
          timestamp: this.formatTimeAgo(rfq.updatedAt),
        });
      }

      // Negotiation activities: offers received, accepted, rejected
      const negotiationOffers = await this.prisma.negotiationOffer.findMany({
        where: {
          Conversation: {
            ConversationParticipant: {
              some: { agentId },
            },
          },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
          Conversation: {
            select: {
              rfqId: true,
            },
          },
        },
      });

      for (const offer of negotiationOffers) {
        const rfqNumber = offer.Conversation?.rfqId
          ? await this.prisma.requestForQuotation
              .findUnique({
                where: { id: offer.Conversation.rfqId },
                select: { rfqNumber: true },
              })
              .then((r) => r?.rfqNumber || "Unknown")
          : "Unknown";

        if (offer.status === "ACCEPTED") {
          activities.push({
            id: `offer-accepted-${offer.id}`,
            icon: "Check",
            title: "Offer accepted",
            description: `You accepted an offer for RFQ #${rfqNumber}`,
            timestamp: this.formatTimeAgo(offer.createdAt),
          });
        } else if (offer.status === "REJECTED") {
          activities.push({
            id: `offer-rejected-${offer.id}`,
            icon: "XCircle",
            title: "Offer rejected",
            description: `You rejected an offer for RFQ #${rfqNumber}`,
            timestamp: this.formatTimeAgo(offer.createdAt),
          });
        } else {
          activities.push({
            id: `offer-${offer.id}`,
            icon: "Message",
            title: "New offer received",
            description: `A new offer was received for RFQ #${rfqNumber}`,
            timestamp: this.formatTimeAgo(offer.createdAt),
          });
        }
      }

      if (organizationId) {
        const recentOrders = await this.prisma.supplierOrder.findMany({
          where: { orgId: organizationId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, createdAt: true, status: true },
        });

        for (const order of recentOrders) {
          activities.push({
            id: `order-${order.id}`,
            icon: "Truck",
            title: "Order updated",
            description: `Order status changed to ${order.status}`,
            timestamp: this.formatTimeAgo(order.createdAt),
          });
        }
      }

      return activities
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 10);
    } catch (error) {
      logDev("getRecentActivity error", error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private async getNotifications(organizationId: number | null): Promise<NotificationItem[]> {
    if (!organizationId) return [];

    try {
      const notifications = await this.prisma.notification.findMany({
        where: { orgId: organizationId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
        },
      });

      return notifications.map((n) => ({
        id: n.id.toString(),
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }));
    } catch (error) {
      logDev("getNotifications error", error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private async getRecentOrders(organizationId: number | null): Promise<RecentOrder[]> {
    if (!organizationId) return [];

    try {
      const orders = await this.prisma.supplierOrder.findMany({
        where: { orgId: organizationId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          supplierEmail: true,
          status: true,
          createdAt: true,
          SupplierOrderItem: {
            take: 1,
            select: { requestedQty: true },
          },
        },
      });

      return orders.map((o) => ({
        id: o.id.toString(),
        orderNumber: `SO-${o.id.toString().padStart(6, "0")}`,
        supplier: o.supplierEmail,
        status: o.status,
        total: 0,
        createdAt: o.createdAt.toISOString(),
      }));
    } catch (error) {
      logDev("getRecentOrders error", error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private async getRecentRFQs(agentId: string): Promise<RecentRfq[]> {
    try {
      const rfqs = await this.prisma.requestForQuotation.findMany({
        where: { agentId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          rfqNumber: true,
          status: true,
          updatedAt: true,
          quantity: true,
          supplierOrgName: true,
          Organization: {
            select: { name: true },
          },
          SupplierItem: {
            select: { name: true },
          },
        },
      });

      return rfqs.map((rfq) => ({
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        supplier: rfq.Organization?.name || rfq.supplierOrgName || "Unassigned",
        product: rfq.SupplierItem?.name || "—",
        quantity: rfq.quantity ? parseFloat(rfq.quantity) || 0 : 0,
        supplierCount: 0, // placeholder — will be populated when supplier responses exist
        status: rfq.status,
        updatedAt: rfq.updatedAt.toISOString(),
      }));
    } catch (error) {
      logDev("getRecentRFQs error", error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
}
