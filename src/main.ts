import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
<<<<<<< HEAD
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
=======
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { RealtimeGateway } from "./gateway/realtime.gateway";
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)

function allowedOrigins() {
  return (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.setGlobalPrefix("api");
  app.use(helmet());
<<<<<<< HEAD
=======
  // Global ValidationPipe: malformed request bodies produce a 400 with
  // a descriptive message.  Auth failures still use 401 via UnauthorizedException.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,        // We don't use class-validator DTOs everywhere yet
      forbidNonWhitelisted: false,
      transform: false,
    }),
  );
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

<<<<<<< HEAD
=======
  // The gateway shares the HTTP server but only handles /realtime upgrades.
  // Authentication happens before a socket is accepted.
  app.get(RealtimeGateway).attach(app.getHttpServer());

>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
  const port = Number(process.env.PORT || 8000);
  await app.listen(port, "0.0.0.0");
  console.log(`Kompra NestJS backend running on http://localhost:${port}/api`);
}

bootstrap();
