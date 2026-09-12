import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Production } from '../entities/production.entity';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class ProductionAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Production)
    private readonly productionRepo: Repository<Production>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const productionId = request.params.id;

    if (!user) {
      return false;
    }

    // Administradores possuem acesso irrestrito a todas as produções
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (!productionId) {
      return true;
    }

    const production = await this.productionRepo.findOne({
      where: { id: productionId },
      relations: ['stages', 'stages.responsibleUser'],
    });

    if (!production) {
      throw new NotFoundException(`Produção não encontrada`);
    }

    // Freelancer só pode acessar se for responsável por pelo menos uma etapa
    const hasAccess = production.stages?.some(
      (stage) => stage.responsibleUser?.id === user.id,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta produção',
      );
    }

    return true;
  }
}
