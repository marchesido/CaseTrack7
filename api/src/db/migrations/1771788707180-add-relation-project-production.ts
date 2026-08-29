import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelationProjectProduction1771788707180 implements MigrationInterface {
  name = 'AddRelationProjectProduction1771788707180';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "productions" ADD "projectId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "productions" ADD CONSTRAINT "FK_af0a3d3f3a9b517901e79e02d0c" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "productions" DROP CONSTRAINT "FK_af0a3d3f3a9b517901e79e02d0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "productions" DROP COLUMN "projectId"`,
    );
  }
}
