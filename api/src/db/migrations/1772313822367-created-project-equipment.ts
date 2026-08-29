import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedProjectEquipment1772313822367 implements MigrationInterface {
  name = 'CreatedProjectEquipment1772313822367';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_equipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL DEFAULT '1', "usageDate" date NOT NULL, "customDailyCost" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c7b7d4a2a2aacddd25dee25417" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_equipments"`);
  }
}
