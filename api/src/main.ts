import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      disableErrorMessages: false,
      forbidNonWhitelisted: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('CaseTrack API — Gestão Audiovisual & Produções')
    .setDescription(
      'API REST para gestão de equipamentos audiovisuais, produções em 4 etapas (Captação, Edição, Backup, Upload), movimentações com controle de avarias/inspeção e integração Google Agenda.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Productions', 'Gestão do ciclo de vida das produções audiovisuais')
    .addTag('Production Stages', 'Controle e avanço das etapas lineares de produção')
    .addTag('Equipment Movements', 'Movimentações de checkout, checkin e reprovação de inspeção')
    .addTag('equipments', 'Inventário e CRUD de equipamentos')
    .addTag('damages', 'Registro de avarias com imagens')
    .addTag('auth', 'Autenticação JWT e controle de papéis')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => console.error(err));
