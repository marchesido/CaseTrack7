import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedInitialMigration1771783336958 implements MigrationInterface {
  name = 'CreatedInitialMigration1771783336958';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "description" text, "budget" numeric(10,2) NOT NULL DEFAULT '0', "status" character varying(50) NOT NULL DEFAULT 'pending', "deadline" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "productions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(100) NOT NULL, "cost" numeric(10,2) NOT NULL DEFAULT '0', "startDate" TIMESTAMP, "endDate" TIMESTAMP, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_395fda0b6f26cb5fd9a2aa6315c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "clients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "email" character varying(150) NOT NULL, "phone" character varying(150) NOT NULL, "cpf" character varying(11) NOT NULL, "company" character varying(150), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4245ac34add1ceeb505efc98777" UNIQUE ("cpf"), CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b48860677afe62cd96e1265948" ON "clients" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "equipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "category" character varying(100) NOT NULL, "serialNumber" character varying(100), "purchaseDate" date, "status" character varying(50) NOT NULL DEFAULT 'available', "dailyCost" numeric(10,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_250348d5d9ae4946bcd634f3e61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7d12d8b9d541c63f0c3e83669c" ON "equipments" ("serialNumber") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7d12d8b9d541c63f0c3e83669c"`,
    );
    await queryRunner.query(`DROP TABLE "equipments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b48860677afe62cd96e1265948"`,
    );
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TABLE "productions"`);
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
