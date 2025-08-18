import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middlewares
  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:3000', // your frontend URL
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
