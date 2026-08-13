import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { RfqService } from "./rfq.service";
import { logDevCtx } from "../lib/logDev";
import { RealtimeGateway } from "../gateway/realtime.gateway";

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

export type ConsolidatePoResult = {
  success: boolean;
  message: string;
  purchaseOrder: { id: string; poNumber: string };
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
          title: notifTitle,
          message: notifMessage,
          type: "NEW_TRANSACTION",
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
          title: "Final Offer Sent",
          message: `Supplier sent a final offer for RFQ #${rfq.rfqNumber}.`,
          type: "NEW_TRANSACTION",
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
          title: "Offer Rejected",
          message: `The ${senderLabel} rejected your offer for RFQ #${rfq.rfqNumber}.${reason ? ` Reason: ${reason}` : ""}`,
          type: "NEW_TRANSACTION",
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
          select: { id: true, name: true, isVatExempt: true, vatRate: true },
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

    const result = await this.prisma.$transaction(async (tx) => {
      const poNumber = await this.generatePONumber();

      // Calculate totals from all RFQ line items
      let totalAmount = 0;
      let totalVat = 0;

      const poLineItems = rfqs.map((rfq) => {
        const acceptedPrice = rfq.acceptedPrice ?? rfq.targetUnitPrice ?? 0;
        const acceptedQty = rfq.acceptedQuantity ?? Number(rfq.quantity ?? "0");
        const subtotal = acceptedPrice * acceptedQty;
        const isVatExempt = rfq.SupplierItem?.isVatExempt ?? false;
        const vatRate = rfq.SupplierItem?.vatRate ?? 0.12;
        const vatAmount = isVatExempt ? 0 : subtotal * vatRate;

        totalAmount += subtotal + vatAmount;
        totalVat += vatAmount;

        return {
          supplierItemId: rfq.supplierItemId!,
          qty: Math.ceil(acceptedQty),
          unitPrice: acceptedPrice,
          subtotal,
        };
      });

      const buyerOrgId = rfqs[0].Agent?.organizationId ?? 0;
      const buyerOutlet = await tx.outlet.findFirst({
        where: { orgId: buyerOrgId, isActive: true },
        select: { id: true },
      });
      const deliveryOutletId = buyerOutlet?.id ?? 0;

      // Create PurchaseOrder
      const po = await tx.purchaseOrder.create({
        data: {
          id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          poNumber,
          buyerOrgId,
          supplierOrgId,
          status: "PENDING",
          notes: data.notes ?? undefined,
          requestedDate: new Date(),
          totalAmount,
          vatAmount: totalVat,
          deliveryOutletId,
          updatedAt: new Date(),
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
        totalAmount,
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

      return { po };
    });

    // Notification DB record + realtime emits happen after transaction commits (FIX #1, #7)
    void this.prisma.notification.create({
      data: {
        orgId: supplierOrgId,
        title: "Consolidated PO Created",
        message: `A consolidated PO (${result.po.poNumber}) was created from ${rfqs.length} RFQs.`,
        type: "PURCHASE_ORDER_CREATED",
        isRead: false,
      },
    });

    // Emit realtime events
    this.realtime.emitToOrganization(supplierOrgId, "purchaseOrder:created" as any, {
      poId: result.po.id,
      poNumber: result.po.poNumber,
      rfqIds: data.rfqIds,
      totalAmount: result.po.totalAmount,
      vatAmount: result.po.vatAmount,
      deliveryDate: data.deliveryDate,
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
      rfqIds: data.rfqIds,
    };
  }

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