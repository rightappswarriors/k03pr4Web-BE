import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/** Shape exposed by PrismaClientKnownRequestError at runtime. */
interface PrismaKnownError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  clientVersion?: string;
}

function isPrismaKnownError(e: unknown): e is PrismaKnownError {
  return (
    e instanceof Error &&
    "code" in e &&
    typeof (e as PrismaKnownError).code === "string" &&
    (e as PrismaKnownError).code.startsWith("P")
  );
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttp ? exception.getResponse() : null;
    const payload = typeof raw === "object" && raw !== null ? raw : { message: raw };
    const message = (payload as { message?: unknown; error?: unknown }).message;

    if (status >= 500) {
      // For Prisma errors, log the structured diagnostic fields so the exact
      // error code and affected model are visible in production logs.
      // We deliberately omit DATABASE_URL and any secret values.
      if (isPrismaKnownError(exception)) {
        this.logger.error(
          `${request.method} ${request.url} failed — Prisma ${exception.code}`,
          JSON.stringify({
            prismaCode: exception.code,
            prismaMeta: exception.meta ?? null,
            prismaMessage: exception.message,
            prismaClientVersion: exception.clientVersion ?? null,
          })
        );
      } else {
        this.logger.error(
          `${request.method} ${request.url} failed`,
          exception instanceof Error ? exception.stack : String(exception)
        );
      }
    } else {
      this.logger.warn(`${request.method} ${request.url} returned ${status}`);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(payload as Record<string, unknown>),
      message: message || (status >= 500 ? "Internal server error" : undefined),
    });
  }
}
