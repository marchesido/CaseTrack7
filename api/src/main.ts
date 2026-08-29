import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      disableErrorMessages: false,
      forbidNonWhitelisted: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('Digital Matricula API')
    .setDescription(
      'Empower your educational experience with the Digital Matricula API. Seamlessly manage courses, academic information, and more with this robust and user-friendly interface. Version 1.0 brings innovative features to enhance your academic journey.',
    )

    .setVersion('1.0')
    .addTag('clients', 'Explore and manage courses effortlessly.')
    .addTag('projects', '')
    .addTag('productions', '')
    .addTag('equipaments', '')
    .addTag('projects-equipments', '')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => console.error(err));
