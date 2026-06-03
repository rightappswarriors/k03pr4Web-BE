import { Body, Controller, Get, Headers, HttpCode, Patch, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { CustomerAuthService } from "../services/customer-auth.service";

@Controller()
export class AuthController {
  constructor(private readonly customers: CustomerAuthService) {}

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
