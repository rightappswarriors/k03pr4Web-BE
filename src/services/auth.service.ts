import { Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";
import * as jwt from "jsonwebtoken";
import { DatabaseService } from "./database.service";

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

@Injectable()
export class AuthService {
  private readonly jwtSecret =
    process.env.JWT_SECRET || process.env.SECRET_KEY || "kompra-local-dev-key";

  constructor(private readonly db: DatabaseService) {}

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
}
