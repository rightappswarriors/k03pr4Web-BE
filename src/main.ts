import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";

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
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  const port = Number(process.env.PORT || 8000);
  await app.listen(port, "0.0.0.0");
  console.log(`Kompra NestJS backend running on http://localhost:${port}/api`);
}

bootstrap();
