import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { NotificationService } from "./notification.service";
import { RfqService } from "./rfq.service";
import { logDevCtx } from "../lib/logDev";
import { RealtimeGateway } from "../gateway/realtime.gateway";
import { SendMessageDto, ConversationMessage } from "./conversation.service";
import { PurchaseOrderPaymentService } from "./purchase-order-payment.service";

// ============================================
// DTOs
// ============================================

export type SenderInfo = {
  senderType: "AGENT" | "SUPPLIER";
  senderAgentId?: string;
  senderSupplierId?: number;
};

export type SendOfferDto = {
  unitPrice: number;
  quantity: number;
  estimatedLeadDays?: number;
  validUntil?: string;
  notes?: string;
};

export type AcceptOfferDto = {
  offerId?: string;
};

export type RejectOfferDto = {
  reason?: string;
};

export type ConsolidatePoDto = {
  rfqIds: string[];
  deliveryDate: string;
  driverName?: string | null;
  driverContact?: string | null;
  notes?: string;
};

export type ExtraCharge = {
  code: string;
  label: string;
  amount: number;
  taxable?: boolean;
  description?: string;
};

function normalizeExtraCharges(value: unknown): ExtraCharge[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new BadRequestException({ error: "Extra charges must be a list." });
  return value.map((charge) => {
    if (!charge || typeof charge !== "object") throw new BadRequestException({ error: "Invalid extra charge." });
    const input = charge as Record<string, unknown>;
    const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
    const label = typeof input.label === "string" ? input.label.trim() : "";
    const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
    if (!code || !label || !Number.isFinite(amount) || amount < 0) throw new BadRequestException({ error: "Each extra charge needs a code, label, and non-negative amount." });
    return { code, label, amount: Math.round(amount * 100) / 100, ...(typeof input.taxable === "boolean" ? { taxable: input.taxable } : {}), ...(typeof input.description === "string" && input.description.trim() ? { description: input.description.trim() } : {}) };
  });
}

export type ConsolidatePoResult = {
  success: boolean;
  message: string;
  purchaseOrder: { id: string; poNumber: string };
  conversationId: string;
  rfqIds: string[];
};

export type RfqOfferDetail = {
  id: string;
  rfqId: string;
  senderType: "AGENT" | "SUPPLIER";
  senderName: string;
  senderAgentId?: string | null;
  senderSupplierId?: number | null;
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

// ── PO Transaction Workflow types ──────────────────────────────────

export type PoListItem = {
  id: string;
  poNumber: string;
  status: string;
  paymentStatus: string;
  subtotalAmount: number;
  extraCharges: ExtraCharge[];
  extraChargesTotal: number;
  totalAmount: number;
  vatAmount: number;
  requestedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    name: string;
    verified: boolean;
    location?: string | null;
    profilePhoto?: string | null;
  } | null;
  delivery: {
    scheduledDate: Date;
    status: string;
    driverName?: string | null;
    driverContact?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
  } | null;
  rfqs: Array<{
    id: string;
    rfqNumber: string;
    status: string;
  }>;
  lineItems: Array<{
    id: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    supplierItem: {
      id: string;
      name: string;
      sku?: string | null;
      image?: string | null;
      unit?: string | null;
    };
  }>;
};

export type PoDetail = {
  id: string;
  poNumber: string;
  status: string;
  source: "DIRECT_ORDER" | "RFQ";
  supplierConfirmation: "REVIEW_REQUIRED" | "CONFIRMED" | "DECLINED";
  supplierConfirmedAt?: Date | null;
  supplierExpectedDeliveryAt?: Date | null;
  supplierNote?: string | null;
  paymentStatus: string;
  rejectionReason?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentPreparedAt?: Date | null;
  notes?: string | null;
  requestedDate: Date | null;
  subtotalAmount: number;
  extraCharges: ExtraCharge[];
  extraChargesTotal: number;
  totalAmount: number;
  vatAmount: number;
  createdAt: Date;
  updatedAt: Date;
  receiptSnapshot?: Record<string, any> | null;
  paymentAttempt?: {
    id: string;
    status: string;
    provider: string;
    createdAt: Date;
  } | null;
  agentId?: string | null;
  supplier: {
    id: string;
    name: string;
    verified: boolean;
    location?: string | null;
    profilePhoto?: string | null;
  } | null;
  rfqs: Array<{
    id: string;
    rfqNumber: string;
    status: string;
    agentId: string;
    acceptedPrice?: number | null;
    acceptedQuantity?: number | null;
    acceptedDeliveryDate?: Date | null;
    notes?: string | null;
  }>;
  delivery: {
    id: string;
    scheduledDate: Date;
    deliveredAt?: Date | null;
    status: string;
    driverName?: string | null;
    driverContact?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    notes?: string | null;
    recipientName?: string | null;
    recipientContact?: string | null;
  } | null;
  lineItems: Array<{
    id: string;
    supplierItemId: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    itemName: string;
    itemSku: string;
    itemDescription: string;
    supplierItem: {
      id: string;
      name: string;
      sku?: string | null;
      image?: string | null;
      unit?: string | null;
      isVatExempt?: boolean | null;
      vatRate?: number | null;
    };
  }>;
  conversation: {
    id: string;
    rfqId: string | null;
    poId: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    participants: Array<{
      id: string;
      conversationId: string;
      agentId?: string | null;
      organizationId?: number | null;
      role: string;
      joinedAt: Date;
      lastReadAt?: Date | null;
    }>;
    messages: ConversationMessage[];
  } | null;
};

// ============================================
// Price breakdown helper
// ============================================

type PriceBreakdown = {
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  isVatExempt: boolean;
  total: number;
};

// Single source of truth for subtotal/VAT/total math, so every event
// (counter offer, accept, reject) computes it the same way, from the same
// per-product VAT fields — never hardcoded, never applied twice.
function computePriceBreakdown(
  unitPrice: number,
  quantity: number,
  supplierItem: { isVatExempt?: boolean | null; vatRate?: number | null } | null | undefined,
): PriceBreakdown {
  const isVatExempt = supplierItem?.isVatExempt ?? false;
  const vatRate = supplierItem?.vatRate ?? 0.12;
  const subtotal = unitPrice * quantity;
  const vatAmount = isVatExempt ? 0 : subtotal * vatRate;
  const total = subtotal + vatAmount;
  return { subtotal, vatAmount, vatRate, isVatExempt, total };
}

// ============================================
// Negotiation Service
// ============================================

@Injectable()
export class RfqNegotiationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rfqService: RfqService,
    private readonly realtime: RealtimeGateway,
    private readonly purchaseOrderPayment: PurchaseOrderPaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  // ============================================
  // Verify sender access to an RFQ
  // ============================================

  private async verifyAccess(rfqId: string, sender: SenderInfo): Promise<any> {
    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { id: rfqId, deletedAt: null },
      include: {
        Agent: { select: { id: true, fullname: true, email: true, organizationId: true } },
        Organization: { select: { id: true, name: true, verificationStatus: true } },
        SupplierItem: {
          include: {
            SupplierCatalog: {
              include: { Organization: { select: { id: true, name: true } } },
            },
          },
        },
        Conversation: {
          include: {
            ConversationParticipant: true,
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException({ error: "RFQ not found" });
    }

    if (sender.senderType === "AGENT" && sender.senderAgentId) {
      if (rfq.agentId !== sender.senderAgentId) {
        throw new ForbiddenException({
          error: "You do not have access to this RFQ.",
        });
      }
    }

    if (sender.senderType === "SUPPLIER" && sender.senderSupplierId) {
      const supplierOrgId = rfq.supplierOrgId;
      if (supplierOrgId !== sender.senderSupplierId) {
        throw new ForbiddenException({
          error: "You do not have access to this RFQ.",
        });
      }
    }

    return rfq;
  }

  // ============================================
  // Send a counter offer (agent or supplier)
  // ============================================

  async sendCounterOffer(
    rfqId: string,
    sender: SenderInfo,
    data: SendOfferDto,
  ): Promise<RfqOfferDetail> {
    logDevCtx("Negotiation", "Sending counter offer", { rfqId, sender, data });

    const rfq = await this.verifyAccess(rfqId, sender);

    // Determine the other party for notifications
    const otherPartyOrgId = rfq.supplierOrgId;
    const notifOrgId =
      sender.senderType === "AGENT" ? otherPartyOrgId : rfq.Agent.organizationId;
    const notifTitle = "New Counter Offer";
    const notifMessage =
      sender.senderType === "AGENT"
        ? `The buyer sent a counter offer for RFQ #${rfq.rfqNumber}.`
        : `The supplier sent a counter offer for RFQ #${rfq.rfqNumber}.`;

    const breakdown = computePriceBreakdown(data.unitPrice, data.quantity, rfq.SupplierItem);

    const offer = await this.prisma.$transaction(async (tx) => {
      // 1. Create the RfqOffer record (never overwrite — each round is new)
      const newOffer = await tx.rfqOffer.create({
        data: {
          id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          rfqId: rfq.id,
          senderAgentId: sender.senderType === "AGENT" ? sender.senderAgentId : null,
          senderSupplierId:
            sender.senderType === "SUPPLIER" ? sender.senderSupplierId : null,
          offerType: "COUNTER_OFFER",
          unitPrice: data.unitPrice,
          quantity: data.quantity,
          estimatedLeadDays: data.estimatedLeadDays,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          notes: data.notes,
          status: "PENDING",
        },
      });

      // 2. Update RFQ status based on who sent the offer
      // AGENT → BUYER_COUNTERED (agent countered the supplier's offer)
      // SUPPLIER → SUPPLIER_OFFERED (supplier sent a new offer/counter)
      const newStatus =
        sender.senderType === "AGENT" ? "BUYER_COUNTERED" : "SUPPLIER_OFFERED";

      await tx.requestForQuotation.update({
        where: { id: rfq.id },
        data: { status: newStatus },
      });

      // 3. Create a conversation message as an offer card.
      // FIX: previously the full offer payload was JSON.stringify()'d into
      // `message` and `metadata` was left unset — ConversationEventCard's
      // COUNTER_OFFER branch requires `message.metadata` to render the real
      // CounterOfferCard, so it silently fell through to SystemEventCard and
      // printed the raw JSON blob as plain text. `message` is now a human-
      // readable summary; `metadata` carries the real structured payload
      // (including the computed price breakdown) as an actual JSON object,
      // not a string.
      const senderLabel = sender.senderType === "AGENT" ? "Buyer" : "Supplier";

      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId: rfq.Conversation!.id,
          senderAgentId: sender.senderType === "AGENT" ? sender.senderAgentId : null,
          senderOrgId: sender.senderType === "SUPPLIER" ? sender.senderSupplierId : null,
          message: `${senderLabel} sent a counter offer: ${data.quantity} × ₱${data.unitPrice.toLocaleString()}`,
          type: "COUNTER_OFFER",
          metadata: {
            event: "counter_offer",
            offerId: newOffer.id,
            unitPrice: data.unitPrice,
            quantity: data.quantity,
            estimatedLeadDays: data.estimatedLeadDays ?? null,
            validUntil: data.validUntil ?? null,
            notes: data.notes ?? null,
            ...breakdown,
          },
          rfqOfferId: newOffer.id,
          attachments: [],
        },
      });

      // 4. Update conversation updatedAt
      await tx.conversation.update({
        where: { id: rfq.Conversation!.id },
        data: { updatedAt: new Date() },
      });

      logDevCtx("Negotiation", "Counter offer created", {
        offerId: newOffer.id,
        rfqId: rfq.id,
        rfqStatus: newStatus,
      });

      return newOffer;
    });

    // Emit realtime events after transaction commits
    const conversationId = rfq.Conversation!.id;
    const offerPayload = { ...this.mapOffer(offer, rfq), conversationId };
    this.realtime.emitToConversation(conversationId, "offer:counter" as any, offerPayload);
    this.realtime.emitToConversation(conversationId, "conversation:newMessage" as any, {
      conversationId,
      senderId: sender.senderType === "AGENT" ? sender.senderAgentId || "" : `org:${sender.senderSupplierId ?? ""}`,
      senderName: sender.senderType === "AGENT" ? (rfq.Agent?.fullname ?? "Unknown") : (rfq.Organization?.name ?? "Unknown"),
      senderRole: sender.senderType,
      senderAgentId: sender.senderType === "AGENT" ? sender.senderAgentId : null,
      senderOrgId: sender.senderType === "SUPPLIER" ? sender.senderSupplierId : null,
      offer: offerPayload,
      senderType: sender.senderType,
    });
    // Notification DB record — created after transaction commits (FIX #1, #7)
    if (notifOrgId != null) {
      void this.prisma.notification.create({
        data: {
          orgId: notifOrgId,
          agentId: sender.senderType === "SUPPLIER" ? rfq.Agent?.id : null,
          title: notifTitle,
          message: notifMessage,
          type: "NEW_TRANSACTION",
          conversationId,
          isRead: false,
        },
      });

      this.realtime.emitToOrganization(notifOrgId, "notification:new" as any, {
        title: notifTitle,
        message: notifMessage,
        rfqId,
        conversationId,
      });
    }

    return this.mapOffer(offer, rfq);
  }

  // ============================================
  // Send a final offer (supplier only)
  // ============================================

  async sendFinalOffer(
    rfqId: string,
    supplierOrgId: number,
    data: SendOfferDto,
  ): Promise<RfqOfferDetail> {
    logDevCtx("Negotiation", "Sending final offer", { rfqId, supplierOrgId, data });

    const rfq = await this.verifyAccess(rfqId, {
      senderType: "SUPPLIER",
      senderSupplierId: supplierOrgId,
    });

    const breakdown = computePriceBreakdown(data.unitPrice, data.quantity, rfq.SupplierItem);

    const offer = await this.prisma.$transaction(async (tx) => {
      // 1. Create the RfqOffer record
      const newOffer = await tx.rfqOffer.create({
        data: {
          id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          rfqId: rfq.id,
          senderSupplierId: supplierOrgId,
          offerType: "FINAL_OFFER",
          unitPrice: data.unitPrice,
          quantity: data.quantity,
          estimatedLeadDays: data.estimatedLeadDays,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          notes: data.notes,
          status: "PENDING",
        },
      });

      // 2. Update RFQ status to NEGOTIATING (awaiting buyer response)
      await tx.requestForQuotation.update({
        where: { id: rfq.id },
        data: { status: "NEGOTIATING" },
      });

      // 3. Create conversation message as offer card.
      // Same fix as sendCounterOffer above — real `metadata` object instead
      // of a stringified JSON blob in `message`.
      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId: rfq.Conversation!.id,
          senderOrgId: supplierOrgId,
          message: `Supplier sent a final offer: ${data.quantity} × ₱${data.unitPrice.toLocaleString()}`,
          type: "FINAL_OFFER",
          metadata: {
            event: "final_offer",
            offerId: newOffer.id,
            unitPrice: data.unitPrice,
            quantity: data.quantity,
            estimatedLeadDays: data.estimatedLeadDays ?? null,
            validUntil: data.validUntil ?? null,
            notes: data.notes ?? null,
            ...breakdown,
          },
          rfqOfferId: newOffer.id,
          attachments: [],
        },
      });

      // 4. Update conversation updatedAt
      await tx.conversation.update({
        where: { id: rfq.Conversation!.id },
        data: { updatedAt: new Date() },
      });

      logDevCtx("Negotiation", "Final offer created", {
        offerId: newOffer.id,
        rfqId: rfq.id,
        rfqStatus: "NEGOTIATING",
      });

      return newOffer;
    });

    // Emit realtime events after transaction commits
    const finalOfferPayload = { ...this.mapOffer(offer, rfq), conversationId: rfq.Conversation!.id };
    this.realtime.emitToConversation(rfq.Conversation!.id, "offer:counter" as any, finalOfferPayload);
    this.realtime.emitToConversation(rfq.Conversation!.id, "conversation:newMessage" as any, {
      conversationId: rfq.Conversation!.id,
      senderId: `org:${supplierOrgId}`,
      senderName: rfq.Organization?.name ?? "Unknown",
      senderRole: "SUPPLIER" as const,
      senderAgentId: null,
      senderOrgId: supplierOrgId,
      offer: finalOfferPayload,
      senderType: "SUPPLIER",
    });
    // Notification DB record — created after transaction commits (FIX #1, #7)
    if (rfq.Agent?.organizationId) {
      void this.prisma.notification.create({
        data: {
          orgId: rfq.Agent.organizationId,
          agentId: rfq.Agent.id,
          title: "Final Offer Sent",
          message: `Supplier sent a final offer for RFQ #${rfq.rfqNumber}.`,
          type: "NEW_TRANSACTION",
          conversationId: rfq.Conversation!.id,
          isRead: false,
        },
      });

      this.realtime.emitToOrganization(rfq.Agent.organizationId, "notification:new" as any, {
        title: "Final Offer Sent",
        message: `Supplier sent a final offer for RFQ #${rfq.rfqNumber}.`,
        rfqId,
        conversationId: rfq.Conversation!.id,
      });
    }

    return this.mapOffer(offer, rfq);
  }

  // ============================================
  // Accept an offer (agent only) — triggers PO generation
  // ============================================

  async acceptOffer(
    rfqId: string,
    agentId: string,
    data?: AcceptOfferDto,
  ): Promise<{
    success: boolean;
    message: string;
    offer: RfqOfferDetail;
    purchaseOrder?: { id: string; poNumber: string } | null;
  }> {
    logDevCtx("Negotiation", "Accepting offer", { rfqId, agentId, data });

    const rfq = await this.verifyAccess(rfqId, {
      senderType: "AGENT",
      senderAgentId: agentId,
    });

    // Find the offer to accept (must be a FINAL_OFFER with PENDING status)
    let offer;
    if (data?.offerId) {
      offer = await this.prisma.rfqOffer.findFirst({
        where: { id: data.offerId, rfqId },
      });
    } else {
      // Accept the latest FINAL_OFFER that is still PENDING
      offer = await this.prisma.rfqOffer.findFirst({
        where: {
          rfqId,
          offerType: "FINAL_OFFER",
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!offer) {
      // If no FINAL_OFFER found, reject any PENDING offer
      const pendingOffer = await this.prisma.rfqOffer.findFirst({
        where: { rfqId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });

      if (!pendingOffer) {
        throw new NotFoundException({
          error: "No final offer found to accept.",
        });
      }

      throw new BadRequestException({
        error: "The selected offer is not a final offer and cannot be accepted directly.",
      });
    }

    // FIX: compute the real subtotal/VAT/total from the RFQ's own SupplierItem
    // (already fetched by verifyAccess) instead of leaving the card with only
    // unitPrice/quantity and nothing to display for VAT/total.
    const breakdown = computePriceBreakdown(offer.unitPrice, offer.quantity, rfq.SupplierItem);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark the accepted offer as ACCEPTED
      await tx.rfqOffer.update({
        where: { id: offer.id },
        data: { status: "ACCEPTED" },
      });

      // 2. Create an ACCEPTANCE RfqOffer record (audit trail)
      const acceptanceOffer = await tx.rfqOffer.create({
        data: {
          id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          rfqId: rfq.id,
          senderAgentId: agentId,
          offerType: "ACCEPTANCE",
          unitPrice: offer.unitPrice,
          quantity: offer.quantity,
          estimatedLeadDays: offer.estimatedLeadDays,
          validUntil: offer.validUntil,
          notes: "Offer accepted by buyer",
          status: "ACCEPTED",
        },
      });

      // 3. Set RFQ status to WAITING_SUPPLIER_CONFIRMATION
      await tx.requestForQuotation.update({
        where: { id: rfq.id },
        data: {
          status: "WAITING_SUPPLIER_CONFIRMATION",
          acceptedPrice: offer.unitPrice,
          acceptedQuantity: offer.quantity,
          acceptedDeliveryDate: offer.deliveryDate ?? null,
          agentAcceptedAt: new Date(),
        },
      });

      // 4. Create conversation message (OFFER_ACCEPTED type with structured
      // metadata) — now includes the computed subtotal/vatAmount/vatRate/
      // isVatExempt/total, not just unitPrice/quantity.
      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId: rfq.Conversation!.id,
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
          rfqOfferId: acceptanceOffer.id,
          attachments: [],
        },
      });

      // 5. Update conversation updatedAt
      await tx.conversation.update({
        where: { id: rfq.Conversation!.id },
        data: { updatedAt: new Date() },
      });

      logDevCtx("Negotiation", "Offer accepted, awaiting supplier", {
        offerId: offer.id,
        rfqId: rfq.id,
      });

      return {
        offer: acceptanceOffer,
      };
    });

    // Emit realtime events after transaction commits
    const conversationId = rfq.Conversation!.id;
    const offerPayload = this.mapOffer(result.offer, rfq);
    this.realtime.emitToConversation(conversationId, "offer:accepted" as any, {
      conversationId,
      offerId: offer.id,
      offer: offerPayload,
      status: "WAITING_SUPPLIER_CONFIRMATION",
    });
    this.realtime.emitToConversation(conversationId, "conversation:newMessage" as any, {
      conversationId,
      senderId: agentId,
      senderName: rfq.Agent?.fullname ?? "Unknown",
      senderRole: "AGENT" as const,
      senderAgentId: agentId,
      senderOrgId: null,
      message: "Agent accepted supplier offer. Awaiting supplier confirmation.",
      type: "OFFER_ACCEPTED",
      senderType: "AGENT",
      metadata: {
        event: "offer_accepted",
        offerId: offer.id,
        unitPrice: offer.unitPrice,
        quantity: offer.quantity,
        deliveryDate: offer.deliveryDate ?? null,
        ...breakdown,
      },
    });
    // Notification DB record — created after transaction commits (FIX #1, #7)
    if (rfq.supplierOrgId) {
      void this.prisma.notification.create({
        data: {
          orgId: rfq.supplierOrgId,
          title: "Buyer accepted your offer",
          message: `Buyer accepted your final offer for RFQ #${rfq.rfqNumber}. Confirm the agreement to continue.`,
          type: "NEGOTIATION_ACCEPTED",
          conversationId,
          isRead: false,
        },
      });

      this.realtime.emitToOrganization(rfq.supplierOrgId, "notification:new" as any, {
        title: "Buyer accepted your offer",
        message: `Buyer accepted your final offer for RFQ #${rfq.rfqNumber}. Confirm the agreement to continue.`,
        rfqId,
        conversationId,
      });
    }

    return {
      success: true,
      message: "Offer accepted. Waiting for supplier confirmation.",
      offer: this.mapOffer(result.offer, rfq),
      purchaseOrder: null,
    };
  }

  // ============================================
  // Reject an offer (agent or supplier)
  // ============================================

  async rejectOffer(
    rfqId: string,
    sender: SenderInfo,
    data?: RejectOfferDto,
  ): Promise<{ success: boolean; message: string }> {
    logDevCtx("Negotiation", "Rejecting offer", { rfqId, sender, data });

    const rfq = await this.verifyAccess(rfqId, sender);

    // Find the latest PENDING offer to reject
    const pendingOffer = await this.prisma.rfqOffer.findFirst({
      where: { rfqId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!pendingOffer) {
      throw new NotFoundException({
        error: "No pending offer found to reject.",
      });
    }

    const reason = data?.reason || "Offer rejected by the other party.";

    // Hoist notification variables for post-transaction emissions
    const notifOrgId =
      sender.senderType === "AGENT" ? rfq.supplierOrgId : rfq.Agent?.organizationId;
    const senderLabel =
      sender.senderType === "AGENT" ? "buyer" : "supplier";

    // FIX: same as acceptOffer — compute the breakdown of what was rejected,
    // so OfferRejectedCard has something to show beyond bare unitPrice/qty.
    const breakdown = computePriceBreakdown(pendingOffer.unitPrice, pendingOffer.quantity, rfq.SupplierItem);

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark the offer as REJECTED
      await tx.rfqOffer.update({
        where: { id: pendingOffer.id },
        data: { status: "REJECTED" },
      });

      // 2. Create a REJECTION RfqOffer record (audit trail)
      const rejectionOffer = await tx.rfqOffer.create({
        data: {
          id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          rfqId: rfq.id,
          senderAgentId:
            sender.senderType === "AGENT" ? sender.senderAgentId : null,
          senderSupplierId:
            sender.senderType === "SUPPLIER" ? sender.senderSupplierId : null,
          offerType: "REJECTION",
          unitPrice: pendingOffer.unitPrice,
          quantity: pendingOffer.quantity,
          notes: reason,
          status: "REJECTED",
        },
      });

      // 3. Update RFQ status
      const newStatus =
        sender.senderType === "AGENT" ? "CANCELLED" : "SUPPLIER_OFFERED";
      const rfqStatus = sender.senderType === "AGENT" ? "CANCELLED" : "SUPPLIER_OFFERED";

      await tx.requestForQuotation.update({
        where: { id: rfq.id },
        data: { status: rfqStatus },
      });

      // 4. Create conversation message (OFFER_REJECTED type with structured
      // metadata) — now includes the computed subtotal/vatAmount/vatRate/
      // isVatExempt/total for the rejected offer.
      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId: rfq.Conversation!.id,
          senderAgentId:
            sender.senderType === "AGENT" ? sender.senderAgentId : null,
          senderOrgId:
            sender.senderType === "SUPPLIER" ? sender.senderSupplierId : null,
          message: reason || "Offer rejected by the other party.",
          type: "OFFER_REJECTED",
          metadata: {
            event: "offer_rejected",
            reason: reason ?? null,
            unitPrice: pendingOffer.unitPrice,
            quantity: pendingOffer.quantity,
            ...breakdown,
          },
          rfqOfferId: rejectionOffer.id,
          attachments: [],
        },
      });

      // 5. Update conversation updatedAt
      await tx.conversation.update({
        where: { id: rfq.Conversation!.id },
        data: { updatedAt: new Date() },
      });

      logDevCtx("Negotiation", "Offer rejected", {
        offerId: pendingOffer.id,
        rfqId: rfq.id,
        rfqStatus: newStatus,
      });
    });

    // Emit realtime events after transaction commits
    const conversationId = rfq.Conversation!.id;
    this.realtime.emitToConversation(conversationId, "offer:rejected" as any, {
      conversationId,
      offerId: pendingOffer.id,
      reason,
    });
    this.realtime.emitToConversation(conversationId, "conversation:newMessage" as any, {
      conversationId,
      senderId: sender.senderType === "AGENT" ? sender.senderAgentId || "" : `org:${sender.senderSupplierId ?? ""}`,
      senderName: sender.senderType === "AGENT" ? (rfq.Agent?.fullname ?? "Unknown") : rfq.Organization?.name ?? "Unknown",
      senderRole: sender.senderType,
      senderAgentId: sender.senderType === "AGENT" ? sender.senderAgentId : null,
      senderOrgId: sender.senderType === "SUPPLIER" ? sender.senderSupplierId : null,
      message: reason || "Offer rejected by the other party.",
      type: "OFFER_REJECTED",
      senderType: sender.senderType,
      metadata: {
        event: "offer_rejected",
        reason: reason ?? null,
        unitPrice: pendingOffer.unitPrice,
        quantity: pendingOffer.quantity,
        ...breakdown,
      },
    });
    // Notification DB record — created after transaction commits (FIX #1, #7)
    if (notifOrgId) {
      void this.prisma.notification.create({
        data: {
          orgId: notifOrgId,
          agentId: sender.senderType === "SUPPLIER" ? rfq.Agent?.id : null,
          title: "Offer Rejected",
          message: `The ${senderLabel} rejected your offer for RFQ #${rfq.rfqNumber}.${reason ? ` Reason: ${reason}` : ""}`,
          type: "NEW_TRANSACTION",
          conversationId,
          isRead: false,
        },
      });

      this.realtime.emitToOrganization(notifOrgId, "notification:new" as any, {
        title: "Offer Rejected",
        message: `The ${senderLabel} rejected your offer for RFQ #${rfq.rfqNumber}.${reason ? ` Reason: ${reason}` : ""}`,
        rfqId,
        conversationId,
      });
    }

    return {
      success: true,
      message: "Offer rejected. RFQ has been updated.",
    };
  }

  // ============================================
  // Get negotiation history (all offers for an RFQ)
  // ============================================

  async getNegotiationHistory(
    rfqId: string,
    agentId?: string,
  ): Promise<RfqOfferDetail[]> {
    logDevCtx("Negotiation", "Getting negotiation history", { rfqId, agentId });

    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { id: rfqId, deletedAt: null },
      include: {
        Agent: { select: { id: true, fullname: true } },
        Organization: { select: { id: true, name: true } },
      },
    });

    if (!rfq) {
      throw new NotFoundException({ error: "RFQ not found" });
    }

    // If agentId provided, verify access
    if (agentId && rfq.agentId !== agentId) {
      throw new ForbiddenException({
        error: "You do not have access to this RFQ.",
      });
    }

    const offers = await this.prisma.rfqOffer.findMany({
      where: { rfqId },
      orderBy: { createdAt: "asc" },
      include: {
        Agent: { select: { id: true, fullname: true } },
        Organization: { select: { id: true, name: true } },
      },
    });

    return offers.map((offer) => this.mapOfferWithRelations(offer));
  }

  // ============================================
  // Get the latest PENDING offer for an RFQ
  // ============================================

  async getLatestOffer(
    rfqId: string,
    agentId?: string,
  ): Promise<RfqOfferDetail | null> {
    logDevCtx("Negotiation", "Getting latest offer", { rfqId, agentId });

    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { id: rfqId, deletedAt: null },
    });

    if (!rfq) {
      throw new NotFoundException({ error: "RFQ not found" });
    }

    if (agentId && rfq.agentId !== agentId) {
      throw new ForbiddenException({
        error: "You do not have access to this RFQ.",
      });
    }

    const offer = await this.prisma.rfqOffer.findFirst({
      where: { rfqId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        Agent: { select: { id: true, fullname: true } },
        Organization: { select: { id: true, name: true } },
      },
    });

    if (!offer) {
      return null;
    }

    return this.mapOfferWithRelations(offer);
  }

  // ============================================
  // Expire offers past their validUntil date
  // ============================================

  async expireOffers(): Promise<number> {
    logDevCtx("Negotiation", "Expiring offers", {});

    const result = await this.prisma.rfqOffer.updateMany({
      where: {
        status: "PENDING",
        validUntil: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    logDevCtx("Negotiation", "Expired offers", {
      count: result.count,
    });

    return result.count;
  }

  // ============================================
  // Consolidated PO creation (multiple RFQs → one PO)
  // ============================================

  async createConsolidatedPurchaseOrder(
    agentId: string,
    data: ConsolidatePoDto,
  ): Promise<ConsolidatePoResult> {
    logDevCtx("Negotiation", "Creating consolidated PO", { rfqIds: data.rfqIds, agentId });

    // Verify all RFQs belong to this agent and are in the right state
    const rfqs = await this.prisma.requestForQuotation.findMany({
      where: {
        id: { in: data.rfqIds },
        agentId,
        deletedAt: null,
      },
      include: {
        Agent: { select: { id: true, fullname: true, organizationId: true } },
        Organization: { select: { id: true, name: true } },
        SupplierItem: {
          select: { id: true, name: true, sku: true, isVatExempt: true, vatRate: true },
        },
        Conversation: {
          select: { id: true },
        },
      },
    });

    if (rfqs.length !== data.rfqIds.length) {
      throw new NotFoundException({
        error: "One or more RFQs were not found or you do not have access to them.",
      });
    }

    // Check each RFQ is WAITING_SUPPLIER_CONFIRMATION
    for (const rfq of rfqs) {
      if (rfq.status !== "WAITING_SUPPLIER_CONFIRMATION") {
        throw new BadRequestException({
          error: `RFQ ${rfq.rfqNumber} is not in WAITING_SUPPLIER_CONFIRMATION status.`,
        });
      }
      if (!rfq.supplierConfirmedAt) {
        throw new BadRequestException({
          error: `RFQ ${rfq.rfqNumber} has not been confirmed by the supplier yet.`,
        });
      }
    }

    // All RFQs should share the same supplier (for now)
    const supplierOrgIds = new Set(rfqs.map((r) => r.supplierOrgId));
    if (supplierOrgIds.size > 1) {
      throw new BadRequestException({
        error: "Consolidated PO creation requires all RFQs to have the same supplier.",
      });
    }

    const supplierOrgId = rfqs[0].supplierOrgId!;

    let poConversationId: string | null = null;
    const result = await this.prisma.$transaction(async (tx) => {
      const poNumber = await this.generatePONumber();

      // Calculate totals from all RFQ line items
      let subtotalAmount = 0;
      let totalVat = 0;

      const poLineItems = rfqs.map((rfq) => {
        const acceptedPrice = rfq.acceptedPrice ?? rfq.targetUnitPrice ?? 0;
        const acceptedQty = rfq.acceptedQuantity ?? Number(rfq.quantity ?? "0");
        const subtotal = acceptedPrice * acceptedQty;
        const isVatExempt = rfq.SupplierItem?.isVatExempt ?? false;
        const vatRate = rfq.SupplierItem?.vatRate ?? 0.12;
        const vatAmount = isVatExempt ? 0 : subtotal * vatRate;

        subtotalAmount += subtotal;
        totalVat += vatAmount;

        return {
          supplierItemId: rfq.supplierItemId!,
          qty: Math.ceil(acceptedQty),
          unitPrice: acceptedPrice,
          subtotal,
          itemName: rfq.SupplierItem?.name ?? null,
          itemSku: rfq.SupplierItem?.sku ?? null,
        };
      });

      const buyerOrgId = rfqs[0].Agent?.organizationId ?? null;
      const buyerOutlet = buyerOrgId
        ? await tx.outlet.findFirst({ where: { orgId: buyerOrgId, isActive: true }, select: { id: true } })
        : null;
      // Wholesale POs may not have an outlet. Never manufacture outlet ID 0.
      const deliveryOutletId = buyerOutlet?.id ?? null;

      // Create PurchaseOrder
      const po = await tx.purchaseOrder.create({
        data: {
          id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          poNumber,
          buyerOrgId,
          supplierOrgId,
          status: "PENDING",
          source: "RFQ",
          supplierConfirmation: "CONFIRMED",
          supplierConfirmedAt: new Date(),
          notes: data.notes ?? undefined,
          requestedDate: new Date(),
          subtotalAmount,
          extraCharges: [],
          extraChargesTotal: 0,
          totalAmount: subtotalAmount + totalVat,
          vatAmount: totalVat,
          deliveryOutletId,
          agentId: agentId,
          updatedAt: new Date(),
        },
      });

      // ── Create a dedicated PO conversation (type: ORDER) ──────────────
      // This conversation lives for the entire PO lifecycle: accept/reject,
      // receipt upload, delivery tracking, payment.  Both the agent and the
      // supplier org are added as participants.
      const poConversation = await tx.conversation.create({
        data: {
          id: `conv_po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          poId: po.id,
          type: "ORDER",
          ConversationParticipant: {
            create: [
              {
                id: `part_${Date.now()}_agent`,
                agentId: agentId,
                role: "AGENT",
              },
              {
                id: `part_${Date.now()}_supplier`,
                organizationId: supplierOrgId,
                role: "SUPPLIER",
              },
            ],
          },
        },
      });

      // Link the conversation back to the PO
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { conversationId: poConversation.id },
      });

      // Create a system message in the PO conversation announcing creation
      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          conversationId: poConversation.id,
          senderAgentId: agentId,
          message: `Purchase Order ${poNumber} has been created from ${rfqs.length} RFQ(s).`,
          type: "ORDER_CREATED",
          metadata: {
            event: "order_created",
            poId: po.id,
            poNumber,
            rfqIds: data.rfqIds,
            deliveryDate: data.deliveryDate,
            totalAmount: subtotalAmount + totalVat,
            vatAmount: totalVat,
            buyerName: rfqs[0].Agent?.fullname ?? "Procurement agent",
            supplierName: rfqs[0].Organization?.name ?? "Supplier",
            poStatus: po.status,
          },
        },
      });

      // Create PO Line Items for each RFQ
      for (const item of poLineItems) {
        await tx.pOLineItem.create({
          data: {
            id: `poitem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            poId: po.id,
            supplierItemId: item.supplierItemId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            itemName: item.itemName,
            itemSku: item.itemSku,
          },
        });
      }

      // Create Delivery
      await tx.delivery.create({
        data: {
          id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          poId: po.id,
          scheduledDate: new Date(data.deliveryDate),
          status: "SCHEDULED",
          driverName: data.driverName,
          driverContact: data.driverContact,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Link all RFQs to this consolidated PO via PurchaseOrderRFQ bridge
      await tx.purchaseOrderRFQ.createMany({
        data: data.rfqIds.map((rfqId) => ({ poId: po.id, rfqId })),
      });

      // Update all RFQs to PO_CREATED status
      await tx.requestForQuotation.updateMany({
        where: { id: { in: data.rfqIds } },
        data: {
          status: "PO_CREATED",
          acceptedDeliveryDate: new Date(data.deliveryDate),
        },
      });

      // Create CONSOLIDATED_PO_CREATED timeline event in each conversation
      const consolidatedPoMetadata = {
        event: "consolidated_po_created",
        poId: po.id,
        poNumber,
        rfqIds: data.rfqIds,
        deliveryDate: data.deliveryDate,
        subtotalAmount,
        totalVat,
      };

      for (const rfq of rfqs) {
        if (rfq.Conversation) {
          await tx.conversationMessage.create({
            data: {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              conversationId: rfq.Conversation.id,
              senderAgentId: agentId,
              message: `Consolidated Purchase Order ${poNumber} has been created from ${rfqs.length} RFQ(s).`,
              type: "CONSOLIDATED_PO_CREATED",
              metadata: consolidatedPoMetadata,
            },
          });
        }
      }

      logDevCtx("Negotiation", "Consolidated PO created", {
        poNumber,
        poId: po.id,
        rfqCount: rfqs.length,
      });

      return { po, conversationId: poConversation.id };
    });

    poConversationId = result.conversationId;

    // Notification DB record + realtime emits happen after transaction commits (FIX #1, #7)
    void this.prisma.notification.create({
      data: {
        orgId: supplierOrgId,
        title: "Consolidated PO Created",
        message: `A consolidated PO (${result.po.poNumber}) was created from ${rfqs.length} RFQs.`,
        type: "PURCHASE_ORDER_CREATED",
        conversationId: poConversationId,
        isRead: false,
      },
    });

    // Persist a direct Agent notification as well. An agent may not belong to
    // an organization, so organization-only notifications are insufficient.
    void this.prisma.notification.create({
      data: {
        agentId,
        title: "New Purchase Order",
        message: `Purchase Order ${result.po.poNumber} from ${rfqs[0].Organization?.name ?? "your supplier"} requires your review.`,
        type: "PURCHASE_ORDER_CREATED",
        conversationId: poConversationId,
        isRead: false,
      },
    });

    // Emit realtime events
    this.realtime.emitToOrganization(supplierOrgId, "purchaseOrder:created" as any, {
      poId: result.po.id,
      poNumber: result.po.poNumber,
      conversationId: poConversationId,
      rfqIds: data.rfqIds,
      totalAmount: result.po.totalAmount,
      vatAmount: result.po.vatAmount,
      deliveryDate: data.deliveryDate,
    });
    this.realtime.emitToUser(agentId, "notification:new", {
      title: "New Purchase Order",
      message: `Purchase Order ${result.po.poNumber} requires your review.`,
      type: "PURCHASE_ORDER_CREATED",
      deepLink: `/wholesale/orders/${result.po.id}`,
      poId: result.po.id,
    });
    this.realtime.emitToUser(agentId, "purchaseOrder:created", {
      poId: result.po.id,
      poNumber: result.po.poNumber,
    });

    // Emit ORDER_CREATED into the dedicated PO conversation
    this.realtime.emitToConversation(poConversationId, "conversation:newMessage" as any, {
      conversationId: poConversationId,
      senderId: agentId,
      senderName: rfqs[0].Agent?.fullname ?? "Unknown",
      senderRole: "AGENT" as const,
      senderAgentId: agentId,
      senderOrgId: null,
      message: `Purchase Order ${result.po.poNumber} has been created from ${rfqs.length} RFQ(s).`,
      type: "ORDER_CREATED",
      metadata: {
        event: "order_created",
        poId: result.po.id,
        poNumber: result.po.poNumber,
        rfqIds: data.rfqIds,
        deliveryDate: data.deliveryDate,
        totalAmount: result.po.totalAmount,
        vatAmount: result.po.vatAmount,
        buyerName: rfqs[0].Agent?.fullname ?? "Procurement agent",
        supplierName: rfqs[0].Organization?.name ?? "Supplier",
        poStatus: result.po.status,
      },
    });

    for (const rfq of rfqs) {
      if (rfq.Conversation) {
        this.realtime.emitToConversation(rfq.Conversation.id, "conversation:newMessage" as any, {
          conversationId: rfq.Conversation.id,
          senderId: agentId,
          senderName: rfq.Agent?.fullname ?? "Unknown",
          senderRole: "AGENT" as const,
          senderAgentId: agentId,
          senderOrgId: null,
          message: `Consolidated Purchase Order ${result.po.poNumber} has been created from ${rfqs.length} RFQ(s).`,
          type: "CONSOLIDATED_PO_CREATED",
          metadata: {
            event: "consolidated_po_created",
            poId: result.po.id,
            poNumber: result.po.poNumber,
            rfqIds: data.rfqIds,
            deliveryDate: data.deliveryDate,
            totalAmount: result.po.totalAmount,
            totalVat: result.po.vatAmount,
          },
          senderType: "AGENT",
        });
      }
    }

    return {
      success: true,
      message: `Consolidated PO ${result.po.poNumber} created from ${rfqs.length} RFQ(s).`,
      purchaseOrder: { id: result.po.id, poNumber: result.po.poNumber },
      conversationId: poConversationId ?? result.conversationId,
      rfqIds: data.rfqIds,
    };
  }

  // ============================================
  // PO Transaction Workflow — accept / reject / list / get
  // ============================================

  /**
   * Update delivery details (lat/lng/address) for a PO.
   * Called by the agent to provide delivery location on a map.
   */
  private async getOwnedPO(poId: string, agentId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { PurchaseOrderRFQ: { where: { rfq: { agentId } } }, Conversation: true, Delivery: true },
    });
    if (!po || (po.agentId !== agentId && po.PurchaseOrderRFQ.length === 0)) {
      throw new NotFoundException({ error: "Purchase Order not found or access denied." });
    }
    return po;
  }

  private async ensurePOConversation(po: { id: string; poNumber: string; supplierOrgId: number; conversationId: string | null; agentId: string | null }) {
    if (po.conversationId) return po.conversationId;
    if (!po.agentId) throw new BadRequestException({ error: "A PO conversation requires an assigned agent." });
    const existing = await this.prisma.conversation.findUnique({ where: { poId: po.id } });
    if (existing) return existing.id;
    const conversation = await this.prisma.conversation.create({ data: { id: `conv_po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, poId: po.id, type: "ORDER", ConversationParticipant: { create: [{ agentId: po.agentId, role: "AGENT" }, { organizationId: po.supplierOrgId, role: "SUPPLIER" }] } } });
    await this.prisma.purchaseOrder.update({ where: { id: po.id }, data: { conversationId: conversation.id } });
    await this.prisma.conversationMessage.create({ data: { conversationId: conversation.id, senderAgentId: po.agentId, message: `Purchase Order ${po.poNumber} was created.`, type: "ORDER_CREATED", metadata: { poId: po.id, poNumber: po.poNumber } } });
    return conversation.id;
  }

  private async postPOEvent(po: { id: string; poNumber: string; supplierOrgId: number; conversationId: string | null; agentId: string | null }, type: "PO_ACCEPTED" | "PO_REJECTED" | "PAYMENT_UPDATE", message: string, metadata: Record<string, unknown>) {
    const conversationId = await this.ensurePOConversation(po);
    await this.prisma.conversationMessage.create({ data: { conversationId, senderAgentId: po.agentId ?? undefined, message, type, metadata: metadata as any } });
    this.realtime.emitToConversation(conversationId, "conversation:newMessage", { conversationId, senderRole: "AGENT", senderId: po.agentId, message, type, metadata });
    return conversationId;
  }

  async acceptPO(poId: string, agentId: string) {
    const po = await this.getOwnedPO(poId, agentId);
    if (po.status !== "PENDING") throw new BadRequestException({ error: "Only pending purchase orders can be accepted." });
    const updated = await this.prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "ACCEPTED", updatedAt: new Date() } });
    const conversationId = await this.postPOEvent(updated, "PO_ACCEPTED", `Purchase Order ${updated.poNumber} was accepted.`, { poId, poNumber: updated.poNumber });
    this.realtime.emitToOrganization(updated.supplierOrgId, "purchaseOrder:accepted", { poId, poNumber: updated.poNumber, conversationId });
    this.realtime.emitToUser(agentId, "purchaseOrder:accepted", { poId, poNumber: updated.poNumber });
    return updated;
  }

  async rejectPO(poId: string, agentId: string, reason: string) {
    if (!reason.trim()) throw new BadRequestException({ error: "A rejection reason is required." });
    const po = await this.getOwnedPO(poId, agentId);
    if (po.status !== "PENDING") throw new BadRequestException({ error: "Only pending purchase orders can be rejected." });
    const updated = await this.prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "REJECTED", rejectionReason: reason.trim(), updatedAt: new Date() } });
    const conversationId = await this.postPOEvent(updated, "PO_REJECTED", `Purchase Order ${updated.poNumber} was rejected.`, { poId, poNumber: updated.poNumber, reason: reason.trim() });
    this.realtime.emitToOrganization(updated.supplierOrgId, "purchaseOrder:rejected", { poId, poNumber: updated.poNumber, reason: reason.trim(), conversationId });
    return updated;
  }

  async preparePayment(poId: string, agentId: string, data: { paymentMethod: "CARD" | "CASH" | "E_WALLET"; paymentReference?: string; delivery: { scheduledDate: string; address: string; latitude?: number | null; longitude?: number | null; notes?: string | null; recipientName?: string | null; recipientContact?: string | null } }) {
    const po = await this.getOwnedPO(poId, agentId);
    if (po.supplierConfirmation !== "CONFIRMED") throw new BadRequestException({ error: po.supplierConfirmation === "DECLINED" ? "This purchase order was declined by the supplier." : "Awaiting supplier confirmation before payment can be prepared." });
    if (po.paymentStatus !== "PENDING" && po.paymentStatus !== "PREPARING") throw new BadRequestException({ error: "Payment preparation is no longer available for this purchase order." });
    if (!data.delivery?.address?.trim()) throw new BadRequestException({ error: "A delivery address is required before payment can be prepared." });
    const scheduledDate = new Date(data.delivery.scheduledDate);
    if (Number.isNaN(scheduledDate.getTime())) throw new BadRequestException({ error: "Expected delivery date is invalid." });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (scheduledDate < today) throw new BadRequestException({ error: "Expected delivery date cannot be in the past." });
    const hasLatitude = data.delivery.latitude !== undefined && data.delivery.latitude !== null;
    const hasLongitude = data.delivery.longitude !== undefined && data.delivery.longitude !== null;
    if (hasLatitude !== hasLongitude || (hasLatitude && (Math.abs(data.delivery.latitude!) > 90 || Math.abs(data.delivery.longitude!) > 180))) throw new BadRequestException({ error: "Delivery coordinates are invalid." });

    // A single database transaction prevents a PREPARING PO with an unsaved delivery.
    const updated = await this.prisma.$transaction(async (tx) => {
      const deliveryData = {
        scheduledDate,
        address: data.delivery.address.trim(),
        latitude: hasLatitude ? data.delivery.latitude! : null,
        longitude: hasLongitude ? data.delivery.longitude! : null,
        notes: data.delivery.notes?.trim() || null,
        recipientName: data.delivery.recipientName?.trim() || null,
        recipientContact: data.delivery.recipientContact?.trim() || null,
        updatedAt: new Date(),
      };
      await tx.delivery.upsert({
        where: { poId },
        create: { id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, poId, status: "SCHEDULED", ...deliveryData },
        update: deliveryData,
      });
      return tx.purchaseOrder.update({ where: { id: poId }, data: { paymentMethod: data.paymentMethod, paymentReference: data.paymentReference?.trim() || null, paymentPreparedAt: new Date(), paymentStatus: "PREPARING", updatedAt: new Date() } });
    });
    const deliveryMetadata = { deliveryDate: scheduledDate, deliveryAddress: data.delivery.address.trim(), latitude: hasLatitude ? data.delivery.latitude : null, longitude: hasLongitude ? data.delivery.longitude : null, recipientName: data.delivery.recipientName?.trim() || null, recipientContact: data.delivery.recipientContact?.trim() || null };
    const conversationId = await this.postPOEvent(updated, "PAYMENT_UPDATE", "Payment prepared. Awaiting payment.", { poId, poNumber: updated.poNumber, paymentStatus: updated.paymentStatus, paymentMethod: updated.paymentMethod, amount: updated.totalAmount, ...deliveryMetadata });
    this.realtime.emitToOrganization(updated.supplierOrgId, "purchaseOrder:paymentPrepared", { poId, poNumber: updated.poNumber, paymentStatus: updated.paymentStatus, paymentMethod: updated.paymentMethod, totalAmount: updated.totalAmount, delivery: deliveryMetadata, conversationId });
    return updated;
  }

  async beginPayment(poId: string, agentId: string) {
    const transaction = await this.purchaseOrderPayment.createForPurchaseOrder(poId, agentId);
    this.realtime.emitToOrganization(transaction.supplierOrgId!, "purchaseOrder:paymentCreated" as any, {
      poId, paymentTransactionId: transaction.id, status: transaction.status, amount: transaction.amount,
    });
    return transaction;
  }

  async reconcilePayment(transactionId: string, agentId: string) {
    return this.purchaseOrderPayment.reconcilePaymentTransaction(transactionId, agentId);
  }

  async updateDelivery(
    poId: string,
    agentId: string,
    data: {
      scheduledDate?: string;
      driverName?: string | null;
      driverContact?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      address?: string | null;
      notes?: string | null;
      recipientName?: string | null;
      recipientContact?: string | null;
    },
  ): Promise<{ success: boolean; message: string }> {
    logDevCtx("Negotiation", "Updating delivery", { poId, agentId });

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        Delivery: true,
        PurchaseOrderRFQ: {
          where: { rfq: { agentId } },
        },
      },
    });

    if (!po) {
      throw new NotFoundException({ error: "Purchase Order not found" });
    }

    if (po.agentId !== agentId && po.PurchaseOrderRFQ.length === 0) {
      throw new ForbiddenException({ error: "You do not have access to this PO." });
    }

    // Update or create delivery
    if (po.Delivery) {
      await this.prisma.delivery.update({
        where: { id: po.Delivery.id },
        data: {
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : po.Delivery.scheduledDate,
          driverName: data.driverName ?? po.Delivery.driverName,
          driverContact: data.driverContact ?? po.Delivery.driverContact,
          latitude: data.latitude ?? po.Delivery.latitude,
          longitude: data.longitude ?? po.Delivery.longitude,
          address: data.address ?? po.Delivery.address,
          notes: data.notes ?? po.Delivery.notes,
          recipientName: data.recipientName ?? po.Delivery.recipientName,
          recipientContact: data.recipientContact ?? po.Delivery.recipientContact,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.delivery.create({
        data: {
          id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          poId: po.id,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
          driverName: data.driverName ?? undefined,
          driverContact: data.driverContact ?? undefined,
          latitude: data.latitude ?? undefined,
          longitude: data.longitude ?? undefined,
          address: data.address ?? undefined,
          notes: data.notes ?? undefined,
          recipientName: data.recipientName ?? undefined,
          recipientContact: data.recipientContact ?? undefined,
          status: "SCHEDULED",
          updatedAt: new Date(),
        },
      });
    }

    // Emit realtime event to both the supplier and the agent's org
    this.realtime.emitToOrganization(po.supplierOrgId, "purchaseOrder:deliveryUpdated" as any, {
      poId: po.id,
      poNumber: po.poNumber,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
    });

    return { success: true, message: "Delivery details updated successfully." };
  }

  // ============================================
  // List all POs for an agent (via RFQ linkage)
  // ============================================

  async listPOs(agentId: string): Promise<PoListItem[]> {
    logDevCtx("Negotiation", "Listing POs", { agentId });
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { OR: [{ agentId }, { PurchaseOrderRFQ: { some: { rfq: { agentId, deletedAt: null } } } }] },
      include: {
        Organization_PurchaseOrder_supplierOrgIdToOrganization: { select: { id: true, name: true, verificationStatus: true, profilePhoto: true, location: true } },
        Delivery: true,
        POLineItem: { include: { SupplierItem: { select: { id: true, name: true, sku: true, image: true, unit: true } } } },
        PurchaseOrderRFQ: { include: { rfq: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return pos.map((po) => {
      const supplierOrg = po.Organization_PurchaseOrder_supplierOrgIdToOrganization;
      return {
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        source: po.source,
        supplierConfirmation: po.supplierConfirmation,
        supplierConfirmedAt: po.supplierConfirmedAt,
        supplierExpectedDeliveryAt: po.supplierExpectedDeliveryAt,
        supplierNote: po.supplierNote,
        paymentStatus: po.paymentStatus,
        subtotalAmount: po.subtotalAmount,
        extraCharges: normalizeExtraCharges(po.extraCharges),
        extraChargesTotal: po.extraChargesTotal,
        totalAmount: po.totalAmount,
        vatAmount: po.vatAmount,
        requestedDate: po.requestedDate,
        createdAt: po.createdAt,
        updatedAt: po.updatedAt,
        supplier: {
          id: String(supplierOrg.id),
          name: supplierOrg.name,
          verified: supplierOrg.verificationStatus === "VERIFIED",
          location: supplierOrg.location,
          profilePhoto: supplierOrg.profilePhoto,
        },
        delivery: po.Delivery
          ? {
              scheduledDate: po.Delivery.scheduledDate,
              status: po.Delivery.status,
              driverName: po.Delivery.driverName,
              driverContact: po.Delivery.driverContact,
              latitude: po.Delivery.latitude,
              longitude: po.Delivery.longitude,
              address: po.Delivery.address,
            }
          : null,
        rfqs: po.PurchaseOrderRFQ.map(({ rfq }) => ({ id: rfq.id, rfqNumber: rfq.rfqNumber, status: rfq.status })),
        lineItems: po.POLineItem.map((li) => ({
          id: li.id,
          qty: li.qty,
          unitPrice: li.unitPrice,
          subtotal: li.subtotal,
          supplierItem: {
            id: li.SupplierItem.id,
            name: li.SupplierItem.name,
            sku: li.SupplierItem.sku,
            image: li.SupplierItem.image,
            unit: li.SupplierItem.unit,
          },
        })),
      };
    });
  }

  /**
   * Get a single PO by ID, verifying the agent has access via RFQ linkage.
   * Includes conversation, messages, and delivery info.
   */
  async getPO(poId: string, agentId: string, orgId?: number | null): Promise<PoDetail | null> {
    logDevCtx("Negotiation", "Getting PO detail", { poId, agentId });

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        PurchaseOrderRFQ: {
          include: {
            rfq: {
              include: {
                Agent: { select: { id: true, fullname: true, email: true } },
              },
            },
          },
        },
        SupplierOrganizationLink: {
          include: {
            Organization_SupplierOrganizationLink_supplierOrgIdToOrganization: {
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
        Delivery: true,
        POLineItem: {
          include: {
            SupplierItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                image: true,
                unit: true,
                isVatExempt: true,
                vatRate: true,
                PriceTier: {
                  select: { minQty: true, maxQty: true, price: true, currency: true },
                },
              },
            },
          },
        },
        Conversation: {
          include: {
            ConversationParticipant: true,
            ConversationMessage: {
              orderBy: { createdAt: "asc" },
              include: {
                Agent: { select: { id: true, fullname: true, email: true } },
                Organization: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!po) return null;

    // Direct PO ownership is authoritative. RFQ linkage remains a legacy
    // compatibility path for POs created before agentId was populated.
    const agentRfq = po.PurchaseOrderRFQ.find((link) => link.rfq?.agentId === agentId);
    if (po.agentId !== agentId && !agentRfq) return null;

    const supplierOrg = po.SupplierOrganizationLink?.Organization_SupplierOrganizationLink_supplierOrgIdToOrganization
      ?? (await this.prisma.organization.findUnique({ where: { id: po.supplierOrgId }, select: { id: true, name: true, verificationStatus: true, profilePhoto: true, location: true } }));
    const paymentAttempt = await this.prisma.paymentTransaction.findFirst({
      where: { relatedType: 'PURCHASE_ORDER', relatedId: po.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, provider: true, createdAt: true },
    });

    // Mark all notifications for this PO's conversation as read for this agent (best-effort)
    if (po.Conversation?.id) {
      void this.notificationService.markConversationNotificationsRead(po.Conversation.id, agentId, orgId).catch(() => {});
    }

    return {
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      source: po.source,
      supplierConfirmation: po.supplierConfirmation,
      supplierConfirmedAt: po.supplierConfirmedAt,
      supplierExpectedDeliveryAt: po.supplierExpectedDeliveryAt,
      supplierNote: po.supplierNote,
      paymentStatus: po.paymentStatus,
      rejectionReason: po.rejectionReason,
      paymentMethod: po.paymentMethod,
      paymentReference: po.paymentReference,
      paymentPreparedAt: po.paymentPreparedAt,
      notes: po.notes,
      requestedDate: po.requestedDate,
      subtotalAmount: po.subtotalAmount,
      extraCharges: normalizeExtraCharges(po.extraCharges),
      extraChargesTotal: po.extraChargesTotal,
      totalAmount: po.totalAmount,
      vatAmount: po.vatAmount,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      receiptSnapshot: po.receiptSnapshot ? JSON.parse(typeof po.receiptSnapshot === "string" ? po.receiptSnapshot : JSON.stringify(po.receiptSnapshot)) : null,
      paymentAttempt,
      agentId: po.agentId,
      supplier: supplierOrg
        ? {
            id: String(supplierOrg.id),
            name: supplierOrg.name,
            verified: supplierOrg.verificationStatus === "VERIFIED",
            location: supplierOrg.location,
            profilePhoto: supplierOrg.profilePhoto,
          }
        : null,
      rfqs: po.PurchaseOrderRFQ.map(({ rfq }) => ({
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        status: rfq.status,
        agentId: rfq.agentId,
        acceptedPrice: rfq.acceptedPrice,
        acceptedQuantity: rfq.acceptedQuantity,
        acceptedDeliveryDate: rfq.acceptedDeliveryDate,
        notes: rfq.notes,
      })),
      delivery: po.Delivery
        ? {
            id: po.Delivery.id,
            scheduledDate: po.Delivery.scheduledDate,
            deliveredAt: po.Delivery.deliveredAt,
            status: po.Delivery.status,
            driverName: po.Delivery.driverName,
            driverContact: po.Delivery.driverContact,
            latitude: po.Delivery.latitude,
            longitude: po.Delivery.longitude,
            address: po.Delivery.address,
            notes: po.Delivery.notes,
            recipientName: po.Delivery.recipientName,
            recipientContact: po.Delivery.recipientContact,
          }
        : null,
      lineItems: po.POLineItem.map((li) => ({
        id: li.id,
        supplierItemId: li.supplierItemId,
        qty: li.qty,
        unitPrice: li.unitPrice,
        subtotal: li.subtotal,
        itemName: li.SupplierItem?.name || "Unknown Item",
        itemSku: li.SupplierItem?.sku || "",
        itemDescription: li.SupplierItem?.name || "",
        supplierItem: {
          id: li.SupplierItem?.id || "",
          name: li.SupplierItem?.name || "Unknown Item",
          sku: li.SupplierItem?.sku || "",
          image: li.SupplierItem?.image || null,
          unit: li.SupplierItem?.unit || "",
          isVatExempt: li.SupplierItem?.isVatExempt ?? false,
          vatRate: li.SupplierItem?.vatRate ?? 0.12,
        },
      })),
      conversation: po.Conversation
        ? {
            id: po.Conversation.id,
            rfqId: null,
            poId: po.id,
            type: "ORDER",
            createdAt: po.Conversation.createdAt,
            updatedAt: po.Conversation.updatedAt,
            participants: po.Conversation.ConversationParticipant.map((p) => ({
              id: p.id,
              conversationId: p.conversationId,
              agentId: p.agentId,
              organizationId: p.organizationId,
              role: p.role,
              joinedAt: p.joinedAt,
              lastReadAt: p.lastReadAt,
            })),
            messages: po.Conversation.ConversationMessage.map((msg) => ({
              id: msg.id,
              conversationId: msg.conversationId,
              senderId: String(msg.senderAgentId || msg.senderOrgId || ""),
              senderName: msg.Agent?.fullname || msg.Organization?.name || "Unknown",
              senderRole: msg.senderAgentId ? "AGENT" : "SUPPLIER",
              senderAgentId: msg.senderAgentId,
              senderOrgId: msg.senderOrgId,
              message: msg.message,
              type: msg.type || "TEXT",
              metadata: (msg as any).metadata ?? null,
              attachments: msg.attachments ?? [],
              createdAt: msg.createdAt,
            })),
          }
        : null,
    };
  }

  /**
   * Send a message in a PO conversation.
   * Verifies the agent is a participant of the conversation linked to the PO.
   */
  async sendPoMessage(poId: string, agentId: string, data: SendMessageDto): Promise<ConversationMessage> {
    logDevCtx("Negotiation", "Sending PO conversation message", { poId, agentId });

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        Conversation: {
          include: { ConversationParticipant: true },
        },
        PurchaseOrderRFQ: {
          where: { rfq: { agentId } },
        },
      },
    });

    if (!po) {
      throw new NotFoundException({ error: "Purchase Order not found" });
    }

    if (po.agentId !== agentId && po.PurchaseOrderRFQ.length === 0) {
      throw new ForbiddenException({ error: "You do not have access to this PO." });
    }

    if (!po.Conversation) {
      throw new NotFoundException({ error: "PO conversation not found" });
    }

    const isParticipant = po.Conversation.ConversationParticipant.some(
      (p) => p.agentId === agentId,
    );
    if (!isParticipant) {
      throw new ForbiddenException({ error: "You are not a participant in this conversation." });
    }

    // Create the message
    const message = await this.prisma.conversationMessage.create({
      data: {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        conversationId: po.Conversation.id,
        senderAgentId: agentId,
        message: data.message,
        type: "TEXT",
        ...(data.clientMessageId ? { metadata: { clientMessageId: data.clientMessageId } } : {}),
        attachments: data.attachments ?? [],
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: po.Conversation.id },
      data: { updatedAt: new Date() },
    });

    // Resolve agent name for realtime
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { fullname: true, email: true },
    });

    // Emit realtime event
    this.realtime.emitToConversation(po.Conversation.id, "conversation:newMessage" as any, {
      conversationId: po.Conversation.id,
      senderId: agentId,
      senderName: agent?.fullname ?? "Unknown",
      senderRole: "AGENT" as const,
      senderAgentId: agentId,
      senderOrgId: null,
      message: data.message,
      type: "TEXT",
      metadata: data.clientMessageId ? { clientMessageId: data.clientMessageId } : null,
    });

    this.realtime.emitToUser(agentId, "conversation:newMessage" as any, {
      conversationId: po.Conversation.id,
      poId: po.id,
      poNumber: po.poNumber,
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: agentId,
      senderName: agent?.fullname ?? "Unknown",
      senderRole: "AGENT",
      senderAgentId: message.senderAgentId,
      senderOrgId: message.senderOrgId,
      message: message.message,
      type: message.type || "TEXT",
      rfqOfferId: message.rfqOfferId,
      metadata: (message as any).metadata ?? null,
      attachments: message.attachments ?? [],
      createdAt: message.createdAt,
      clientMessageId: message.clientMessageId,
    };
  }

  /**
   * PO Detail type for the agent PO inbox/detail view.
   */

  // ============================================
  // Mapping helpers
  // ============================================

  private mapOffer(offer: any, rfq: any): RfqOfferDetail {
    return {
      id: offer.id,
      rfqId: offer.rfqId,
      senderType:
        offer.senderAgentId !== null && offer.senderAgentId !== undefined
          ? "AGENT"
          : "SUPPLIER",
      senderName:
        offer.senderAgentId !== null && offer.senderAgentId !== undefined
          ? rfq.Agent?.fullname || "Agent"
          : rfq.Organization?.name ||
            rfq.SupplierItem?.SupplierCatalog?.Organization?.name ||
            "Supplier",
      senderAgentId: offer.senderAgentId,
      senderSupplierId: offer.senderSupplierId,
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
  }

  private mapOfferWithRelations(offer: any): RfqOfferDetail {
    const isAgent =
      offer.senderAgentId !== null && offer.senderAgentId !== undefined;
    return {
      id: offer.id,
      rfqId: offer.rfqId,
      senderType: isAgent ? "AGENT" : "SUPPLIER",
      senderName: isAgent
        ? offer.Agent?.fullname || "Agent"
        : offer.Organization?.name || "Supplier",
      senderAgentId: offer.senderAgentId,
      senderSupplierId: offer.senderSupplierId,
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
  }

  private async generatePONumber(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PO-${datePart}-${rand}`;
  }
}
