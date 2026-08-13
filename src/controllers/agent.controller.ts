import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards, Req, Query, Delete, Put } from "@nestjs/common";
import { AgentService, RegisterAgentDto, ApproveAgentDto } from "../services/agent.service";
import { DashboardService } from "../services/dashboard.service";
import { RfqService, CreateRfqDto, UpdateRfqDto } from "../services/rfq.service";
import { ConversationService, SendMessageDto, SendOfferDto, AcceptOfferDto, RejectOfferDto } from "../services/conversation.service";
import { RfqNegotiationService, ConsolidatePoDto } from "../services/rfqNegotiation.service";
import { AgentAuthGuard } from "../guards/agent-auth.guard";

@Controller("agent")
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly dashboardService: DashboardService,
    private readonly rfqService: RfqService,
    private readonly conversationService: ConversationService,
    private readonly negotiationService: RfqNegotiationService,
  ) {}

  // ============================================
  // SINGLE REGISTRATION ENDPOINT (Steps 1-7)
  // ============================================

  /**
   * Register procurement agent
   * POST /agent/register
   * Complete registration including user info, personal info, documents, and preferences
   */
  @Post("register")
  async registerAgent(@Body() data: RegisterAgentDto) {
    const result = await this.agentService.registerAgent(data);
    return {
      success: true,
      data: result,
      message: "Registration submitted successfully",
    };
  }

  // ============================================
  // STEP 3B: Invitation Validation
  // ============================================

  /**
   * Validate organization invitation (does NOT consume)
   * POST /agent/invitation/validate
   * Body: { code?: string, link?: string }
   */
  @Post("invitation/validate")
  async validateInvitation(@Body() data: { code?: string; link?: string }) {
    const result = await this.agentService.validateInvitation(data.code || data.link || "");
    if (!result.valid) {
      return {
        success: false,
        error: result.error,
      };
    }
    return {
      success: true,
      data: result.invitation,
      message: "Invitation validated successfully",
    };
  }

  // ============================================
  // Agent Dashboard
  // ============================================

  /**
    * Get agent wholesale dashboard
    * GET /agent/dashboard
    */
   @Get("dashboard")
   @UseGuards(AgentAuthGuard)
   async getDashboard(@Req() req: any) {
     const agentId = req?.agent?.id;
     console.log("[Agent ID] = ",agentId)
     if (process.env.NODE_ENV === "development") {
       console.log("[Agent Dashboard] Fetching dashboard", agentId);
     }
     const result = await this.dashboardService.getDashboard(agentId);
     if (process.env.NODE_ENV === "development") {
       console.log("[Agent Dashboard] Response counts", {
         activities: result.recentActivity.length,
         orders: result.recentOrders.length,
         rfqs: result.recentRFQs.length,
       });
     }
     return {
       success: true,
       data: result,
     };
   }

  // ============================================
  // RFQ Endpoints
  // ============================================

  /**
   * List RFQs for the authenticated agent
   * GET /agent/rfqs?status=SUBMITTED
   */
  @Get("rfqs")
  @UseGuards(AgentAuthGuard)
  async listRFQs(@Req() req: any, @Query("status") status?: string) {
    const agentId = req.agent.id;
    const result = await this.rfqService.listRFQs(agentId, status);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get a single RFQ by ID
   * GET /agent/rfqs/:id
   */
  @Get("rfqs/:id")
  @UseGuards(AgentAuthGuard)
  async getRfq(@Req() req: any, @Param("id") id: string) {
    const agentId = req.agent.id;
    const result = await this.rfqService.getRfq(id, agentId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Create a new RFQ
   * POST /agent/rfqs
   */
  @Post("rfqs")
  @UseGuards(AgentAuthGuard)
  async createRfq(@Req() req: any, @Body() data: CreateRfqDto) {
    const agentId = req.agent.id;
    const result = await this.rfqService.createRfq(agentId, data);
    return {
      success: true,
      data: result,
      message: "RFQ created successfully",
    };
  }

  /**
   * Update an RFQ
   * PUT /agent/rfqs/:id
   */
  @Put("rfqs/:id")
  @UseGuards(AgentAuthGuard)
  async updateRfq(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data: UpdateRfqDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.rfqService.updateRfq(id, agentId, data);
    return {
      success: true,
      data: result,
      message: "RFQ updated successfully",
    };
  }

  /**
   * Delete (soft-delete) an RFQ
   * DELETE /agent/rfqs/:id
   */
  @Delete("rfqs/:id")
  @UseGuards(AgentAuthGuard)
  async deleteRfq(@Req() req: any, @Param("id") id: string) {
    const agentId = req.agent.id;
    await this.rfqService.deleteRfq(id, agentId);
    return {
      success: true,
      message: "RFQ deleted successfully",
    };
  }

  // ============================================
  // RFQ Negotiation Endpoints (RFQ-scoped)
  // ============================================

  /**
   * GET /agent/rfqs/:id/offers
   * List all negotiation offers for an RFQ
   */
  @Get("rfqs/:id/offers")
  @UseGuards(AgentAuthGuard)
  async getRfqOffers(@Req() req: any, @Param("id") id: string) {
    const agentId = req.agent.id;
    const offers = await this.negotiationService.getNegotiationHistory(
      id,
      agentId,
    );
    return {
      success: true,
      data: offers,
    };
  }

  /**
   * POST /agent/rfqs/:id/counter-offer
   * Agent sends a counter offer
   */
  @Post("rfqs/:id/counter-offer")
  @UseGuards(AgentAuthGuard)
  async sendCounterOffer(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data: SendOfferDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.negotiationService.sendCounterOffer(
      id,
      {
        senderType: "AGENT",
        senderAgentId: agentId,
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
   * POST /agent/rfqs/:id/accept-offer
   * Agent accepts the final offer → triggers automatic PO generation
   */
  @Post("rfqs/:id/accept-offer")
  @UseGuards(AgentAuthGuard)
  async acceptRfqOffer(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data?: AcceptOfferDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.negotiationService.acceptOffer(id, agentId, data);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  /**
   * POST /agent/rfqs/:id/reject-offer
   * Agent rejects an offer
   */
  @Post("rfqs/:id/reject-offer")
  @UseGuards(AgentAuthGuard)
  async rejectRfqOffer(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data?: RejectOfferDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.negotiationService.rejectOffer(
      id,
      {
        senderType: "AGENT",
        senderAgentId: agentId,
      },
      data,
    );
    return {
      success: true,
      data: result,
      message: "Offer rejected successfully",
    };
  }

  /**
   * POST /agent/po/consolidate
   * Create a consolidated purchase order from multiple RFQs
   */
  @Post("po/consolidate")
  @UseGuards(AgentAuthGuard)
  async createConsolidatedPO(
    @Req() req: any,
    @Body() data: ConsolidatePoDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.negotiationService.createConsolidatedPurchaseOrder(agentId, data);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  // ============================================
  // Conversation Endpoints
  // ============================================

  /**
   * List all conversations for the authenticated agent
   * GET /agent/conversations
   */
  @Get("conversations")
  @UseGuards(AgentAuthGuard)
  async listConversations(@Req() req: any) {
    const agentId = req.agent.id;
    const result = await this.conversationService.listConversations(agentId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get unread message count
   * GET /agent/conversations/unread-count
   */
  @Get("conversations/unread-count")
  @UseGuards(AgentAuthGuard)
  async getUnreadCount(@Req() req: any) {
    const agentId = req.agent.id;
    const count = await this.conversationService.getUnreadCount(agentId);
    return {
      success: true,
      data: { count },
    };
  }

  /**
   * Get a single conversation with full detail
   * GET /agent/conversations/:conversationId
   */
  @Get("conversations/:conversationId")
  @UseGuards(AgentAuthGuard)
  async getConversation(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
  ) {
    const agentId = req.agent.id;
    const result = await this.conversationService.getConversation(
      conversationId,
      agentId,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Send a message in a conversation
   * POST /agent/conversations/:conversationId/messages
   */
  @Post("conversations/:conversationId/messages")
  @UseGuards(AgentAuthGuard)
  async sendMessage(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
    @Body() data: SendMessageDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.conversationService.sendMessage(
      conversationId,
      agentId,
      data,
    );
    return {
      success: true,
      data: result,
      message: "Message sent successfully",
    };
  }

  /**
   * Send an offer (counter-offer) in a conversation
   * POST /agent/conversations/:conversationId/offer
   */
  @Post("conversations/:conversationId/offer")
  @UseGuards(AgentAuthGuard)
  async sendOffer(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
    @Body() data: SendOfferDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.conversationService.sendOffer(
      conversationId,
      agentId,
      data,
    );
    return {
      success: true,
      data: result,
      message: "Offer sent successfully",
    };
  }

  /**
   * Accept an offer
   * POST /agent/conversations/:conversationId/accept-offer
   */
  @Post("conversations/:conversationId/accept-offer")
  @UseGuards(AgentAuthGuard)
  async acceptOffer(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
    @Body() data?: AcceptOfferDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.conversationService.acceptOffer(
      conversationId,
      agentId,
      data,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Reject an offer
   * POST /agent/conversations/:conversationId/reject-offer
   */
  @Post("conversations/:conversationId/reject-offer")
  @UseGuards(AgentAuthGuard)
  async rejectOffer(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
    @Body() data?: RejectOfferDto,
  ) {
    const agentId = req.agent.id;
    const result = await this.conversationService.rejectOffer(
      conversationId,
      agentId,
      data,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Mark conversation as read
   * POST /agent/conversations/:conversationId/read
   */
  @Post("conversations/:conversationId/read")
  @UseGuards(AgentAuthGuard)
  async markConversationRead(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
  ) {
    const agentId = req.agent.id;
    const result = await this.conversationService.markConversationRead(
      conversationId,
      agentId,
    );
    return {
      success: true,
      data: result,
    };
  }

  // ============================================
  // Get Agent Details
  // ============================================

  /**
   * Get procurement agent details
   * GET /agent/:agentId
   */
  @Get(":agentId")
  async getAgent(@Param("agentId") agentId: string) {
    const agent = await this.agentService.getProcurementAgent(agentId);
    if (!agent) {
      return {
        success: false,
        error: "Agent not found",
      };
    }
    return {
      success: true,
      data: agent,
    };
  }

  /**
   * Get agent documents
   * GET /agent/:agentId/documents
   */
  @Get(":agentId/documents")
  async getDocuments(@Param("agentId") agentId: string) {
    const documents = await this.agentService.getAgentVerifications(agentId);
    return {
      success: true,
      data: documents,
    };
  }

  // ============================================
  // Pending Agents Query (for Portal HR Workspace)
  // ============================================

  /**
   * Get pending agents for an organization
   * GET /agent/pending/:orgId
   */
  @Get("pending/:orgId")
  async getPendingAgents(@Param("orgId", ParseIntPipe) orgId: number) {
    const agents = await this.agentService.getPendingAgentsByOrg(orgId);
    return {
      success: true,
      data: agents,
      message: "Pending agents loaded successfully",
    };
  }

  // ============================================
  // Approve Agent (HR action)
  // ============================================

  /**
   * Approve a pending procurement agent
   * POST /agent/:agentId/approve
   * Body: { hrUserId: number }
   */
  @Post(":agentId/approve")
  async approveAgent(
    @Param("agentId") agentId: string,
    @Body() data: ApproveAgentDto
  ) {
    const result = await this.agentService.approveAgent(agentId, data.hrUserId);
    return {
      success: true,
      data: result,
      message: "Agent approved successfully",
    };
  }

  // ============================================
  // Reject Agent (HR action)
  // ============================================

  /**
   * Reject a pending procurement agent
   * POST /agent/:agentId/reject
   * Body: { hrUserId: number, rejectionReason: string }
   */
  @Post(":agentId/reject")
  async rejectAgent(
    @Param("agentId") agentId: string,
    @Body() data: { hrUserId: number; rejectionReason: string }
  ) {
    const result = await this.agentService.rejectAgent(agentId, data.hrUserId, data.rejectionReason);
    return {
      success: true,
      data: result,
      message: "Agent rejected successfully",
    };
  }
}