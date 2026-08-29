import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        disableErrorMessages: false,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should successfully log in with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123',
        })
        .expect(201);

      const body = response.body as {
        access_token: string;
        user: { email: string; role: string };
      };
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('user');
      expect(body.user).toEqual(
        expect.objectContaining({
          email: 'admin@example.com',
          role: 'ADMIN',
        }),
      );
    });

    it('should fail to log in with wrong password (incorrect password)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrong_password',
        })
        .expect(401);
    });

    it('should fail to log in with non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('should fail to log in with missing email (validation failure)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          password: 'password123',
        })
        .expect(401);
    });

    it('should fail to log in with missing password (validation failure)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          // missing password
        })
        .expect(401);
    });

    it('should fail to log in with invalid email format (validation failure)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email-format',
          password: 'password123',
        })
        .expect(401);
    });
  });
});
