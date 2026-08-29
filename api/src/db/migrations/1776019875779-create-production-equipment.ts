import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductionEquipment1776019875779 implements MigrationInterface {
  name = 'CreateProductionEquipment1776019875779';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "production_equipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL DEFAULT '1', "usageDate" date NOT NULL, "customDailyCost" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "productionId" uuid NOT NULL, "equipmentId" uuid NOT NULL, CONSTRAINT "UQ_558e1f09405f22de32228182b2a" UNIQUE ("equipmentId", "usageDate"), CONSTRAINT "PK_12eed07e85636b86bcddb3c5cc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "production_equipments" ADD CONSTRAINT "FK_33632b054f949eee47919e656d1" FOREIGN KEY ("productionId") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "production_equipments" ADD CONSTRAINT "FK_6bc3bdba3595c33fb7728d0ed6e" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "production_equipments" DROP CONSTRAINT "FK_6bc3bdba3595c33fb7728d0ed6e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "production_equipments" DROP CONSTRAINT "FK_33632b054f949eee47919e656d1"`,
    );
    await queryRunner.query(`DROP TABLE "production_equipments"`);
  }
}
