import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001'
  )
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  app.enableCors({ origin: allowedOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`SimOps API listening on ${port}`);
}
bootstrap();
