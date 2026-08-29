import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateColum1772332112423 implements MigrationInterface {
  name = 'UpdateColum1772332112423';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "company" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "company" DROP NOT NULL`,
    );
  }
}
