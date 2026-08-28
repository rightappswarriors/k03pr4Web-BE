// k03pr4web-be/services/conversation.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { NotificationService } from "./notification.service";
import { logDevCtx } from "../lib/logDev";
import { RealtimeGateway } from "../gateway/realtime.gateway";

// ============================================
// DTOs
// ============================================

export type ConversationParticipant = {
  id: string;
  conversationId: string;
  agentId?: string | null;
  organizationId?: number | null;
  role: "AGENT" | "SUPPLIER";
  joinedAt: Date;
  lastReadAt?: Date | null;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "AGENT" | "SUPPLIER";
  // Portal-compatible fields — the supplier UI checks these to identify sender direction
  senderAgentId?: string | null;
  senderOrgId?: number | null;
  message: string;
  type: string;
  rfqOfferId?: string | null;
  metadata?: Record<string, any> | null;
  attachments: string[];
  createdAt: Date;
  clientMessageId?: string | null;
};

export type ConversationRfqOffer = {
  id: string;
  rfqId: string;
  senderType: "AGENT" | "SUPPLIER";
  senderName: string;
  offerType: string;
  unitPrice: number;
  quantity: number;
  estimatedLeadDays?: number | null;
  validUntil?: Date | null;
  notes?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NegotiationOffer = {
  id: string;
  conversationId: string;
  senderType: "AGENT" | "SUPPLIER";
  senderName: string;
  quantity: number;
  unitPrice: number;
  deliveryDate?: Date | null;
  notes?: string | null;
  status: "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED";
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationSupplier = {
  id: string;
  name: string;
  verified: boolean;
  location?: string | null;
  profilePhoto?: string | null;
  rating?: number | null;
};

export type ConversationRfq = {
  id: string;
  rfqNumber: string;
  status: string;
  targetUnitPrice?: number | null;
  quantity?: number | null;
  expectedDeliveryDate?: Date | null;
  notes?: string | null;
  acceptedPrice?: number | null;
  acceptedQuantity?: number | null;
  acceptedDeliveryDate?: Date | null;
  validityDays?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationProduct = {
  id: string;
  name: string;
  sku?: string | null;
  image?: string | null;
  unit?: string | null;
  moq?: number | null;
  availableQty?: number | null;
  leadTime?: string | null;
  priceTiers?: Array<{
    minQty: number;
    maxQty?: number | null;
    unitPrice: number;
    currency: string;
  }>;
};

export type ConversationDetail = {
  id: string;
  rfqId?: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  rfq: ConversationRfq | null;
  supplier: ConversationSupplier | null;
  product: ConversationProduct | null;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
  offers: NegotiationOffer[];
  rfqOffers: ConversationRfqOffer[];
};

export type ConversationListItem = {
  id: string;
  rfqId?: string | null;
  rfqNumber?: string | null;
  supplier: ConversationSupplier | null;
  product: ConversationProduct | null;
  latestMessage: ConversationMessage | null;
  unreadCount: number;
  rfqStatus: string;
  updatedAt: Date;
  createdAt: Date;
};

export type SendMessageDto = {
  message: string;
  attachments?: string[];
  clientMessageId?: string;
};

export type SendOfferDto = {
  quantity: number;
  unitPrice: number;
  deliveryDate?: string;
  notes?: string;
};

export type AcceptOfferDto = {
  offerId?: string;
};

export type RejectOfferDto = {
  reason?: string;
};

// ============================================
// Price breakdown helper
// ============================================

// Same math, same shape as rfqNegotiation.service.ts's computePriceBreakdown
// — kept local to this file since the two services aren't currently sharing
// a util module, but the calculation itself must stay identical: never
// hardcoded, never applied twice, always derived from the product's own
// isVatExempt/vatRate.
function computePriceBreakdown(
  unitPrice: number,
  quantity: number,
  supplierItem: { isVatExempt?: boolean | null; vatRate?: number | null } | null | undefined,
) {
  const isVatExempt = supplierItem?.isVatExempt ?? false;
  const vatRate = supplierItem?.vatRate ?? 0.12;
  const subtotal = unitPrice * quantity;
  const vatAmount = isVatExempt ? 0 : subtotal * vatRate;
  const total = subtotal + vatAmount;
  return { subtotal, vatAmount, vatRate, isVatExempt, total };
}

// ============================================
// Service
// ============================================

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notificationService: NotificationService,
  ) { }

  // ============================================
  // List all conversations for an agent
  // ============================================

  async listConversations(agentId: string): Promise<ConversationListItem[]> {
    logDevCtx("Conversation", "Listing conversations", { agentId });

    // Find all conversations where the agent is a participant
    const conversations = await this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        ConversationParticipant: {          // was: conversationParticipant
          some: { agentId },
        },
      },
      include: {
        RequestForQuotation: {
          include: {
            SupplierItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                image: true,
                unit: true,
                moq: true,
                availableQty: true,
                leadTime: true,
                PriceTier: {
                  where: { deletedAt: null },
                  orderBy: { minQty: "asc" },
                  select: { minQty: true, maxQty: true, price: true, currency: true },
                },
                SupplierCatalog: {           // was: supplierCatalog
                  select: { organizationId: true },
                },
              },
            },
            Organization: {                  // was: organization
              select: {
                id: true,
                name: true,
                verificationStatus: true,
                profilePhoto: true,
                location: true,
              },
            },
          },
        },
        ConversationParticipant: {           // was: conversationParticipant
          where: { agentId },
        },
        ConversationMessage: {               // was: conversationMessage
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            Agent: { select: { id: true, fullname: true } },   // was: agent
            Organization: { select: { id: true, name: true } }, // was: organization
          },
        },
        NegotiationOffer: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    logDevCtx("Conversation", "Found conversations", { count: conversations.length });

    const results: ConversationListItem[] = [];

    for (const conv of conversations) {
      const rfq = conv.RequestForQuotation;

      // Determine supplier from RFQ
      let supplier: ConversationSupplier | null = null;
      let product: ConversationProduct | null = null;

      if (rfq) {
        // Supplier info from Organization or SupplierItem's SupplierCatalog
        const org = rfq.Organization;
        const supplierItem = rfq.SupplierItem;
        const supplierOrgId = supplierItem?.SupplierCatalog?.organizationId;
        const supplierOrg = org || (supplierOrgId
          ? await this.prisma.organization.findUnique({
            where: { id: supplierOrgId },
            select: {
              id: true,
              name: true,
              verificationStatus: true,
              profilePhoto: true,
              location: true,
            },
          })
          : null);

        if (supplierOrg) {
          supplier = {
            id: String(supplierOrg.id),
            name: supplierOrg.name,
            verified: supplierOrg.verificationStatus === "VERIFIED",
            location: supplierOrg.location,
            profilePhoto: supplierOrg.profilePhoto,
          };
        }

        // Product info from SupplierItem
        if (supplierItem) {
          product = {
            id: supplierItem.id,
            name: supplierItem.name,
            sku: supplierItem.sku,
            image: supplierItem.image,
            unit: supplierItem.unit,
            moq: supplierItem.moq,
            availableQty: supplierItem.availableQty,
            leadTime: supplierItem.leadTime,
            priceTiers: supplierItem.PriceTier.map((t: any) => ({
              minQty: t.minQty,
              maxQty: t.maxQty,
              unitPrice: t.price,
              currency: t.currency,
            })),
          };
        }
      }

      // Latest message
      const latestMsg = conv.ConversationMessage[0];
      const latestMessage: ConversationMessage | null = latestMsg
        ? {
          id: latestMsg.id,
          conversationId: latestMsg.conversationId,
          senderId: String(latestMsg.senderAgentId || latestMsg.senderOrgId || ""),
          senderName:
            latestMsg.Agent?.fullname || latestMsg.Organization?.name || "Unknown",
          senderRole: latestMsg.senderAgentId ? "AGENT" : "SUPPLIER",
          message: latestMsg.message,
          type: latestMsg.type || "TEXT",
          rfqOfferId: latestMsg.rfqOfferId,
          metadata: (latestMsg as any).metadata ?? null,
          attachments: latestMsg.attachments ?? [],
          createdAt: latestMsg.createdAt,
        }
        : null;

      // Unread count: messages after lastReadAt
      const participant = conv.ConversationParticipant[0];
      const lastReadAt = participant?.lastReadAt;

      let unreadCount = 0;
      if (latestMessage) {
        const unread = await this.prisma.conversationMessage.count({
          where: {
            conversationId: conv.id,
            ...(lastReadAt
              ? { createdAt: { gt: lastReadAt } }
              : { senderAgentId: { not: agentId } }),
          },
        });
        unreadCount = unread;
      }

      results.push({
        id: conv.id,
        rfqId: rfq?.id,
        rfqNumber: rfq?.rfqNumber,
        supplier,
        product,
        latestMessage,
        unreadCount,
        rfqStatus: rfq?.status || "UNKNOWN",
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      });
    }

    return results;
  }

  // ============================================
  // Get a single conversation with full detail
  // ============================================

  async getConversation(
    conversationId: string,
    agentId: string,
    orgId?: number | null,
  ): Promise<ConversationDetail> {
    logDevCtx("Conversation", "Loading", { conversationId, agentId });

    // Verify the agent is a participant (ownership check)
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        agentId,
      },
    });

    if (!participant) {
      throw new ForbiddenException({
        error: "You do not have access to this conversation.",
      });
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId, deletedAt: null },
      include: {
        RequestForQuotation: {
          include: {
            SupplierItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                image: true,
                unit: true,
                moq: true,
                availableQty: true,
                leadTime: true,
                isVatExempt: true,
                vatRate: true,
                PriceTier: {
                  where: { deletedAt: null },
                  orderBy: { minQty: "asc" },
                  select: { minQty: true, maxQty: true, price: true, currency: true },
                },
                SupplierCatalog: {
                  select: {
                    organizationId: true,
                  },
                },
              },
            },
            Organization: {
              select: {
                id: true,
                name: true,
                verificationStatus: true,
                profilePhoto: true,
                location: true,
              },
            },
            Agent: { select: { id: true, fullname: true, email: true } },
          },
        },
        ConversationParticipant: true,
        ConversationMessage: {
          orderBy: { createdAt: "asc" },
          include: {
            Agent: { select: { id: true, fullname: true, email: true } },
            Organization: { select: { id: true, name: true } },
          },
        },
        NegotiationOffer: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException({ error: "Conversation not found" });
    }

    const rfq = conv.RequestForQuotation;

    // Resolve supplier
    let supplier: ConversationSupplier | null = null;
    let product: ConversationProduct | null = null;

    if (rfq) {
      const org = rfq.Organization;
      const supplierItem = rfq.SupplierItem;
      const supplierOrgId = supplierItem?.SupplierCatalog?.organizationId;

      let supplierOrg = org;
      if (!supplierOrg && supplierOrgId) {
        supplierOrg = await this.prisma.organization.findUnique({
          where: { id: supplierOrgId },
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            profilePhoto: true,
            location: true,
          },
        });
      }

      if (supplierOrg) {
        supplier = {
          id: String(supplierOrg.id),
          name: supplierOrg.name,
          verified: supplierOrg.verificationStatus === "VERIFIED",
          location: supplierOrg.location,
          profilePhoto: supplierOrg.profilePhoto,
        };
      }

      if (supplierItem) {
        product = {
          id: supplierItem.id,
          name: supplierItem.name,
          sku: supplierItem.sku,
          image: supplierItem.image,
          unit: supplierItem.unit,
          moq: supplierItem.moq,
          availableQty: supplierItem.availableQty,
          leadTime: supplierItem.leadTime,
          priceTiers: supplierItem.PriceTier.map((t: any) => ({
            minQty: t.minQty,
            maxQty: t.maxQty,
            unitPrice: t.price,
            currency: t.currency,
          })),
        };
      }
    }

    // Map messages
    const messages: ConversationMessage[] = conv.ConversationMessage.map((msg) => {
      const senderId = msg.senderAgentId || msg.senderOrgId;
      const senderName = msg.Agent?.fullname || msg.Organization?.name || "Unknown";
      const senderRole = msg.senderAgentId ? "AGENT" : "SUPPLIER";
      return {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: String(senderId),
        senderName,
        senderRole,
        message: msg.message,
        type: msg.type || "TEXT",
        rfqOfferId: msg.rfqOfferId,
        metadata: (msg as any).metadata ?? null,
        attachments: msg.attachments ?? [],
        createdAt: msg.createdAt,
      };
    });

    // Map offers
    const offers: NegotiationOffer[] = conv.NegotiationOffer.map((offer) => {
      let senderName = "Unknown";
      if (offer.senderType === "AGENT") {
        senderName = "Agent";
      } else if (offer.senderOrgId) {
        senderName = "Supplier";
      }
      return {
        id: offer.id,
        conversationId: offer.conversationId,
        senderType: offer.senderType,
        senderName,
        quantity: offer.quantity,
        unitPrice: offer.unitPrice,
        deliveryDate: offer.deliveryDate,
        notes: offer.notes,
        status: offer.status,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      };
    });

    // Map participants
    const participants: ConversationParticipant[] = conv.ConversationParticipant.map(
      (p) => ({
        id: p.id,
        conversationId: p.conversationId,
        agentId: p.agentId,
        organizationId: p.organizationId,
        role: p.role,
        joinedAt: p.joinedAt,
        lastReadAt: p.lastReadAt,
      }),
    );

    // Map RFQ
    const rfqDetail: ConversationRfq | null = rfq
      ? {
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        status: rfq.status,
        targetUnitPrice: rfq.targetUnitPrice,
        quantity: rfq.quantity ? parseFloat(rfq.quantity) : null,
        expectedDeliveryDate: rfq.expectedDeliveryDate,
        notes: rfq.notes,
        acceptedPrice: rfq.acceptedPrice,
        acceptedQuantity: rfq.acceptedQuantity,
        acceptedDeliveryDate: rfq.acceptedDeliveryDate,
        validityDays: rfq.validityDays,
        createdAt: rfq.createdAt,
        updatedAt: rfq.updatedAt,
      }
      : null;

    // Fetch RfqOffer records separately (they relate to the RFQ, not directly to Conversation)
    const rfqOfferRecords = rfq?.id
      ? await this.prisma.rfqOffer.findMany({
          where: { rfqId: rfq.id },
          orderBy: { createdAt: "asc" },
          include: {
            Agent: { select: { id: true, fullname: true } },
            Organization: { select: { id: true, name: true } },
          },
        })
      : [];

    const rfqOffers: ConversationRfqOffer[] = rfqOfferRecords.map((offer: any) => {
      const isAgent =
        offer.senderAgentId !== null && offer.senderAgentId !== undefined;
      return {
        id: offer.id,
        rfqId: offer.rfqId,
        senderType: isAgent ? "AGENT" : "SUPPLIER",
        senderName: isAgent
          ? offer.Agent?.fullname || "Agent"
          : offer.Organization?.name || "Supplier",
        offerType: offer.offerType,
        unitPrice: offer.unitPrice,
        quantity: offer.quantity,
        estimatedLeadDays: offer.estimatedLeadDays,
        validUntil: offer.validUntil,
        notes: offer.notes,
        status: offer.status,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      };
    });

    const payload = {
      id: conv.id,
      rfqId: rfq?.id,
      type: conv.type,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      rfq: rfqDetail,
      supplier,
      product,
      participants,
      messages,
      offers,
      rfqOffers,
    };

    // Mark all notifications for this conversation as read for this agent (best-effort)
    void this.notificationService.markConversationNotificationsRead(conversationId, agentId, orgId).catch(() => {});

    return payload;
  }

  // ============================================
  // Send a message in a conversation
  // ============================================

  async sendMessage(
    conversationId: string,
    agentId: string,
    data: SendMessageDto,
  ): Promise<ConversationMessage> {
    logDevCtx("Conversation", "Sending message", { conversationId, agentId });

    // Ownership check
    await this.verifyAgentAccess(conversationId, agentId);

    // ── Minimal transaction: only message creation + timestamp update ──
    // No includes, no RFQ lookup, no notification inside the transaction.
    const msg = await this.prisma.$transaction(async (tx) => {
      const created = await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          senderAgentId: agentId,
          message: data.message,
          attachments: data.attachments ?? [],
          clientMessageId: data.clientMessageId,
        },
        select: {
          id: true,
          conversationId: true,
          senderAgentId: true,
          message: true,
          type: true,
          attachments: true,
          createdAt: true,
          clientMessageId: true,
          metadata: true,
          rfqOfferId: true,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    logDevCtx("Message", "Sent", { messageId: msg.id });

    // ── Outside transaction: resolve RFQ + supplier org + agent identity ──
    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { conversationId },
      select: { id: true, supplierOrgId: true, rfqNumber: true, supplierOrgName: true },
    });

    // Best-effort notification — must not block or roll back the message
    if (rfq?.supplierOrgId) {
      void this.prisma.notification.create({
        data: {
          orgId: rfq.supplierOrgId,
          title: "New Message",
          message: `You have a new message regarding RFQ #${rfq.rfqNumber}.`,
          type: "NEW_TRANSACTION",
          conversationId,
          isRead: false,
        },
      });
    }

    // ── Resolve agent name for the canonical payload ──
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { fullname: true },
    });

    // ── Canonical realtime payload — includes both naming conventions ──
    const payload: ConversationMessage = {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderAgentId || "",
      senderName: agent?.fullname ?? "Unknown",
      senderRole: "AGENT",
      senderAgentId: msg.senderAgentId,
      senderOrgId: null,
      message: msg.message,
      type: msg.type || "TEXT",
      rfqOfferId: msg.rfqOfferId,
      metadata: (msg as any).metadata ?? null,
      attachments: msg.attachments ?? [],
      createdAt: msg.createdAt as unknown as Date,
      clientMessageId: msg.clientMessageId,
    };

    // conversation:newMessage → conversation room (both frontends join this)
    this.realtime.emitToConversation(conversationId, "conversation:newMessage", payload);

    // notification:new → supplier org room (suppliers auto-join org room on connect)
    if (rfq?.supplierOrgId) {
      this.realtime.emitToOrganization(rfq.supplierOrgId, "notification:new", {
        title: "New Message",
        message: `You have a new message regarding RFQ #${rfq.rfqNumber}.`,
        rfqId: rfq.id,
        conversationId,
      });
    }
    return payload;
  }

  // ============================================
  // Send an offer (counter-offer) in a conversation
  // ============================================

  async sendOffer(
    conversationId: string,
    agentId: string,
    data: SendOfferDto,
  ): Promise<NegotiationOffer> {
    logDevCtx("Offer", "Sending offer", { conversationId, agentId, data });

    // Ownership check
    await this.verifyAgentAccess(conversationId, agentId);

    // Verify the RFQ is in a negotiable state
    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { conversationId, deletedAt: null },
    });

    if (!rfq) {
      throw new NotFoundException({ error: "RFQ not found for this conversation" });
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      // Create the offer
      const newOffer = await tx.negotiationOffer.create({
        data: {
          id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          senderType: "AGENT",
          senderAgentId: agentId,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
          notes: data.notes,
          status: "PENDING",
        },
      });

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Update RFQ status to NEGOTIATING
      await tx.requestForQuotation.update({
        where: { id: rfq.id },
        data: { status: "NEGOTIATING" },
      });

      // Create notification for the supplier
      if (rfq.supplierOrgId) {
        await tx.notification.create({
          data: {
            orgId: rfq.supplierOrgId,
            title: "New Offer",
            message: `A new offer was sent for RFQ #${rfq.rfqNumber}.`,
            type: "NEW_TRANSACTION",
            conversationId,
          },
        });
      }

      return newOffer;
    });

    logDevCtx("Offer", "Created", { offerId: offer.id });

    const payload = {
      id: offer.id,
      conversationId: offer.conversationId,
      senderType: offer.senderType,
      senderName: "Agent",
      quantity: offer.quantity,
      unitPrice: offer.unitPrice,
      deliveryDate: offer.deliveryDate,
      notes: offer.notes,
      status: offer.status,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
    this.realtime.emitToConversation(conversationId, "offer:counter", payload);
    // Also notify the other party via their org room
    const rfqForNotif = await this.prisma.requestForQuotation.findFirst({ where: { conversationId }, select: { id: true, supplierOrgId: true, rfqNumber: true } });
    if (rfqForNotif?.supplierOrgId) {
      this.realtime.emitToOrganization(rfqForNotif.supplierOrgId, "notification:new", {
        title: "New Counter Offer",
        message: `The buyer sent a counter offer for RFQ #${rfqForNotif.rfqNumber}.`,
        rfqId: rfqForNotif.id,
        conversationId,
      });
    }
    return payload;
  }

  // ============================================
  // Accept an offer (or the latest offer)
  // ============================================

  async acceptOffer(
    conversationId: string,
    agentId: string,
    data?: AcceptOfferDto,
  ): Promise<{ success: boolean; message: string }> {
    logDevCtx("Offer", "Accepting offer", { conversationId, agentId, data });

    // Ownership check
    await this.verifyAgentAccess(conversationId, agentId);

    // Find the offer to accept
    let offer;
    if (data?.offerId) {
      offer = await this.prisma.negotiationOffer.findFirst({
        where: { id: data.offerId, conversationId },
      });
    } else {
      // Accept the latest PENDING offer
      offer = await this.prisma.negotiationOffer.findFirst({
        where: { conversationId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!offer) {
      throw new NotFoundException({ error: "No pending offer found to accept" });
    }

    // FIX: fetch the RFQ WITH its SupplierItem so the real per-product VAT
    // fields (isVatExempt/vatRate) are available for the breakdown below —
    // the previous version fetched the RFQ without this include and never
    // computed subtotal/vatAmount/total at all.
    const rfqWithItem = await this.prisma.requestForQuotation.findFirst({
      where: { conversationId, deletedAt: null },
      include: { SupplierItem: { select: { isVatExempt: true, vatRate: true } } },
    });
    const breakdown = computePriceBreakdown(offer.unitPrice, offer.quantity, rfqWithItem?.SupplierItem);

    await this.prisma.$transaction(async (tx) => {
      // Mark the offer as ACCEPTED
      await tx.negotiationOffer.update({
        where: { id: offer.id },
        data: { status: "ACCEPTED" },
      });

      // Update RFQ with accepted values and status
      const rfq = await tx.requestForQuotation.findFirst({
        where: { conversationId, deletedAt: null },
      });

      if (rfq) {
        await tx.requestForQuotation.update({
          where: { id: rfq.id },
          data: {
            status: "AGENT_ACCEPTED_FINAL",
            acceptedPrice: offer.unitPrice,
            acceptedQuantity: offer.quantity,
            acceptedDeliveryDate: offer.deliveryDate,
            agentAcceptedAt: new Date(),
          },
        });
      }

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // FIX: type was "SYSTEM" — ConversationEventCard's dispatcher has no
      // case for "SYSTEM" acceptance events, so this always fell through to
      // a generic SystemEventCard/plain rendering instead of the dedicated
      // OfferAcceptedCard. Changed to "OFFER_ACCEPTED" (the type
      // ConversationEventCard actually switches on), and metadata now
      // carries the full computed breakdown instead of nothing.
      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          senderAgentId: agentId,
          message: "Agent accepted supplier offer. Awaiting supplier confirmation.",
          type: "OFFER_ACCEPTED",
          metadata: {
            event: "offer_accepted",
            offerId: offer.id,
            unitPrice: offer.unitPrice,
            quantity: offer.quantity,
            deliveryDate: offer.deliveryDate ?? null,
            ...breakdown,
          },
        },
      });

      // Create notification for the supplier
      if (rfq?.supplierOrgId) {
        await tx.notification.create({
          data: {
            orgId: rfq.supplierOrgId,
            title: "Buyer accepted your offer",
            message: `Buyer accepted your offer for RFQ #${rfq.rfqNumber}. Waiting for your confirmation.`,
            type: "NEGOTIATION_ACCEPTED",
            conversationId,
          },
        });
      }
    });

    logDevCtx("Offer", "Accepted", { offerId: offer.id, rfqId: offer.conversationId });
    this.realtime.emitToConversation(conversationId, "offer:accepted", { conversationId, offerId: offer.id });

    // Resolve agent name for the canonical payload (outside transaction)
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId }, select: { fullname: true } });

    this.realtime.emitToConversation(conversationId, "conversation:newMessage", {
      conversationId,
      senderId: agentId,
      senderName: agent?.fullname ?? "Unknown",
      senderRole: "AGENT",
      senderAgentId: agentId,
      senderOrgId: null,
      message: "Agent accepted supplier offer. Awaiting supplier confirmation.",
      type: "OFFER_ACCEPTED",
      metadata: {
        event: "offer_accepted",
        offerId: offer.id,
        unitPrice: offer.unitPrice,
        quantity: offer.quantity,
        deliveryDate: offer.deliveryDate ?? null,
        ...breakdown,
      },
    });
    // Notify the supplier org
    const rfqForNotif = await this.prisma.requestForQuotation.findFirst({
      where: { conversationId },
      select: { id: true, supplierOrgId: true, rfqNumber: true },
    });
    if (rfqForNotif?.supplierOrgId) {
      this.realtime.emitToOrganization(rfqForNotif.supplierOrgId, "notification:new", {
        title: "Buyer accepted your offer",
        message: `Buyer accepted your offer for RFQ #${rfqForNotif.rfqNumber}. Waiting for your confirmation.`,
        rfqId: rfqForNotif.id,
        conversationId,
      });
    }

    return {
      success: true,
      message: "Offer accepted. Waiting for supplier confirmation.",
    };
  }

  // ============================================
  // Reject an offer (or the latest offer)
  // ============================================

  async rejectOffer(
    conversationId: string,
    agentId: string,
    data?: RejectOfferDto,
  ): Promise<{ success: boolean; message: string }> {
    logDevCtx("Offer", "Rejecting offer", { conversationId, agentId, data });

    // Ownership check
    await this.verifyAgentAccess(conversationId, agentId);

    // Find the latest PENDING offer
    const offer = await this.prisma.negotiationOffer.findFirst({
      where: { conversationId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!offer) {
      throw new NotFoundException({ error: "No pending offer found to reject" });
    }

    // FIX: same as acceptOffer — pull the SupplierItem's VAT fields so the
    // rejected offer's breakdown can be shown for context.
    const rfqWithItem = await this.prisma.requestForQuotation.findFirst({
      where: { conversationId, deletedAt: null },
      include: { SupplierItem: { select: { isVatExempt: true, vatRate: true } } },
    });
    const breakdown = computePriceBreakdown(offer.unitPrice, offer.quantity, rfqWithItem?.SupplierItem);
    const reason = data?.reason || "Offer rejected by the other party.";

    await this.prisma.$transaction(async (tx) => {
      // Mark the offer as REJECTED
      await tx.negotiationOffer.update({
        where: { id: offer.id },
        data: { status: "REJECTED" },
      });

      // Update RFQ status
      const rfq = await tx.requestForQuotation.findFirst({
        where: { conversationId, deletedAt: null },
      });

      if (rfq) {
        await tx.requestForQuotation.update({
          where: { id: rfq.id },
          data: { status: "CANCELLED" },
        });
      }

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // FIX: previously no conversationMessage was created at all for a
      // rejection — there was never any timeline entry, card or otherwise.
      // Now creates an OFFER_REJECTED message with the same metadata shape
      // OfferRejectedCard/ConversationEventCard already expect.
      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          senderAgentId: agentId,
          message: reason,
          type: "OFFER_REJECTED",
          metadata: {
            event: "offer_rejected",
            offerId: offer.id,
            reason,
            unitPrice: offer.unitPrice,
            quantity: offer.quantity,
            ...breakdown,
          },
        },
      });

      // Create notification for the supplier
      if (rfq?.supplierOrgId) {
        await tx.notification.create({
          data: {
            orgId: rfq.supplierOrgId,
            title: "Offer Rejected",
            message: `Your offer for RFQ #${rfq.rfqNumber} was declined.${data?.reason ? ` Reason: ${data.reason}` : ""}`,
            type: "NEW_TRANSACTION",
            conversationId,
          },
        });
      }
    });

    logDevCtx("Offer", "Rejected", { offerId: offer.id });
    this.realtime.emitToConversation(conversationId, "offer:rejected", { conversationId, offerId: offer.id, reason: data?.reason });

    // Resolve agent name for the canonical payload (outside transaction)
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId }, select: { fullname: true } });

    this.realtime.emitToConversation(conversationId, "conversation:newMessage", {
      conversationId,
      senderId: agentId,
      senderName: agent?.fullname ?? "Unknown",
      senderRole: "AGENT",
      senderAgentId: agentId,
      senderOrgId: null,
      message: reason,
      type: "OFFER_REJECTED",
      metadata: {
        event: "offer_rejected",
        offerId: offer.id,
        reason,
        unitPrice: offer.unitPrice,
        quantity: offer.quantity,
        ...breakdown,
      },
    });
    // Notify the supplier org
    const rfqForNotif = await this.prisma.requestForQuotation.findFirst({
      where: { conversationId },
      select: { id: true, supplierOrgId: true, rfqNumber: true },
    });
    if (rfqForNotif?.supplierOrgId) {
      this.realtime.emitToOrganization(rfqForNotif.supplierOrgId, "notification:new", {
        title: "Offer Rejected",
        message: `Your offer for RFQ #${rfqForNotif.rfqNumber} was declined.${data?.reason ? ` Reason: ${data.reason}` : ""}`,
        rfqId: rfqForNotif.id,
        conversationId,
      });
    }

    return {
      success: true,
      message: "Offer rejected. RFQ is now in NEGOTIATION_REJECTED status.",
    };
  }

  // ============================================
  // Mark conversation as read
  // ============================================

  async markConversationRead(
    conversationId: string,
    agentId: string,
  ): Promise<{ success: boolean }> {
    logDevCtx("Conversation", "Marking read", { conversationId, agentId });

    // Ownership check
    await this.verifyAgentAccess(conversationId, agentId);

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        agentId,
      },
      data: { lastReadAt: new Date() },
    });
    this.realtime.emitToConversation(conversationId, "conversation:read", { conversationId, userId: agentId, readAt: new Date().toISOString() });

    return { success: true };
  }

  // ============================================
  // Get unread message count across all conversations
  // ============================================

  async getUnreadCount(agentId: string): Promise<number> {
    logDevCtx("Conversation", "Counting unread", { agentId });

    const conversations = await this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        ConversationParticipant: {
          some: { agentId },
        },
      },
      include: {
        ConversationParticipant: {
          where: { agentId },
        },
      },
    });

    let totalUnread = 0;

    for (const conv of conversations) {
      const participant = conv.ConversationParticipant[0];
      const lastReadAt = participant?.lastReadAt;

      const unread = await this.prisma.conversationMessage.count({
        where: {
          conversationId: conv.id,
          ...(lastReadAt
            ? { createdAt: { gt: lastReadAt } }
            : { senderAgentId: { not: agentId } }),
        },
      });

      totalUnread += unread;
    }

    logDevCtx("Conversation", "Unread count", { agentId, count: totalUnread });
    return totalUnread;
  }

  // ============================================
  // Verify agent has access to a conversation
  // ============================================

  private async verifyAgentAccess(
    conversationId: string,
    agentId: string,
  ): Promise<void> {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, agentId },
    });

    if (!participant) {
      throw new ForbiddenException({
        error: "You do not have access to this conversation.",
      });
    }
  }
}