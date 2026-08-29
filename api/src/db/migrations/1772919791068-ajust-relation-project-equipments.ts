import { MigrationInterface, QueryRunner } from 'typeorm';

export class AjustRelationProjectEquipments1772919791068 implements MigrationInterface {
  name = 'AjustRelationProjectEquipments1772919791068';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "company" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" DROP CONSTRAINT "FK_206d2fbcb616a5dbc500ecd08c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" DROP CONSTRAINT "FK_ea7b02030693cb59867d18454c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ALTER COLUMN "projectId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ALTER COLUMN "equipmentId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ADD CONSTRAINT "FK_206d2fbcb616a5dbc500ecd08c8" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ADD CONSTRAINT "FK_ea7b02030693cb59867d18454c8" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_equipments" DROP CONSTRAINT "FK_ea7b02030693cb59867d18454c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" DROP CONSTRAINT "FK_206d2fbcb616a5dbc500ecd08c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ALTER COLUMN "equipmentId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ALTER COLUMN "projectId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ADD CONSTRAINT "FK_ea7b02030693cb59867d18454c8" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_equipments" ADD CONSTRAINT "FK_206d2fbcb616a5dbc500ecd08c8" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "company" DROP NOT NULL`,
    );
  }
}
