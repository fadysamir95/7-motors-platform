import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Behind a reverse proxy or load balancer, set TRUST_PROXY to the number of proxies in front of the API so the real
  // client address (used by the rate limiter and the audit log) is read from X-Forwarded-For. Leave it unset otherwise.
  const proxies = Number(config.get('TRUST_PROXY'));
  if (Number.isInteger(proxies) && proxies > 0) app.set('trust proxy', proxies);

  // Bodies are capped (1 MB covers a 500-row CSV import); anything bigger is refused before it is parsed.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: true });

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: config.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('7 MOTORS API')
    .setDescription('Automotive platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`7 MOTORS API running on http://localhost:${port}`);
}
bootstrap();
