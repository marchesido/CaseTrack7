import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class RemoveProjectEquipament1776021160947 implements MigrationInterface {
  // O método "up" é o que roda quando você APLICA a migração
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Apaga a tabela 'project-equipament'
    // O segundo parâmetro 'true' adiciona a cláusula "IF EXISTS" para evitar erros
    await queryRunner.dropTable('project_equipments', true);
  }

  // O método "down" é o que roda quando você DESFAZ (rollback) a migração
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Se você precisar desfazer essa migração no futuro, o TypeORM precisa saber como recriar a tabela.
    // Se não quiser configurar o rollback agora, você pode deixar vazio,
    // mas o ideal é colocar a estrutura básica da tabela que foi apagada.

    await queryRunner.createTable(
      new Table({
        name: 'project_equipments',
        columns: [
          {
            name: 'id',
            type: 'int', // ou 'uuid' dependendo de como era
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          // ... adicione as outras colunas que existiam caso queira um rollback perfeito
        ],
      }),
      true,
    );
  }
}
