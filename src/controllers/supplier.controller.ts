import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SupplierAuthGuard } from "../guards/supplier-auth.guard";
import { RfqService, UpdateRfqDto } from "../services/rfq.service";
import {
  RfqNegotiationService,
  SendOfferDto,
  RejectOfferDto,
} from "../services/rfqNegotiation.service";
import { DashboardService } from "../services/dashboard.service";
import { logDevCtx } from "../lib/logDev";

@Controller("supplier")
export class SupplierController {
  constructor(
    private readonly rfqService: RfqService,
    private readonly negotiationService: RfqNegotiationService,
    private readonly dashboardService: DashboardService,
  ) {}

  // ============================================
  // Supplier Dashboard
  // ============================================

  /**
   * GET /supplier/dashboard
   * Returns dashboard stats and recent activity for the supplier org
   */
  @Get("dashboard")
  @UseGuards(SupplierAuthGuard)
  async getDashboard(@Req() req: any) {
    const orgId = req.supplier.orgId;
    logDevCtx("SupplierDashboard", "Fetching dashboard", { orgId });
    const result = await this.dashboardService.getDashboard(orgId);
    return {
      success: true,
      data: result,
    };
  }

  // ============================================
  // Supplier RFQ Endpoints
  // ============================================

  /**
   * GET /supplier/rfqs
   * List all RFQs where this org is the supplier
   */
  @Get("rfqs")
  @UseGuards(SupplierAuthGuard)
  async listRFQs(@Req() req: any, @Query("status") status?: string) {
    const orgId = req.supplier.orgId;
    const result = await this.rfqService.listSupplierRfqs(orgId, status);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /supplier/rfqs/:id
   * Get a single RFQ from the supplier's perspective
   */
  @Get("rfqs/:id")
  @UseGuards(SupplierAuthGuard)
  async getRfq(@Req() req: any, @Param("id") id: string) {
    const orgId = req.supplier.orgId;
    const result = await this.rfqService.getSupplierRfq(id, orgId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /supplier/rfqs/:id/offers
   * List all negotiation offers for an RFQ
   */
  @Get("rfqs/:id/offers")
  @UseGuards(SupplierAuthGuard)
  async getOffers(@Req() req: any, @Param("id") id: string) {
    const orgId = req.supplier.orgId;
    const offers = await this.negotiationService.getNegotiationHistory(id, orgId);
    return {
      success: true,
      data: offers,
    };
  }

  /**
   * POST /supplier/rfqs/:id/counter-offer
   * Supplier sends a counter offer to the agent
   */
  @Post("rfqs/:id/counter-offer")
  @UseGuards(SupplierAuthGuard)
  async sendCounterOffer(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data: SendOfferDto,
  ) {
    const orgId = req.supplier.orgId;
    const result = await this.negotiationService.sendCounterOffer(
      id,
      {
        senderType: "SUPPLIER",
        senderSupplierId: orgId,
      },
      data,
    );
    return {
      success: true,
      data: result,
      message: "Counter offer sent successfully",
    };
  }

  /**
   * POST /supplier/rfqs/:id/final-offer
   * Supplier sends their final/best offer
   */
  @Post("rfqs/:id/final-offer")
  @UseGuards(SupplierAuthGuard)
  async sendFinalOffer(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data: SendOfferDto,
  ) {
    const orgId = req.supplier.orgId;
    const result = await this.negotiationService.sendFinalOffer(
      id,
      orgId,
      data,
    );
    return {
      success: true,
      data: result,
      message: "Final offer sent successfully",
    };
  }

  /**
   * POST /supplier/rfqs/:id/reject
   * Supplier rejects the RFQ
   */
  @Post("rfqs/:id/reject")
  @UseGuards(SupplierAuthGuard)
  async rejectRfq(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data?: RejectOfferDto,
  ) {
    const orgId = req.supplier.orgId;
    const result = await this.negotiationService.rejectOffer(
      id,
      {
        senderType: "SUPPLIER",
        senderSupplierId: orgId,
      },
      data,
    );
    return {
      success: true,
      data: result,
      message: "RFQ rejected successfully",
    };
  }
}
