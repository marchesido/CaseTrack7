import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../users/entities/user.entity';
import { Equipment, EquipmentStatus } from '../../equipments/entities/equipment.entity';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../../.env') });

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'audiovisual_db',
  entities: [User, Equipment],
  synchronize: false,
});

async function runSeed() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Database connected.');

  const userRepository = AppDataSource.getRepository(User);
  const equipmentRepository = AppDataSource.getRepository(Equipment);

  // 1. Seed Admin User
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@example.com' },
  });

  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = userRepository.create({
      name: 'Administrador Produtora',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    });
    await userRepository.save(admin);
    console.log('Admin user created: admin@example.com / admin123');
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Seed Freelancer User
  const existingFreelancer = await userRepository.findOne({
    where: { email: 'freelancer@example.com' },
  });

  if (!existingFreelancer) {
    const freelancerPassword = await bcrypt.hash('user123', 10);
    const freelancer = userRepository.create({
      name: 'Freelancer Operador',
      email: 'freelancer@example.com',
      passwordHash: freelancerPassword,
      role: UserRole.FREELANCER,
    });
    await userRepository.save(freelancer);
    console.log('Freelancer user created: freelancer@example.com / user123');
  } else {
    console.log('Freelancer user already exists.');
  }

  // 3. Seed Sample Equipment
  const equipmentCount = await equipmentRepository.count();
  if (equipmentCount === 0) {
    const sampleEquipments = [
      {
        name: 'Câmera Sony Cinema Line FX3',
        serialNumber: 'FX3-98234',
        description: 'Corpo de câmera full-frame 4K 120p com gaiola SmallRig',
        status: EquipmentStatus.DISPONIVEL,
      },
      {
        name: 'Lente Sony FE 24-70mm f/2.8 GM II',
        serialNumber: 'SEL2470GM2-1102',
        description: 'Lente zoom padrão premium G Master com filtro ND variável',
        status: EquipmentStatus.EM_USO,
      },
      {
        name: 'Kit Microfone Rode Wireless PRO',
        serialNumber: 'RODE-WPRO-4421',
        description: 'Sistema de lapela duplo sem fio com gravação onboard 32-bit float',
        status: EquipmentStatus.MANUTENCAO,
      },
    ];

    for (const item of sampleEquipments) {
      const eq = equipmentRepository.create(item);
      await equipmentRepository.save(eq);
    }
    console.log('Sample equipments seeded successfully.');
  } else {
    console.log(`Equipments already exist (${equipmentCount} found).`);
  }

  await AppDataSource.destroy();
  console.log('Seed process completed successfully!');
}

runSeed().catch((err) => {
  console.error('Error running seeds:', err);
  process.exit(1);
});
