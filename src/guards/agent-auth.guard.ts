import { Injectable, CanActivate, ExecutionContext, BadRequestException } from "@nestjs/common";
import { AuthService } from "../services/auth.service";

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new BadRequestException("Missing agent authentication token.");
    }

    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = this.authService.verifyAgentAccessToken(token);

    if (!payload?.agent_id) {
      throw new BadRequestException("Invalid or expired agent token.");
    }

    const agent = await this.authService.requireAgent(authorization);

    if (!agent) {
      throw new BadRequestException("Agent account not found.");
    }

    if (agent.verificationStatus !== "APPROVED") {
      throw new BadRequestException(
        `Your account is ${agent.verificationStatus.toLowerCase()}. Please wait for approval or contact support.`
      );
    }

    request.agent = agent;
    return true;
  }
}
