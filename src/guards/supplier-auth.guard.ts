import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { AuthService } from "../services/auth.service";

@Injectable()
export class SupplierAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new BadRequestException("Missing supplier authentication token.");
    }

    const org = await this.authService.requireSupplier(authorization);

    if (!org) {
      throw new BadRequestException(
        "Invalid or expired supplier token, or organization is not a registered supplier."
      );
    }

    request.supplier = {
      orgId: org.id,
      orgName: org.name,
      email: org.email,
    };

    return true;
  }
}
