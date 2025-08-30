import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { SocketIoAdapter } from './websockets/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {cors: true});

  // Middlewares
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }))
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  app.enableCors({
    origin: '*', // your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('My NestJS App')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addCookieAuth('access_token') // optional: if you want to show cookie auth
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger available at /api

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
