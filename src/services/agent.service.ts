import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import * as bcrypt from "bcrypt";
import { logDev } from "../lib/logDev";

// ============================================
// Development Logging Helper
// ============================================

// ============================================
<<<<<<< HEAD
// Types
// ============================================
=======
// Dashboard Data for Agent
// ============================================

export type DashboardStats = {
  pendingQuotations: number;
  waitingReplies: number;
  processingOrders: number;
  unreadMessages: number;
  notifications: number;
};

export type ActivityItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
};

export type RfqItem = {
  id: string;
  rfqNumber: string;
  status: string;
  supplierCount?: number;
};

export type TopSupplier = {
  id: string;
  name: string;
  rating: number;
  city: string;
  status: string;
};

export type DashboardResponse = {
  statistics: DashboardStats;
  recentActivity: ActivityItem[];
  rfqs: RfqItem[];
  topSuppliers: TopSupplier[];
};

export type AgentDashboardDto = {
  agentId: string;
  agentName: string;
  statistics: DashboardStats;
  recentActivity: ActivityItem[];
  rfqs: RfqItem[];
  topSuppliers: TopSupplier[];
};
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
export type ProcurementAgentType = "INDEPENDENT" | "ORGANIZATION";
export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "PROFESSIONAL";

export type RegisterAgentDto = {
  // Personal info (Step 1 & 4 combined)
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  address: string;
  city: string;
  province: string;
  zipCode: string;
  civilStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  emergencyContact?: string;
  // Agent type (Step 2)
  agentType: ProcurementAgentType;
  // Invitation (Step 3B) - optional for INDEPENDENT agents
  invitationCode?: string;
  invitationLink?: string;
  // Documents (Step 5)
  documents: Array<{
    type: "GOVERNMENT_ID_FRONT" | "GOVERNMENT_ID_BACK" | "SELFIE_WITH_ID" | "TIN" | "NBI_CLEARANCE" | "POLICE_CLEARANCE" | "OTHER_DOCUMENT";
    fileUrl: string;
    filePath?: string;
  }>;
  // Preferences (Step 6)
  interestedIndustries: string[];
  experienceLevel: ExperienceLevel;
};

export type ValidatedInvitationResponse = {
  valid: boolean;
  invitation?: {
    id: string;
    orgId: number;
    orgName: string;
    orgLogo?: string | null;
    orgAddress?: string | null;
    invitedPositionId?: string | null;
    invitedPositionName?: string | null;
    expiresAt: Date | null;
  };
  error?: string;
};

export type PendingAgentDto = {
  id: string;
  agentType: string;
  status: string;
  email: string;
  phone: string | null;
  fullname: string;
  personalInfo: {
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    zipCode: string | null;
    civilStatus: string | null;
    emergencyContact: string | null;
  };
  preferences: {
    interestedIndustries: string[];
    experienceLevel: string;
  };
  verifications: Array<{
    id: string;
    documentType: string;
    fileUrl: string;
    status: string;
    createdAt: Date;
  }>;
  invitation: {
    id: string;
    orgId: number;
    positionId: string | null;
    positionName: string | null;
    status: string;
    expiresAt: Date | null;
  } | null;
  submittedAt: Date;
};

export type ApproveAgentDto = {
  hrUserId: number;
  rejectionReason?: string;
};

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // STEP 3B: Invitation Validation (does NOT consume)
  // ============================================

  async validateInvitation(codeOrLink: string): Promise<ValidatedInvitationResponse> {
    logDev("Invitation Validation", { codeOrLink });

    const invitation = await this.prisma.procurementInvitation.findFirst({
      where: {
        OR: [{ code: codeOrLink }, { link: codeOrLink }],
      },
    });

    if (!invitation) {
      logDev("Invitation Invalid - Not Found");
      return { valid: false, error: "Invitation not found." };
    }

    logDev("Invitation Found", { orgId: invitation.orgId, positionId: invitation.positionId });

    // Check if already used
    if (invitation.status === "USED") {
      logDev("Invitation Already Used", { status: invitation.status });
      return { valid: false, error: "Invitation has already been used." };
    }

    // Check if expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      logDev("Invitation Expired", { expiresAt: invitation.expiresAt });
      return { valid: false, error: "Invitation has expired." };
    }

    // Check if revoked
    if (invitation.status === "REVOKED" || invitation.revokedAt) {
      logDev("Invitation Revoked", { status: invitation.status, revokedAt: invitation.revokedAt });
      return { valid: false, error: "Invitation has been revoked." };
    }

    logDev("Invitation Validated Successfully");

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        orgId: invitation.orgId,
        orgName: "Unknown Organization", // Will be populated via separate query
        orgLogo: null,
        orgAddress: null,
        invitedPositionId: invitation.positionId,
        invitedPositionName: null,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  // ============================================
  // Get Invitation Details (for display after validation)
  // ============================================

  async getInvitationDetails(invitationId: string) {
    const invitation = await this.prisma.procurementInvitation.findUnique({
      where: { id: invitationId },
      include: {
        Organization: {
          select: { id: true, name: true, profileImg: true, location: true },
        },
        Position: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invitation) {
      return null;
    }

    return {
      id: invitation.id,
      orgId: invitation.orgId,
      orgName: invitation.Organization?.name || "Unknown Organization",
      orgLogo: invitation.Organization?.profileImg,
      orgAddress: invitation.Organization?.location,
      invitedPositionId: invitation.positionId,
      invitedPositionName: invitation.Position?.name,
      expiresAt: invitation.expiresAt,
    };
  }

  // ============================================
  // SINGLE REGISTRATION ENDPOINT (Steps 1-7 in $transaction)
  // ============================================

  async registerAgent(data: RegisterAgentDto) {
    logDev("Registration Started", { email: data.email, agentType: data.agentType });

    return await this.prisma.$transaction(async (tx) => {
      // Validate invitation if organization agent
      let invitation = null;
      if (data.agentType === "ORGANIZATION" && (data.invitationCode || data.invitationLink)) {
        const codeOrLink = data.invitationCode || data.invitationLink!;
        logDev("Validating invitation for organization agent", { codeOrLink });

        invitation = await tx.procurementInvitation.findFirst({
          where: {
            OR: [{ code: codeOrLink }, { link: codeOrLink }],
          },
        });

        if (!invitation) {
          logDev("Invitation Not Found");
          throw new BadRequestException("Invitation not found.");
        }

        // Check invitation validity
        if (invitation.status === "USED") {
          logDev("Invitation Already Used");
          throw new BadRequestException("Invitation has already been used.");
        }

        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
          logDev("Invitation Expired");
          throw new BadRequestException("Invitation has expired.");
        }

        if (invitation.status === "REVOKED" || invitation.revokedAt) {
          logDev("Invitation Revoked");
          throw new BadRequestException("Invitation has been revoked.");
        }

        logDev("Invitation Validated", { orgId: invitation.orgId });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);
      logDev("Password Hashed");

      // Map procurement agent types to AgentType enum
      const agentTypeEnum = data.agentType === "ORGANIZATION" ? "ORG_LINKED" : "STANDALONE";

      // Determine initial status
      const agentStatus = data.agentType === "ORGANIZATION" ? "PENDING_ORGANIZATION_APPROVAL" : "PENDING_VERIFICATION";

      // Create Agent ONLY (no User, no OrganizationMembership)
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      logDev("Creating Agent record", { agentId, agentType: agentTypeEnum, status: agentStatus });

      const agent = await tx.agent.create({
        data: {
          id: agentId,
          email: data.email.trim().toLowerCase(),
          phone: data.mobileNumber,
          passwordHash,
          agentType: agentTypeEnum as any,
          fullname: data.fullName,
          // Personal Info
          birthday: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          address: data.address,
          city: data.city,
          province: data.province,
          zipCode: data.zipCode,
          civilStatus: data.civilStatus || undefined,
          emergencyContact: data.emergencyContact || undefined,
          // Preferences
          interestedIndustries: data.interestedIndustries,
          experienceLevel: data.experienceLevel,
          // Status
          status: agentStatus as any,
        },
      });

      logDev("Agent Created", { agentId: agent.id });

      // Create verification documents using createMany (Step 3)
      if (data.documents.length > 0) {
        logDev("Creating verification documents", { count: data.documents.length });
        await tx.agentVerification.createMany({
          data: data.documents.map((doc) => ({
            id: `verification_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            agentId: agent.id,
            documentType: doc.type as any,
            fileUrl: doc.fileUrl,
            status: "PENDING" as any,
          })),
        });
        logDev("Verification documents created");
      }

      // Consume invitation - mark as USED and track usedByAgentId (Step 4)
      if (invitation) {
        logDev("Consuming invitation", { invitationId: invitation.id, agentId: agent.id });
        await tx.procurementInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "USED" as any,
            updatedAt: new Date(),
            usedByAgentId: agent.id,
            usedAt: new Date(),
          },
        });
        logDev("Invitation marked as USED with usedByAgentId");
      }

      // Skip OrganizationMembership creation - organization has not approved yet
      logDev("Skipping OrganizationMembership creation");

      const registrationStatus = agent.status;
      logDev("Registration Completed", { agentId: agent.id, status: registrationStatus });

      return {
        agentId: agent.id,
        status: registrationStatus,
        message: "Registration submitted successfully",
      };
    });
  }

  // ============================================
  // Get Agent Details (for Portal HR)
  // ============================================

  async getProcurementAgent(agentId: string) {
    logDev("Getting Agent Details", { agentId });

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        AgentVerification: {
          orderBy: { createdAt: "desc" },
        },
        organizationInvitation: {
          include: {
            Position: { select: { id: true, name: true } },
            Organization: { select: { id: true, name: true, profileImg: true, location: true } },
          },
        },
      },
    });

    if (!agent) {
      logDev("Agent Not Found", { agentId });
      return null;
    }

    logDev("Agent Found", { agentId: agent.id, status: agent.status });

    return {
      id: agent.id,
      agentType: agent.agentType,
      status: agent.status,
      email: agent.email,
      phone: agent.phone,
      fullname: agent.fullname,
      personalInfo: {
        dateOfBirth: agent.birthday?.toISOString(),
        gender: agent.gender,
        address: agent.address,
        city: agent.city,
        province: agent.province,
        zipCode: agent.zipCode,
        civilStatus: agent.civilStatus,
        emergencyContact: agent.emergencyContact,
      },
      preferences: {
        interestedIndustries: agent.interestedIndustries as string[],
        experienceLevel: agent.experienceLevel,
      },
      verifications: agent.AgentVerification,
      invitation: agent.organizationInvitation
        ? {
            id: agent.organizationInvitation.id,
            orgId: agent.organizationInvitation.orgId,
            orgName: agent.organizationInvitation.Organization?.name || "Unknown Organization",
            orgLogo: agent.organizationInvitation.Organization?.profileImg,
            orgAddress: agent.organizationInvitation.Organization?.location,
            positionId: agent.organizationInvitation.positionId,
            positionName: agent.organizationInvitation.Position?.name,
            status: agent.organizationInvitation.status,
            expiresAt: agent.organizationInvitation.expiresAt,
          }
        : null,
      submittedAt: agent.createdAt,
    };
  }

  async getAgentVerifications(agentId: string) {
    logDev("Getting Agent Verifications", { agentId });
    return this.prisma.agentVerification.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ============================================
  // Pending Agents Query for HR Workspace
  // ============================================

  async getPendingAgentsByOrg(orgId: number): Promise<PendingAgentDto[]> {
    logDev("Loading pending agents", { orgId });

    const invitations = await this.prisma.procurementInvitation.findMany({
      where: {
        orgId,
        usedByAgentId: { not: null },
        status: "USED",
      },
      include: {
        UsedByAgent: {
          include: {
            AgentVerification: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        Position: { select: { id: true, name: true } },
      },
    });

    logDev("Pending agents loaded", { count: invitations.length });

    const results: PendingAgentDto[] = [];

    for (const invitation of invitations) {
      const agent = invitation.UsedByAgent;
      if (!agent) continue;
      if (agent.status !== "PENDING_ORGANIZATION_APPROVAL") continue;

      results.push({
        id: agent.id,
        agentType: agent.agentType,
        status: agent.status,
        email: agent.email,
        phone: agent.phone,
        fullname: agent.fullname,
        personalInfo: {
          dateOfBirth: agent.birthday?.toISOString() || null,
          gender: agent.gender,
          address: agent.address,
          city: agent.city,
          province: agent.province,
          zipCode: agent.zipCode,
          civilStatus: agent.civilStatus,
          emergencyContact: agent.emergencyContact,
        },
        preferences: {
          interestedIndustries: agent.interestedIndustries as string[],
          experienceLevel: agent.experienceLevel,
        },
        verifications: agent.AgentVerification.map((v) => ({
          id: v.id,
          documentType: v.documentType,
          fileUrl: v.fileUrl,
          status: v.status,
          createdAt: v.createdAt,
        })),
        invitation: {
          id: invitation.id,
          orgId: invitation.orgId,
          positionId: invitation.positionId,
          positionName: invitation.Position?.name || null,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        submittedAt: agent.createdAt,
      });
    }

    return results;
  }

  // ============================================
  // Approve Agent (HR action)
  // ============================================

  async approveAgent(agentId: string, hrUserId: number) {
    logDev("Approving agent", { agentId, hrUserId });

    return await this.prisma.$transaction(async (tx) => {
      // Get agent
      const agent = await tx.agent.findUnique({
        where: { id: agentId },
        include: { organizationInvitation: true },
      });

      if (!agent) {
        throw new BadRequestException("Agent not found.");
      }

      if (agent.status !== "PENDING_ORGANIZATION_APPROVAL") {
        throw new BadRequestException(`Agent is not in PENDING_ORGANIZATION_APPROVAL status. Current status: ${agent.status}`);
      }

      // Get the invitation
      const invitation = agent.organizationInvitation;
      if (!invitation) {
        throw new BadRequestException("Agent has no associated procurement invitation.");
      }

      // Create OrganizationMembership
      logDev("Creating OrganizationMembership", { agentId, orgId: invitation.orgId });
      await tx.organizationMembership.create({
        data: {
          id: `oms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
<<<<<<< HEAD
          userId: 0, // Placeholder - org membership for agent, no user yet
=======
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
          agentId: agent.id,
          orgId: invitation.orgId,
          positionId: invitation.positionId,
          invitedById: hrUserId,
          status: "ACTIVE" as any,
          joinedAt: new Date(),
          updatedAt: new Date(),
        },
      });

<<<<<<< HEAD
      // Update Agent status to ACTIVE and set organizationId
=======
      // Update Agent to ACTIVE, set verificationStatus to APPROVED
      // (the AgentAuthGuard checks verificationStatus, not status)
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
      logDev("Updating Agent to ACTIVE", { agentId });
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          status: "ACTIVE" as any,
<<<<<<< HEAD
=======
          verificationStatus: "APPROVED" as any,
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
          organizationId: invitation.orgId,
          updatedAt: new Date(),
        },
      });

      // Update invitation to ACCEPTED
      logDev("Updating invitation to ACCEPTED", { invitationId: invitation.id });
      await tx.procurementInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED" as any,
          approvedAt: new Date(),
          approvedBy: hrUserId,
          updatedAt: new Date(),
        },
      });

      logDev("Agent approved successfully", { agentId });

      return {
        success: true,
        agentId: agent.id,
        message: "Agent approved successfully",
      };
    });
  }

  // ============================================
  // Reject Agent (HR action)
  // ============================================

  async rejectAgent(agentId: string, hrUserId: number, rejectionReason: string) {
    logDev("Rejecting agent", { agentId, hrUserId, reason: rejectionReason });

    return await this.prisma.$transaction(async (tx) => {
      // Get agent
      const agent = await tx.agent.findUnique({
        where: { id: agentId },
        include: { organizationInvitation: true },
      });

      if (!agent) {
        throw new BadRequestException("Agent not found.");
      }

      if (agent.status !== "PENDING_ORGANIZATION_APPROVAL") {
        throw new BadRequestException(`Agent is not in PENDING_ORGANIZATION_APPROVAL status. Current status: ${agent.status}`);
      }

      // Get the invitation
      const invitation = agent.organizationInvitation;
      if (!invitation) {
        throw new BadRequestException("Agent has no associated procurement invitation.");
      }

      // Update Agent status to REJECTED
      logDev("Updating Agent to REJECTED", { agentId });
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          status: "REJECTED" as any,
          updatedAt: new Date(),
        },
      });

      // Update invitation to REJECTED
      logDev("Updating invitation to REJECTED", { invitationId: invitation.id });
      await tx.procurementInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "REJECTED" as any,
          rejectedBy: hrUserId,
          rejectionReason: rejectionReason,
          updatedAt: new Date(),
        },
      });

      logDev("Agent rejected successfully", { agentId });

      return {
        success: true,
        agentId: agent.id,
        message: "Agent rejected successfully",
      };
    });
  }
<<<<<<< HEAD
=======

  // ============================================
  // Agent Dashboard
  // ============================================
  // Dashboard logic has been moved to DashboardService.
  // See: src/services/dashboard.service.ts
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
}