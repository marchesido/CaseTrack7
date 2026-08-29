import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { UserRole } from '../src/users/entities/user.entity';

interface LoginResponse {
  access_token: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: UserRole;
}

interface ErrorResponse {
  message: string[];
}

interface SingleErrorResponse {
  message: string;
}

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let normalUserToken: string;

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

    // Authenticate as Admin to get Token
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123',
      });
    const adminBody = adminLoginRes.body as LoginResponse;
    adminToken = adminBody.access_token;

    // Authenticate as normal User to get Token
    const userLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'user2@example.com',
        password: 'password123',
      });
    const userBody = userLoginRes.body as LoginResponse;
    normalUserToken = userBody.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Creation Validation & Security (Error Paths)', () => {
    it('should block user creation without auth token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          name: 'Unauthorized User',
          email: 'unauth@example.com',
          cpf: '12345678909',
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(401);
    });

    it('should block user creation by non-admin role (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          name: 'Forbidden User',
          email: 'forbidden@example.com',
          cpf: '12345678909',
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(403);
    });

    it('should fail creation when missing required fields (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // missing name, email, cpf, password
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContainEqual(
        expect.stringContaining('name must be a string'),
      );
      expect(body.message).toContainEqual(
        expect.stringContaining('email must be an email'),
      );
      expect(body.message).toContainEqual(
        expect.stringContaining('O CPF é obrigatório'),
      );
    });

    it('should fail creation with invalid email format (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Email User',
          email: 'invalid-email-address',
          cpf: '12345678909',
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContainEqual(
        expect.stringContaining('email must be an email'),
      );
    });

    it('should fail creation with invalid CPF format (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid CPF User',
          email: 'invalidcpf@example.com',
          cpf: '12345', // invalid length/format
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContainEqual(
        expect.stringContaining('CPF inválido'),
      );
    });

    it('should fail creation with weak password - missing uppercase (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak Pass User',
          email: 'weakpass1@example.com',
          cpf: '12345678909',
          password: 'password123!', // no uppercase letter
          role: UserRole.USER,
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContainEqual(
        expect.stringContaining(
          'A senha deve conter no mínimo 1 letra maiúscula',
        ),
      );
    });

    it('should fail creation with weak password - missing special char (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak Pass User 2',
          email: 'weakpass2@example.com',
          cpf: '12345678909',
          password: 'Password123', // no special character
          role: UserRole.USER,
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContainEqual(
        expect.stringContaining(
          'A senha deve conter no mínimo 1 caractere especial',
        ),
      );
    });

    it('should fail creation with weak password - too short (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak Pass User 3',
          email: 'weakpass3@example.com',
          cpf: '12345678909',
          password: 'Pas1!', // too short (less than 8 chars)
          role: UserRole.USER,
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContainEqual(
        expect.stringContaining('A senha deve ter no mínimo 8 dígitos'),
      );
    });

    it('should fail creation with duplicate email (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Duplicate',
          email: 'admin@example.com', // already exists from seed
          cpf: '12345678910',
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(400);

      const body = response.body as SingleErrorResponse;
      expect(body.message).toBe('E-mail já está em uso.');
    });
  });

  describe('Full User Flow (Single Scenario CRUD)', () => {
    it('should execute the user lifecycle: create, verify list, edit, verify edits persist, and delete', async () => {
      const timestamp = Date.now();
      const testUserEmail = `flow-user-${timestamp}@example.com`;
      const testUserCpf = `${timestamp}`.substring(0, 11); // Ensure unique 11-digit CPF

      // 1. Create a user (Success Path)
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Flow User Test',
          email: testUserEmail,
          cpf: testUserCpf,
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(201);

      const createdUser = createResponse.body as UserResponse;
      expect(createdUser).toHaveProperty('id');
      expect(createdUser.name).toBe('Flow User Test');
      expect(createdUser.email).toBe(testUserEmail);
      expect(createdUser.cpf).toBe(testUserCpf);
      expect(createdUser.role).toBe(UserRole.USER);

      const createdUserId = createdUser.id;

      // 2. State verification: user appears in the list after creation
      const listAfterCreateRes = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const usersList = listAfterCreateRes.body as UserResponse[];
      const foundCreatedUser = usersList.find((u) => u.id === createdUserId);
      expect(foundCreatedUser).toBeDefined();
      if (foundCreatedUser) {
        expect(foundCreatedUser.name).toBe('Flow User Test');
        expect(foundCreatedUser.email).toBe(testUserEmail);
        expect(foundCreatedUser.cpf).toBe(testUserCpf);
      }

      // 3. Edit user (Success Path)
      const updatePayload = {
        name: 'Flow User Updated',
        cpf: testUserCpf, // keeps cpf
        role: UserRole.ADMIN, // updates role to ADMIN
      };

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload)
        .expect(200);

      // 4. State verification: updates persist after editing
      const getUpdatedUserRes = await request(app.getHttpServer())
        .get(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updatedUser = getUpdatedUserRes.body as UserResponse;
      expect(updatedUser.name).toBe('Flow User Updated');
      expect(updatedUser.role).toBe(UserRole.ADMIN);

      // 5. Delete user (Success Path)
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 6. State verification: user is no longer listed after deletion
      const listAfterDeleteRes = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const usersListAfterDelete = listAfterDeleteRes.body as UserResponse[];
      const foundDeletedUser = usersListAfterDelete.find(
        (u) => u.id === createdUserId,
      );
      expect(foundDeletedUser).toBeUndefined();
    });
  });
});
