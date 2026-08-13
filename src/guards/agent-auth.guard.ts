<<<<<<< HEAD
import { Injectable, CanActivate, ExecutionContext, BadRequestException } from "@nestjs/common";
=======
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
import { AuthService } from "../services/auth.service";

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
<<<<<<< HEAD
      throw new BadRequestException("Missing agent authentication token.");
=======
      throw new UnauthorizedException("Authentication required. Please log in.");
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
    }

    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = this.authService.verifyAgentAccessToken(token);

    if (!payload?.agent_id) {
<<<<<<< HEAD
      throw new BadRequestException("Invalid or expired agent token.");
=======
      throw new UnauthorizedException("Invalid or expired agent token.");
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
    }

    const agent = await this.authService.requireAgent(authorization);

    if (!agent) {
<<<<<<< HEAD
      throw new BadRequestException("Agent account not found.");
    }

    if (agent.verificationStatus !== "APPROVED") {
      throw new BadRequestException(
=======
      throw new UnauthorizedException("Agent account not found.");
    }

    if (agent.verificationStatus !== "APPROVED") {
      throw new UnauthorizedException(
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
        `Your account is ${agent.verificationStatus.toLowerCase()}. Please wait for approval or contact support.`
      );
    }

    request.agent = agent;
    return true;
  }
}
