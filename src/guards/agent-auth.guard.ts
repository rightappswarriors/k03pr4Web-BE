import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../services/auth.service";

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException("Authentication required. Please log in.");
    }

    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = this.authService.verifyAgentAccessToken(token);

    if (!payload?.agent_id) {
      throw new UnauthorizedException("Invalid or expired agent token.");
    }

    const agent = await this.authService.requireAgent(authorization);

    if (!agent) {
      throw new UnauthorizedException("Agent account not found.");
    }

    if (agent.verificationStatus !== "APPROVED") {
      throw new UnauthorizedException(
        `Your account is ${agent.verificationStatus.toLowerCase()}. Please wait for approval or contact support.`
      );
    }

    request.agent = agent;
    return true;
  }
}
