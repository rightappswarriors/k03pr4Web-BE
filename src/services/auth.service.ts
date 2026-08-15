import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import * as crypto from "node:crypto";
import * as jwt from "jsonwebtoken";
import { DatabaseService } from "./database.service";
import * as bcrypt from "bcrypt";
import { PrismaService } from './prisma.service'

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  contact_number: string;
  gender: string | null;
  date_of_birth: string | null;
  role: string;
  is_verified: boolean;
  profile_image: string | null;
  password: string;
};

export type AgentAuthPayload = {
  agentId: string;
  organizationId: number | null;
  verificationStatus: string;
  agentType: string;
  email: string;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret =
    process.env.JWT_SECRET || process.env.SECRET_KEY || "kompra-local-dev-key";

  /** Access token lifetime: 15 minutes (in seconds) */
  readonly AGENT_ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 900
  readonly AGENT_REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 604800

  constructor(
    private readonly db: DatabaseService,
    private readonly prisma: PrismaService
  ) {}

  normalizeEmail(email?: string) {
    return (email || "").trim().toLowerCase();
  }

  makePassword(password: string) {
    const iterations = 1_000_000;
    const salt = crypto.randomBytes(9).toString("base64url");
    const hash = crypto
      .pbkdf2Sync(password, salt, iterations, 32, "sha256")
      .toString("base64");
    return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
  }

  checkPassword(password: string, encoded?: string | null) {
    if (!encoded) return false;

    const [algorithm, iterationsRaw, salt, hash] = encoded.split("$");
    if (!iterationsRaw || !salt || !hash) {
      return false;
    }

    const iterations = Number(iterationsRaw);
    const digest = algorithm === "pbkdf2_sha1" ? "sha1" : "sha256";
    if (!Number.isInteger(iterations) || !["pbkdf2_sha256", "pbkdf2_sha1"].includes(algorithm)) {
      return false;
    }

    const candidate = crypto
      .pbkdf2Sync(password, salt, iterations, digest === "sha1" ? 20 : 32, digest)
      .toString("base64");

    return this.safeCompare(candidate, hash) || this.safeCompare(candidate.replace(/=+$/g, ""), hash);
  }

  private safeCompare(candidate: string, stored: string) {
    const candidateBuffer = Buffer.from(candidate);
    const storedBuffer = Buffer.from(stored);
    if (candidateBuffer.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
  }

  createTokens(user: Pick<AuthUser, "id" | "email">) {
    const access = jwt.sign(
      { user_id: user.id, email: user.email, token_type: "access" },
      this.jwtSecret,
      { expiresIn: "1d" }
    );
    const refresh = jwt.sign(
      { user_id: user.id, email: user.email, token_type: "refresh" },
      this.jwtSecret,
      { expiresIn: "7d" }
    );
    return { access, refresh };
  }

  verifyAccessToken(token?: string) {
    if (!token) return null;
    try {
      const payload = jwt.verify(token, this.jwtSecret) as {
        user_id?: number;
        token_type?: string;
      };
      if (payload.token_type !== "access" || !payload.user_id) return null;
      return payload;
    } catch {
      return null;
    }
  }

  serializeUser(user: AuthUser) {
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      contact_number: user.contact_number,
      gender: user.gender,
      date_of_birth: user.date_of_birth,
      role: user.role,
      is_verified: user.is_verified,
      profile_image: user.profile_image,
    };
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.db.query<AuthUser>(
      `
      SELECT id, email, full_name, contact_number, gender, date_of_birth,
             role, is_verified, profile_image, password
      FROM api_user
      WHERE lower(email) = lower($1)
      LIMIT 1
      `,
      [email]
    );
    return result.rows[0] || null;
  }

  async findUserById(id: number): Promise<AuthUser | null> {
    const result = await this.db.query<AuthUser>(
      `
      SELECT id, email, full_name, contact_number, gender, date_of_birth,
             role, is_verified, profile_image, password
      FROM api_user
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    return result.rows[0] || null;
  }

  async authenticate(email: string, password: string): Promise<AuthUser | null> {
    const normalizedEmail = this.normalizeEmail(email);
    let user: AuthUser | null = await this.findUserByEmail(normalizedEmail);

    if (user && this.checkPassword(password, user.password)) {
      return user;
    }

    user = await this.syncExistingCustomer(normalizedEmail, password);
    if (user && this.checkPassword(password, user.password)) {
      return user;
    }

    return null;
  }

  async syncExistingCustomer(email: string, password: string): Promise<AuthUser | null> {
    const customerResult = await this.db.query<{
      fullname: string;
      email: string;
      passwordhash: string;
      phone: string | null;
      isverified: boolean;
      isactive: boolean;
    }>(
      `
      SELECT fullname, email, "passwordHash" AS passwordhash, phone,
             "isVerified" AS isverified, "isActive" AS isactive
      FROM "KompraCustomer"
      WHERE lower(email) = lower($1) AND "isActive" = true
      LIMIT 1
      `,
      [email]
    );

    const customer = customerResult.rows[0];
    if (!customer || !this.checkPassword(password, customer.passwordhash)) {
      return null;
    }

    const phone = (customer.phone || "00000000000").slice(0, 11);
    const existing = await this.findUserByEmail(email);

    if (existing) {
      await this.db.query(
        `
        UPDATE api_user
        SET password = $1,
            is_verified = (is_verified OR $2),
            full_name = COALESCE(NULLIF(full_name, ''), $3),
            contact_number = COALESCE(NULLIF(contact_number, ''), $4)
        WHERE id = $5
        `,
        [customer.passwordhash, customer.isverified, customer.fullname || email, phone, existing.id]
      );
      return this.findUserById(existing.id);
    }

    const inserted = await this.db.query<AuthUser>(
      `
      INSERT INTO api_user (
        password, is_superuser, first_name, last_name, is_staff, is_active,
        date_joined, email, full_name, contact_number, role, is_verified
      )
      VALUES ($1, false, '', '', false, true, NOW(), $2, $3, $4, 'CUSTOMER', $5)
      RETURNING id, email, full_name, contact_number, gender, date_of_birth,
                role, is_verified, profile_image, password
      `,
      [
        customer.passwordhash,
        email,
        customer.fullname || email,
        phone,
        customer.isverified,
      ]
    );

    return inserted.rows[0] || null;
  }

  async requireUser(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    const payload = this.verifyAccessToken(token);
    if (!payload?.user_id) return null;
    return this.findUserById(payload.user_id);
  }

  // ============================================
  // Agent (Procurement Agent) Authentication
  // ============================================

  createAgentTokens(agent: { agentId: string; organizationId: number | null; verificationStatus: string; agentType: string; email: string }) {
    const access = jwt.sign(
      { agent_id: agent.agentId, organization_id: agent.organizationId, verification_status: agent.verificationStatus, agent_type: agent.agentType, email: agent.email, token_type: "access" },
      this.jwtSecret,
      { expiresIn: this.AGENT_ACCESS_TOKEN_EXPIRES_IN }
    );
    // Include a jti (JWT ID) so the refresh token can be revoked server-side.
    const refresh = jwt.sign(
      { agent_id: agent.agentId, email: agent.email, token_type: "refresh" },
      this.jwtSecret,
      { expiresIn: this.AGENT_REFRESH_TOKEN_EXPIRES_IN, jwtid: `rt_${agent.agentId}_${Date.now()}` }
    );
    return { access, refresh };
  }

  verifyAgentAccessToken(token?: string) {
    if (!token) return null;
    try {
      const payload = jwt.verify(token, this.jwtSecret) as {
        agent_id?: string;
        token_type?: string;
        organization_id?: number;
        verification_status?: string;
        agent_type?: string;
        email?: string;
      };
      if (payload.token_type !== "access" || !payload.agent_id) return null;
      return payload;
    } catch {
      return null;
    }
  }

  verifyAgentRefreshToken(token?: string) {
    if (!token) return null;
    try {
      const payload = jwt.verify(token, this.jwtSecret) as {
        agent_id?: string;
        token_type?: string;
        email?: string;
        jti?: string;
        exp?: number;
        iat?: number;
      };
      if (payload.token_type !== "refresh" || !payload.agent_id) return null;
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Verifies the agent refresh token and issues a new access token.
   * Throws UnauthorizedException if the refresh token is invalid, revoked,
   * or the agent no longer exists / is not approved.
   */
  async refreshAgentAccessToken(refreshToken: string) {
    const payload = this.verifyAgentRefreshToken(refreshToken);
    if (!payload?.agent_id) {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    // Check if the refresh token has been revoked (e.g. user logged out)
    if (payload.jti && (await this.isRefreshTokenRevoked(payload.jti))) {
      throw new UnauthorizedException("Refresh token has been revoked.");
    }

    // Verify the agent still exists and is still approved
    const agent = await this.findAgentById(payload.agent_id);

    if (!agent) {
      throw new UnauthorizedException("Agent account not found.");
    }

    if (agent.verificationStatus !== "APPROVED") {
      throw new UnauthorizedException(
        `Your account is ${agent.verificationStatus.toLowerCase()}. Please wait for approval or contact support.`
      );
    }

    const tokens = this.createAgentTokens({
      agentId: agent.id,
      organizationId: agent.organizationId,
      verificationStatus: agent.verificationStatus,
      agentType: agent.agentType,
      email: agent.email,
    });

    return {
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      expiresIn: this.AGENT_ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  /**
   * Checks whether a refresh token (by its jti) has been revoked.
   */
  async isRefreshTokenRevoked(tokenId: string): Promise<boolean> {
    const revoked = await this.prisma.revokedRefreshToken.findUnique({
      where: { tokenId },
      select: { id: true },
    });
    return !!revoked;
  }

  /**
   * Revokes a refresh token by storing it in the revoked-token table.
   * The token remains valid until its natural expiry, but is blocked
   * from producing new access tokens.
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const payload = this.verifyAgentRefreshToken(refreshToken);
    if (!payload?.agent_id || !payload.jti) return;

    // Compute the refresh token's expiry from the JWT payload.
    const exp = payload.exp as number | undefined;
    const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.revokedRefreshToken.create({
      data: {
        agentId: payload.agent_id,
        tokenId: payload.jti,
        expiresAt,
      },
    });
  }

  async findAgentByEmail(email: string) {
    // findUnique only accepts unique-index fields (id, email) in `where`.
    // Adding deletedAt would throw PrismaClientKnownRequestError (P2025/P2023)
    // in production. Use findFirst which accepts arbitrary scalar filters.
    const result = await this.prisma.agent.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      select: {
        email: true,
        fullname: true,
        phone: true,
        passwordHash: true,
        organizationId: true,
        verificationStatus: true,
        agentType: true,
        id: true,
      },
    });
    return result || null;
  }

  async findAgentById(agentId: string) {
    // Same reason as findAgentByEmail: findUnique where only takes unique fields.
    // deletedAt is not a unique index, so use findFirst.
    const result = await this.prisma.agent.findFirst({
      where: { id: agentId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullname: true,
        phone: true,
        passwordHash: true,
        organizationId: true,
        verificationStatus: true,
        agentType: true,
      },
    });
    return result || null;
  }

  async requireAgent(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    const payload = this.verifyAgentAccessToken(token);
    if (!payload?.agent_id) return null;
    const agent = await this.findAgentById(payload.agent_id);
    return agent || null;
  }

  async authenticateAgent(email: string, password: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Agent Auth] Login attempt`, { email });
    }
    const normalizedEmail = this.normalizeEmail(email);
    const agent = await this.findAgentByEmail(normalizedEmail);

    if (!agent) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Agent Auth] Agent not found`, { email });
      }
      return null;
    }

    const passwordMatch = bcrypt.compareSync(password, agent.passwordHash);
    if (!passwordMatch) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Agent Auth] Password mismatch`, { agentId: agent.id });
      }
      return null;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[Agent Auth] Login successful`, { agentId: agent.id, verificationStatus: agent.verificationStatus });
    }

    const tokens = this.createAgentTokens({
      agentId: agent.id,
      organizationId: agent.organizationId,
      verificationStatus: agent.verificationStatus,
      agentType: agent.agentType,
      email: agent.email,
    });

    return {
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      agent: {
        id: agent.id,
        email: agent.email,
        fullname: agent.fullname,
        phone: agent.phone,
        verificationStatus: agent.verificationStatus,
        organizationId: agent.organizationId,
        agentType: agent.agentType,
      },
    };
  }

  // ============================================
  // Supplier (Organization) Authentication
  // ============================================

  createSupplierTokens(org: { orgId: number; email: string }) {
    const access = jwt.sign(
      { org_id: org.orgId, email: org.email, token_type: "access" },
      this.jwtSecret,
      { expiresIn: "1d" }
    );
    const refresh = jwt.sign(
      { org_id: org.orgId, email: org.email, token_type: "refresh" },
      this.jwtSecret,
      { expiresIn: "7d" }
    );
    return { access, refresh };
  }

  verifySupplierAccessToken(token?: string) {
    if (!token) return null;
    try {
      const payload = jwt.verify(token, this.jwtSecret) as {
        org_id?: number;
        token_type?: string;
        email?: string;
      };
      if (payload.token_type !== "access" || !payload.org_id) return null;
      return payload;
    } catch {
      return null;
    }
  }

  async findSupplierOrgByEmail(email: string) {
    const result = await this.prisma.organization.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
        SupplierCatalog: { isNot: undefined },
      },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        SupplierCatalog: {
          select: { id: true, organizationId: true },
        },
        verificationStatus: true,
      },
    });
    return result || null;
  }

  async requireSupplier(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    const payload = this.verifySupplierAccessToken(token);
    if (!payload?.org_id) return null;

    const org = await this.prisma.organization.findUnique({
      where: { id: payload.org_id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        verificationStatus: true,
        SupplierCatalog: {
          select: { id: true, organizationId: true },
        },
      },
    });

    return org || null;
  }

  async authenticateSupplier(email: string, password: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Supplier Auth] Login attempt`, { email });
    }
    const normalizedEmail = this.normalizeEmail(email);
    const org = await this.findSupplierOrgByEmail(normalizedEmail);

    if (!org) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Supplier Auth] Supplier org not found`, { email });
      }
      return null;
    }

    if (!org.passwordHash) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Supplier Auth] No password set for org`, { orgId: org.id });
      }
      return null;
    }

    const passwordMatch = bcrypt.compareSync(password, org.passwordHash);
    if (!passwordMatch) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Supplier Auth] Password mismatch`, { orgId: org.id });
      }
      return null;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[Supplier Auth] Login successful`, { orgId: org.id });
    }

    const tokens = this.createSupplierTokens({
      orgId: org.id,
      email: org.email || "",
    });

    return {
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      supplier: {
        orgId: org.id,
        name: org.name,
        email: org.email,
      },
    };
  }
}
