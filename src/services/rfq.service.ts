// backend service rfq.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { logDev, logDevCtx } from "../lib/logDev";

// ============================================
// DTOs
// ============================================

export type CreateRfqDto = {
  supplierItemId: string;
  quantity: number;
  targetUnitPrice: number;
  expectedDeliveryDate?: string;
  message?: string;
  attachments?: string[];
};

export type UpdateRfqDto = {
  status?: string;
  notes?: string;
  expectedDeliveryDate?: string;
  validityDays?: number;
};

export type RfqSupplier = {
  id: string;
  name: string;
  verified: boolean;
  location?: string;
  rating?: number;
};

export type RfqConversationMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "AGENT" | "SUPPLIER";
  message: string;
  attachments: string[];
  createdAt: Date;
};

export type RfqOfferSummary = {
  id: string;
  offerType: string;
  unitPrice: number;
  quantity: number;
  estimatedLeadDays?: number | null;
  validUntil?: Date | null;
  notes?: string | null;
  status: string;
  senderType: "AGENT" | "SUPPLIER";
  createdAt: Date;
};

export type RfqDetail = {
  id: string;
  rfqNumber: string;
  agentId: string;
  agentName: string;
  supplierOrgId?: number | null;
  supplierOrgName?: string | null;
  supplierItemId?: string | null;
  supplier?: RfqSupplier;
  status: string;
  conversationId?: string | null;
  targetUnitPrice?: number | null;
  quantity?: number | null;
  expectedDeliveryDate?: Date | null;
  notes?: string | null;
  validityDays?: number | null;
  acceptedPrice?: number | null;
  acceptedQuantity?: number | null;
  acceptedDeliveryDate?: Date | null;
  messages: RfqConversationMessage[];
  offers: RfqOfferSummary[];
  createdAt: Date;
  updatedAt: Date;
};

export type RfqListItem = {
  id: string;
  rfqNumber: string;
  supplier: string;
  product: string;
  quantity: number;
  status: string;
  expectedDeliveryDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SupplierProductInfo = {
  name: string;
  sku?: string | null;
  moq?: number | null;
  availableQty?: number | null;
  leadTime?: string | null;
  priceTiers: Array<{
    minQty: number;
    maxQty?: number | null;
    unitPrice: number;
    currency: string;
  }>;
};

export type SupplierRfqDetail = {
  id: string;
  rfqNumber: string;
  supplierOrgId?: number | null;
  buyerOrgName?: string | null;
  supplierItemId?: string | null;
  status: string;
  conversationId?: string | null;
  targetUnitPrice?: number | null;
  quantity?: number | null;
  expectedDeliveryDate?: Date | null;
  notes?: string | null;
  validityDays?: number | null;
  acceptedPrice?: number | null;
  acceptedQuantity?: number | null;
  acceptedDeliveryDate?: Date | null;
  messages: RfqConversationMessage[];
  offers: RfqOfferSummary[];
  product?: SupplierProductInfo | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================
// Service
// ============================================

@Injectable()
export class RfqService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // List RFQs for an agent
  // ============================================

  async listRFQs(
    agentId: string,
    status?: string,
  ): Promise<RfqListItem[]> {
    logDevCtx("RFQ", "List RFQs", { agentId, status });

    const where: any = {
      agentId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const rfqs = await this.prisma.requestForQuotation.findMany({
      where,
      include: {
        SupplierItem: {
          include: {
            SupplierCatalog: {
              include: {
                Organization: {
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
      },
      orderBy: { updatedAt: "desc" },
    });

    return rfqs.map((rfq) => this.mapListItem(rfq));
  }

  // ============================================
  // Get a single RFQ with full detail
  // ============================================

  async getRfq(id: string, agentId: string): Promise<RfqDetail> {
    logDevCtx("RFQ", "Get RFQ", { id, agentId });

    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { id, agentId, deletedAt: null },
      include: {
        SupplierItem: {
          include: {
            SupplierCatalog: {
              include: {
                Organization: {
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
            PriceTier: {
              where: { deletedAt: null },
              orderBy: { minQty: "asc" },
            },
            ProductWholesaleSettings: true,
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
        RfqOffer: {
          orderBy: { createdAt: "asc" },
          include: {
            Agent: { select: { id: true, fullname: true } },
            Organization: { select: { id: true, name: true } },
          },
        },
        Agent: {
          select: { id: true, fullname: true, email: true, organizationId: true },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException({ error: "RFQ not found" });
    }

    return this.mapDetail(rfq);
  }

  // ============================================
  // Create a new RFQ
  // ============================================

  async createRfq(agentId: string, data: CreateRfqDto): Promise<RfqDetail> {
    logDevCtx("RFQ", "Create RFQ", { agentId, supplierItemId: data.supplierItemId, quantity: data.quantity });

    // Look up the SupplierItem with all relations needed to derive RFQ data
    const supplierItem = await this.prisma.supplierItem.findUnique({
      where: { id: data.supplierItemId, deletedAt: null, isActive: true },
      include: {
        SupplierCatalog: {
          include: {
            Organization: {
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
        PriceTier: {
          where: { deletedAt: null },
          orderBy: { minQty: "asc" },
        },
        ProductWholesaleSettings: true,
      },
    });

    if (!supplierItem) {
      throw new NotFoundException({ error: "Supplier item not found" });
    }

    const supplierOrg = supplierItem.SupplierCatalog.Organization;

    // Derive all supplier/product information from the SupplierItem
    // Do NOT trust the frontend to send these values
    const supplierOrgId = supplierOrg.id;
    const supplierOrgName = supplierOrg.name;

    const rfqNumber = `RFQ-${Date.now()}`;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create the RFQ
      const rfq = await tx.requestForQuotation.create({
        data: {
          id: `rfq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          rfqNumber,
          agentId,
          supplierOrgId,
          supplierOrgName,
          supplierItemId: data.supplierItemId,
          status: "SUBMITTED",
          targetUnitPrice: data.targetUnitPrice,
          quantity: String(data.quantity),
          expectedDeliveryDate: data.expectedDeliveryDate
            ? new Date(data.expectedDeliveryDate)
            : undefined,
          notes: data.message,
          validityDays: 30,
        },
        include: {
          SupplierItem: {
            include: {
              SupplierCatalog: {
                include: {
                  Organization: {
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
              PriceTier: {
                where: { deletedAt: null },
                orderBy: { minQty: "asc" },
              },
              ProductWholesaleSettings: true,
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
      });

      // 2. Create the Conversation
      const conversation = await tx.conversation.create({
        data: {
          id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          rfqId: rfq.id,
          type: "RFQ",
        },
      });

      // 3. Link Conversation → RFQ
      await tx.requestForQuotation.update({
        where: { id: rfq.id },
        data: { conversationId: conversation.id },
      });

      // 4. Create ConversationParticipants (Agent + Supplier Organization)
      await tx.conversationParticipant.createMany({
        data: [
          {
            id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_1`,
            conversationId: conversation.id,
            agentId,
            role: "AGENT",
          },
          {
            id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_2`,
            conversationId: conversation.id,
            organizationId: supplierOrgId,
            role: "SUPPLIER",
          },
        ],
      });

      // 5. Create the first ConversationMessage (RFQ_CREATED type)
      const initialMessage = `Hello,\n\nWe are interested in ordering\n\n${data.quantity} units\n\nof\n\n${supplierItem.name}.\n\nTarget Price\n₱${data.targetUnitPrice} / piece.\n\nPlease review our quotation request.\n\nThank you.`;

      await tx.conversationMessage.create({
        data: {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          conversationId: conversation.id,
          senderAgentId: agentId,
          message: initialMessage,
          type: "RFQ_CREATED",
          attachments: data.attachments ?? [],
        },
      });

      // 6. Create the initial RfqOffer (INITIAL_REQUEST) — audit trail of the buyer's request
      await tx.rfqOffer.create({
        data: {
          id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          rfqId: rfq.id,
          senderAgentId: agentId,
          offerType: "INITIAL_REQUEST",
          unitPrice: data.targetUnitPrice,
          quantity: data.quantity,
          notes: data.message,
          validUntil: data.expectedDeliveryDate
            ? new Date(data.expectedDeliveryDate)
            : undefined,
          status: "PENDING",
        },
      });

      // 7. Create Notification for the supplier
      await tx.notification.create({
        data: {
          orgId: supplierOrgId,
          title: "New RFQ Received",
          message: `You have received a new RFQ #${rfqNumber} from ${rfq.Agent?.fullname || "an agent"}.`,
          type: "NEW_TRANSACTION",
        },
      });

      logDevCtx("RFQ", "Created", { rfqId: rfq.id, rfqNumber, conversationId: conversation.id });

      // Re-fetch the full RFQ with conversation to return the complete detail
      const fullRfq = await tx.requestForQuotation.findUnique({
        where: { id: rfq.id },
        include: {
          SupplierItem: {
            include: {
              SupplierCatalog: {
                include: {
                  Organization: {
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
              PriceTier: {
                where: { deletedAt: null },
                orderBy: { minQty: "asc" },
              },
              ProductWholesaleSettings: true,
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
          RfqOffer: {
          orderBy: { createdAt: "asc" },
          include: {
            Agent: { select: { id: true, fullname: true } },
            Organization: { select: { id: true, name: true } },
          },
        },
        Agent: {
          select: { id: true, fullname: true, email: true, organizationId: true },
        },
      },
    });

    return this.mapDetail(fullRfq!);
  });
  }

  // ============================================
  // Update an RFQ
  // ============================================
  async updateRfq(
    id: string,
    agentId: string,
    data: UpdateRfqDto,
  ): Promise<RfqDetail> {
    logDevCtx("RFQ", "Update RFQ", { id, agentId });

    const existing = await this.prisma.requestForQuotation.findFirst({
      where: { id, agentId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({ error: "RFQ not found" });
    }

    const rfq = await this.prisma.requestForQuotation.update({
      where: { id },
      data: {
        status: data.status as any,
        notes: data.notes,
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : undefined,
        validityDays: data.validityDays,
      },
      include: {
        SupplierItem: {
          include: {
            SupplierCatalog: {
              include: {
                Organization: {
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
            PriceTier: {
              where: { deletedAt: null },
              orderBy: { minQty: "asc" },
            },
            ProductWholesaleSettings: true,
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
        RfqOffer: {
          orderBy: { createdAt: "asc" },
          include: {
            Agent: { select: { id: true, fullname: true } },
            Organization: { select: { id: true, name: true } },
          },
        },
        Agent: {
          select: { id: true, fullname: true, email: true, organizationId: true },
        },
      },
    });

    return this.mapDetail(rfq);
  }

  // ============================================
  // Delete (soft-delete) an RFQ
  // ============================================

  async deleteRfq(id: string, agentId: string): Promise<void> {
    logDevCtx("RFQ", "Delete RFQ", { id, agentId });

    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { id, agentId, deletedAt: null },
    });

    if (!rfq) {
      throw new NotFoundException({ error: "RFQ not found" });
    }

    // Only allow deletion of RFQs that haven't reached a terminal state
    const terminalStatuses = [
      "ACCEPTED",
      "REJECTED",
      "NEGOTIATION_ACCEPTED",
      "NEGOTIATION_REJECTED",
      "CANCELLED",
      "EXPIRED",
    ];
    if (terminalStatuses.includes(rfq.status)) {
      throw new BadRequestException({
        error: `Cannot delete RFQ in ${rfq.status} status. Only RFQs in non-terminal states can be deleted.`,
      });
    }

    await this.prisma.requestForQuotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logDevCtx("RFQ", "Deleted", { id });
  }

  // ============================================
  // Generate a Draft Purchase Order from an accepted offer
  // Called by RfqNegotiationService.acceptOffer() within its transaction
  // ============================================

  async generatePurchaseOrder(
    tx: any,
    rfq: any,
    offer: any,
  ): Promise<{ id: string; poNumber: string } | null> {
    logDevCtx("RFQ", "Generating Purchase Order", {
      rfqId: rfq.id,
      offerId: offer.id,
    });

    // Find the buyer agent's organization to get the delivery outlet
    const agent = await tx.agent.findUnique({
      where: { id: rfq.agentId },
      select: { organizationId: true },
    });

    const buyerOrgId = agent?.organizationId;

    // Find approved SupplierOrganizationLink between buyer org and supplier org
    let link: any = null;
    if (rfq.supplierOrgId && buyerOrgId) {
      link = await tx.supplierOrganizationLink.findFirst({
        where: {
          supplierOrgId: rfq.supplierOrgId,
          retailerOrgId: buyerOrgId,
          isApproved: true,
          deletedAt: null,
        },
        include: {
          Outlet: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      });
    }

    // Fallback: find any outlet belonging to the buyer org
    let deliveryOutletId: number | undefined;
    if (link?.Outlet) {
      deliveryOutletId = link.Outlet.id;
    } else if (buyerOrgId) {
      const buyerOutlet = await tx.outlet.findFirst({
        where: { orgId: buyerOrgId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      deliveryOutletId = buyerOutlet?.id;
    }

    if (!deliveryOutletId) {
      logDevCtx("RFQ", "WARNING: No delivery outlet found", { rfqId: rfq.id });
    }

    // Calculate amounts
    const totalAmount = offer.unitPrice * offer.quantity;
    const vatAmount = Math.round(totalAmount * 0.12 * 100) / 100; // 12% VAT, rounded
    const subtotal = Math.round(totalAmount * 100) / 100;

    // Determine scheduled delivery date from the accepted offer or RFQ
    const deliverySource = rfq.acceptedDeliveryDate || rfq.expectedDeliveryDate;
    const scheduledDate = deliverySource
      ? new Date(deliverySource)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default: 7 days from now

    // Generate PO number
    const poNumber = `PO-${Date.now()}`;

    // 1. Create PurchaseOrder
    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        poNumber,
        buyerOrgId: buyerOrgId ?? rfq.supplierOrgId ?? 0,
        supplierOrgId: rfq.supplierOrgId ?? 0,
        status: "PENDING",
        notes: rfq.notes || offer.notes || "Draft PO generated from accepted RFQ offer",
        requestedDate: new Date(),
        totalAmount: subtotal,
        vatAmount,
        deliveryOutletId: deliveryOutletId ?? 0,
        supplierOrganizationLinkId: link?.id || undefined,
      },
    });

    // 2. Create POLineItem
    if (rfq.supplierItemId) {
      await tx.poLineItem.create({
        data: {
          id: `poitem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          poId: purchaseOrder.id,
          supplierItemId: rfq.supplierItemId,
          qty: offer.quantity,
          unitPrice: offer.unitPrice,
          subtotal: Math.round(offer.quantity * offer.unitPrice * 100) / 100,
        },
      });
    }

    // 3. Create Delivery (SCHEDULED)
    await tx.delivery.create({
      data: {
        id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        poId: purchaseOrder.id,
        scheduledDate,
        status: "SCHEDULED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logDevCtx("RFQ", "Purchase Order generated", {
      poId: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      totalAmount,
      vatAmount,
      lineItemCount: rfq.supplierItemId ? 1 : 0,
    });

    return { id: purchaseOrder.id, poNumber: purchaseOrder.poNumber };
  }

  // ============================================
  // Get RfqOffers for an RFQ (delegates to negotiation service pattern)
  // ============================================

  async getRfqOffers(rfqId: string): Promise<RfqOfferSummary[]> {
    logDevCtx("RFQ", "Getting offers", { rfqId });

    const offers = await this.prisma.rfqOffer.findMany({
      where: { rfqId },
      orderBy: { createdAt: "asc" },
      include: {
        Agent: { select: { id: true, fullname: true } },
        Organization: { select: { id: true, name: true } },
      },
    });

    return offers.map((o: any) => ({
      id: o.id,
      offerType: o.offerType,
      unitPrice: o.unitPrice,
      quantity: o.quantity,
      estimatedLeadDays: o.estimatedLeadDays,
      validUntil: o.validUntil,
      notes: o.notes,
      status: o.status,
      senderType:
        o.senderAgentId !== null && o.senderAgentId !== undefined
          ? "AGENT"
          : "SUPPLIER",
      createdAt: o.createdAt,
    }));
  }

  // ============================================
  // Supplier: List RFQs for a supplier organization
  // ============================================

  async listSupplierRfqs(
    supplierOrgId: number,
    status?: string,
  ): Promise<RfqListItem[]> {
    logDevCtx("RFQ", "List supplier RFQs", { supplierOrgId, status });

    const where: any = {
      supplierOrgId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const rfqs = await this.prisma.requestForQuotation.findMany({
      where,
      include: {
        SupplierItem: true,
        Organization: {
          select: { id: true, name: true },
        },
        Agent: {
          select: { id: true, fullname: true, organizationId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return rfqs.map((rfq) => this.mapSupplierListItem(rfq));
  }

  // ============================================
  // Supplier: Get a single RFQ with full detail
  // ============================================

  async getSupplierRfq(id: string, supplierOrgId: number): Promise<SupplierRfqDetail> {
    logDevCtx("RFQ", "Get supplier RFQ", { id, supplierOrgId });

    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: {
        id,
        supplierOrgId,
        deletedAt: null,
      },
      include: {
        SupplierItem: {
          include: {
            PriceTier: {
              where: { deletedAt: null },
              orderBy: { minQty: "asc" },
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
        Agent: {
          select: { id: true, fullname: true, email: true, organizationId: true },
        },
        Conversation: {
          include: {
            ConversationParticipant: true,
            ConversationMessage: {
              orderBy: { createdAt: "asc" },
              include: {
                Agent: { select: { id: true, fullname: true } },
                Organization: { select: { id: true, name: true } },
              },
            },
          },
        },
        RfqOffer: {
          orderBy: { createdAt: "asc" },
          include: {
            Agent: { select: { id: true, fullname: true } },
            Organization: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException({ error: "RFQ not found or access denied" });
    }

    return this.mapSupplierDetail(rfq);
  }

  // ============================================
  // Mapping helpers
  // ============================================

  private mapListItem(rfq: any): RfqListItem {
    const supplierItem = rfq.SupplierItem;
    const org = rfq.Organization;

    const supplierName = org?.name || supplierItem?.SupplierCatalog?.Organization?.name || "Unassigned";
    const productName = supplierItem?.name || "—";
    const quantity = rfq.quantity ? parseFloat(rfq.quantity) : 0;

    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      supplier: supplierName,
      product: productName,
      quantity,
      status: rfq.status,
      expectedDeliveryDate: rfq.expectedDeliveryDate,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
    };
  }

  private mapSupplierListItem(rfq: any): RfqListItem {
    const supplierName = rfq.Organization?.name || "Unknown Buyer";
    const productName = rfq.SupplierItem?.name || "—";
    const quantity = rfq.quantity ? parseFloat(rfq.quantity) : 0;

    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      supplier: supplierName, // This is actually the buyer org name
      product: productName,
      quantity,
      status: rfq.status,
      expectedDeliveryDate: rfq.expectedDeliveryDate,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
    };
  }

  private mapSupplierDetail(rfq: any): SupplierRfqDetail {
    const buyerOrg = rfq.Organization ||
      (rfq.Agent?.organizationId
        ? { name: "Unknown" }
        : null);

    const supplierItem = rfq.SupplierItem;

    const offers: RfqOfferSummary[] = (rfq.RfqOffer || []).map((o: any) => ({
      id: o.id,
      offerType: o.offerType,
      unitPrice: o.unitPrice,
      quantity: o.quantity,
      estimatedLeadDays: o.estimatedLeadDays,
      validUntil: o.validUntil,
      notes: o.notes,
      status: o.status,
      senderType:
        o.senderAgentId !== null && o.senderAgentId !== undefined
          ? "AGENT"
          : "SUPPLIER",
      createdAt: o.createdAt,
    }));

    const messages: RfqConversationMessage[] = rfq.Conversation?.ConversationMessage
      ? rfq.Conversation.ConversationMessage.map((msg: any) => {
          const senderId = msg.senderAgentId || msg.senderOrgId;
          const senderName = msg.Agent?.fullname || msg.Organization?.name || "Unknown";
          const senderRole = msg.senderAgentId ? "AGENT" : "SUPPLIER";
          return {
            id: msg.id,
            senderId: String(senderId),
            senderName,
            senderRole,
            message: msg.message,
            attachments: msg.attachments ?? [],
            createdAt: msg.createdAt,
          };
        })
      : [];

    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      supplierOrgId: rfq.supplierOrgId,
      buyerOrgName: buyerOrg?.name || rfq.supplierOrgName || "Unknown",
      supplierItemId: rfq.supplierItemId,
      status: rfq.status,
      conversationId: rfq.conversationId,
      targetUnitPrice: rfq.targetUnitPrice,
      quantity: rfq.quantity ? parseFloat(rfq.quantity) : null,
      expectedDeliveryDate: rfq.expectedDeliveryDate,
      notes: rfq.notes,
      validityDays: rfq.validityDays,
      acceptedPrice: rfq.acceptedPrice,
      acceptedQuantity: rfq.acceptedQuantity,
      acceptedDeliveryDate: rfq.acceptedDeliveryDate,
      messages,
      offers,
      product: supplierItem
        ? {
            name: supplierItem.name,
            sku: supplierItem.sku,
            moq: supplierItem.moq,
            availableQty: supplierItem.availableQty,
            leadTime: supplierItem.leadTime,
            priceTiers: (supplierItem.PriceTier || []).map((t: any) => ({
              minQty: t.minQty,
              maxQty: t.maxQty,
              unitPrice: t.price,
              currency: t.currency,
            })),
          }
        : null,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
    };
  }

  private mapDetail(rfq: any): RfqDetail {
    const supplierItem = rfq.SupplierItem;
    const org = rfq.Organization || supplierItem?.SupplierCatalog?.Organization;

    const supplier: RfqSupplier | undefined = org
      ? {
          id: String(org.id),
          name: org.name,
          verified: org.verificationStatus === "VERIFIED",
          location: org.location,
        }
      : undefined;

    const messages: RfqConversationMessage[] = rfq.Conversation?.ConversationMessage
      ? rfq.Conversation.ConversationMessage.map((msg: any) => {
          const senderId = msg.senderAgentId || msg.senderOrgId;
          const senderName = msg.Agent?.fullname || msg.Organization?.name || "Unknown";
          const senderRole = msg.senderAgentId ? "AGENT" : "SUPPLIER";
          return {
            id: msg.id,
            senderId: String(senderId),
            senderName,
            senderRole,
            message: msg.message,
            attachments: msg.attachments ?? [],
            createdAt: msg.createdAt,
          };
        })
      : [];

    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      agentId: rfq.agentId,
      agentName: rfq.Agent?.fullname || rfq.Agent?.email || "Unknown",
      supplierOrgId: rfq.supplierOrgId,
      supplierOrgName: rfq.supplierOrgName,
      supplierItemId: rfq.supplierItemId,
      supplier,
      status: rfq.status,
      conversationId: rfq.conversationId,
      targetUnitPrice: rfq.targetUnitPrice,
      quantity: rfq.quantity ? parseFloat(rfq.quantity) : null,
      expectedDeliveryDate: rfq.expectedDeliveryDate,
      notes: rfq.notes,
      validityDays: rfq.validityDays,
      acceptedPrice: rfq.acceptedPrice,
      acceptedQuantity: rfq.acceptedQuantity,
      acceptedDeliveryDate: rfq.acceptedDeliveryDate,
      messages,
      offers: this.mapOffers(rfq.RfqOffer),
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
    };
  }

  private mapOffers(offers: any[] | undefined): RfqOfferSummary[] {
    if (!offers) return [];
    return offers.map((o) => ({
      id: o.id,
      offerType: o.offerType,
      unitPrice: o.unitPrice,
      quantity: o.quantity,
      estimatedLeadDays: o.estimatedLeadDays,
      validUntil: o.validUntil,
      notes: o.notes,
      status: o.status,
      senderType:
        o.senderAgentId !== null && o.senderAgentId !== undefined
          ? "AGENT"
          : "SUPPLIER",
      createdAt: o.createdAt,
    }));
  }
}
