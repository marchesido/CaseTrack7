import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: configService.get<string>('DB_HOST'),
  port: parseInt(configService.get<string>('DB_PORT') ?? '3306', 10),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  synchronize: false,
  entities: ['**/*.entity.ts'],
  migrations: ['src/db/migrations/*.{ts,js}'],
  migrationsRun: false,
  logging: true,
});

export default AppDataSource;
