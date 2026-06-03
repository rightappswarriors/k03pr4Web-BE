import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService, AuthUser } from "./auth.service";
import { DatabaseService } from "./database.service";
import { EmailService } from "./email.service";
import { parseBody } from "../common/validation";
import {
  loginSchema,
  profileSchema,
  registerSchema,
  resendOtpSchema,
  verifyEmailSchema,
} from "../schemas/api.schemas";

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly auth: AuthService,
    private readonly db: DatabaseService,
    private readonly email: EmailService
  ) {}

  async currentUser(authorization?: string) {
    const user = await this.auth.requireUser(authorization);
    if (!user) {
      throw new UnauthorizedException({
        detail: "Authentication credentials were not provided.",
      });
    }
    return user;
  }

  async register(body: unknown, files: Express.Multer.File[]) {
    const data = parseBody(registerSchema, body);
    const exists = await this.auth.findUserByEmail(data.email);
    if (exists) throw new BadRequestException({ email: ["User with this email already exists."] });

    const passwordHash = this.auth.makePassword(data.password);
    const user = await this.db.transaction(async (client) => {
      const inserted = await client.query<AuthUser>(
        `
        INSERT INTO api_user (
          password, is_superuser, first_name, last_name, is_staff, is_active,
          date_joined, email, full_name, contact_number, gender, date_of_birth,
          role, is_verified
        )
        VALUES ($1, false, '', '', false, true, NOW(), $2, $3, $4, $5, $6, $7, false)
        RETURNING id, email, full_name, contact_number, gender, date_of_birth,
                  role, is_verified, profile_image, password
        `,
        [passwordHash, data.email, data.full_name, data.contact_number, data.gender, data.date_of_birth, data.role]
      );
      const user = inserted.rows[0];

      if (data.role === "CUSTOMER") {
        await client.query(
          `
          INSERT INTO "KompraCustomer"
            (fullname, email, "passwordHash", "profilePhoto", "isVerified", "isActive", "createdAt", "updatedAt", phone)
          VALUES ($1, $2, $3, '', false, true, NOW(), NOW(), $4)
          ON CONFLICT (email) DO NOTHING
          `,
          [user.full_name, user.email, passwordHash, user.contact_number]
        );
      }

      await this.createSellerOrSupplierProfile(client, data, files, user.id);
      return user;
    });

    const otp = await this.sendOtp(user);
    return this.email.appendDevOtp(this.auth.serializeUser(user), otp);
  }

  async login(body: unknown) {
    const data = parseBody(loginSchema, body);
    const user = await this.auth.authenticate(data.email, data.password);
    if (!user) throw new UnauthorizedException({ error: "Invalid credentials" });

    if (!user.is_verified) {
      const otp = await this.sendOtp(user, true);
      throw new ForbiddenException(
        this.email.appendDevOtp({ error: "Please verify your email first.", needs_verification: true }, otp)
      );
    }

    return { user: this.auth.serializeUser(user), ...this.auth.createTokens(user) };
  }

  async verifyEmail(body: unknown) {
    const data = parseBody(verifyEmailSchema, body);
    const user = await this.auth.findUserByEmail(data.email);
    if (!user) throw new NotFoundException({ error: "User not found." });

    const otpResult = await this.db.query("SELECT otp FROM api_user WHERE id = $1", [user.id]);
    if (otpResult.rows[0]?.otp !== data.otp) {
      throw new BadRequestException({ error: "Invalid verification code." });
    }

    await this.db.query("UPDATE api_user SET is_verified = true, otp = NULL WHERE id = $1", [user.id]);
    await this.db.query(
      `UPDATE "KompraCustomer" SET "isVerified" = true, "updatedAt" = NOW() WHERE lower(email) = lower($1)`,
      [data.email]
    );
    return { message: "Email verified successfully.", is_verified: true };
  }

  async resendOtp(body: unknown) {
    const data = parseBody(resendOtpSchema, body);
    const user = await this.auth.findUserByEmail(data.email);
    if (!user || user.is_verified) {
      throw new NotFoundException({ error: "User not found or already verified." });
    }
    const otp = await this.sendOtp(user, true);
    return this.email.appendDevOtp({ message: "New OTP sent." }, otp);
  }

  async profile(authorization?: string) {
    return this.auth.serializeUser(await this.currentUser(authorization));
  }

  async updateProfile(authorization: string | undefined, body: unknown) {
    const user = await this.currentUser(authorization);
    const data = parseBody(profileSchema, body);
    const next = { ...user, ...data };
    const result = await this.db.query<AuthUser>(
      `
      UPDATE api_user SET full_name=$1, contact_number=$2, gender=$3, date_of_birth=$4
      WHERE id=$5
      RETURNING id, email, full_name, contact_number, gender, date_of_birth,
                role, is_verified, profile_image, password
      `,
      [next.full_name, next.contact_number, next.gender || null, next.date_of_birth || null, user.id]
    );
    return this.auth.serializeUser(result.rows[0]);
  }

  private async sendOtp(user: AuthUser, isResend = false) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await this.db.query("UPDATE api_user SET otp = $1 WHERE id = $2", [otp, user.id]);
    this.email.queueVerificationCode(user, otp, isResend);
    return otp;
  }

  private async createSellerOrSupplierProfile(client: any, data: any, files: Express.Multer.File[], userId: number) {
    if (data.role === "SELLER" && data.store_details) {
      const details = JSON.parse(data.store_details);
      await client.query(
        `INSERT INTO api_store
          (user_id, store_name, category, description, address, city, province, zip_code,
           business_permit, dti_sec_registration, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING',NOW())`,
        [
          userId, details.store_name, details.category, details.description || null,
          details.address, details.city, details.province, details.zip_code,
          files.find((file) => file.fieldname === "business_permit")?.originalname || "",
          files.find((file) => file.fieldname === "dti_sec_registration")?.originalname || "",
        ]
      );
    }

    if (data.role === "SUPPLIER" && data.company_details) {
      const details = JSON.parse(data.company_details);
      await client.query(
        `INSERT INTO api_supplier
          (user_id, company_name, business_type, product_category, address, city, province,
           zip_code, min_order_value, delivery_areas, registration_cert, bir_2303, catalog,
           status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'PENDING',NOW())`,
        [
          userId, details.company_name, details.business_type, details.product_category,
          details.address, details.city, details.province, details.zip_code,
          details.min_order_value || 0, details.delivery_areas,
          files.find((file) => file.fieldname === "registration_cert")?.originalname || "",
          files.find((file) => file.fieldname === "bir_2303")?.originalname || "",
          files.find((file) => file.fieldname === "catalog")?.originalname || null,
        ]
      );
    }
  }
}
