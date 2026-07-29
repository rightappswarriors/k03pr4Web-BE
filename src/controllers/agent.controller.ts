import { Controller, Post, Body, Get, Param, ParseIntPipe } from "@nestjs/common";
import { AgentService, RegisterAgentDto, ApproveAgentDto } from "../services/agent.service";

@Controller("agent")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

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