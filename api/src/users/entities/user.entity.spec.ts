import { User, UserRole } from './user.entity';

describe('UserEntity', () => {
  it('should create a User entity', () => {
    const user = new User();
    user.id = 'uuid';
    user.name = 'Test User';
    user.email = 'test@test.com';
    user.cpf = '12345678901';
    user.passwordHash = 'hash';
    user.role = UserRole.ADMIN;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    expect(user).toBeDefined();
    expect(user.id).toBe('uuid');
    expect(user.name).toBe('Test User');
    expect(user.role).toBe(UserRole.ADMIN);
  });
});
