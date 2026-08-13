<<<<<<< HEAD
import { Body, Controller, Get, Headers, HttpCode, Patch, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
=======
import { Body, Controller, Get, Headers, HttpCode, Patch, Post, UploadedFiles, UseInterceptors, BadRequestException } from "@nestjs/common";
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
import { Throttle } from "@nestjs/throttler";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { CustomerAuthService } from "../services/customer-auth.service";
import { AuthService } from "../services/auth.service";

@Controller()
export class AuthController {
  constructor(
    private readonly customers: CustomerAuthService,
    private readonly authService: AuthService,
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(AnyFilesInterceptor())
  register(@Body() body: unknown, @UploadedFiles() files: Express.Multer.File[] = []) {
    return this.customers.register(body, files);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  login(@Body() body: unknown) {
    return this.customers.login(body);
  }

  @Post("agent/login")
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
<<<<<<< HEAD
  agentLogin(@Body() body: unknown) {
=======
  async agentLogin(@Body() body: unknown) {
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
    const { email, password } = body as { email?: string; password?: string };
    if (!email || !password) {
      return { success: false, error: "Email and password are required." };
    }
    if (process.env.NODE_ENV === "development") {
<<<<<<< HEAD
      console.log("[agent/login] test response ✅");
    }
    const result = this.authService.authenticateAgent(email, password);
    if (!result) {
      return { success: false, error: "Invalid email or password." };
    }
    return result;
=======
      console.log("[agent/login] attempting agent login", { email });
    }
    const result = await this.authService.authenticateAgent(email, password);
    if (!result) {
      return { success: false, error: "Invalid email or password." };
    }
    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: this.authService.AGENT_ACCESS_TOKEN_EXPIRES_IN,
      agent: result.agent,
    };
  }

  @Post("agent/refresh")
  @HttpCode(200)
  async agentRefresh(@Body() body: unknown) {
    const { refreshToken } = body as { refreshToken?: string };
    if (!refreshToken) {
      throw new BadRequestException("Refresh token is required.");
    }

    const result = await this.authService.refreshAgentAccessToken(refreshToken);
    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  @Post("agent/logout")
  @HttpCode(200)
  async agentLogout(@Body() body: unknown) {
    const { refreshToken } = body as { refreshToken?: string };

    // Best-effort server-side revocation of the refresh token.
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }

    return {
      success: true,
      message: "Logged out successfully.",
    };
  }

  @Post("supplier/login")
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async supplierLogin(@Body() body: unknown) {
    const { email, password } = body as { email?: string; password?: string };
    if (!email || !password) {
      return { success: false, error: "Email and password are required." };
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[supplier/login] Login attempt", { email });
    }
    const result = await this.authService.authenticateSupplier(email, password);
    if (!result) {
      return { success: false, error: "Invalid email or password." };
    }
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        supplier: result.supplier,
      },
      message: "Supplier login successful",
    };
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
  }

  @Post("verify-email")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() body: unknown) {
    return this.customers.verifyEmail(body);
  }

  @Post("resend-otp")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendOtp(@Body() body: unknown) {
    return this.customers.resendOtp(body);
  }

  @Get("user/update-profile")
  profile(@Headers("authorization") authorization?: string) {
    return this.customers.profile(authorization);
  }

  @Patch("user/update-profile")
  @UseInterceptors(AnyFilesInterceptor())
  updateProfile(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    return this.customers.updateProfile(authorization, body);
  }
}
