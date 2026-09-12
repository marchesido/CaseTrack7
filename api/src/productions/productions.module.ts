import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Production } from './entities/production.entity';
import { ProductionStage } from './entities/production-stage.entity';
import { ProductionEquipment } from './entities/production-equipment.entity';
import { EquipmentMovement } from './entities/equipment-movement.entity';
import { GoogleToken } from './entities/google-token.entity';
import { Equipment } from '../equipments/entities/equipment.entity';
import { User } from '../users/entities/user.entity';
import { Damage } from '../damages/entities/damage.entity';

import { ProductionsService } from './productions.service';
import { ProductionsController } from './productions.controller';
import { ProductionStagesService } from './production-stages.service';
import { ProductionStagesController } from './production-stages.controller';
import { ProductionCompletionService } from './production-completion.service';
import { EquipmentMovementsService } from './equipment-movements.service';
import { EquipmentMovementsController } from './equipment-movements.controller';
import { ProductionAccessGuard } from './guards/production-access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Production,
      ProductionStage,
      ProductionEquipment,
      EquipmentMovement,
      GoogleToken,
      Equipment,
      User,
      Damage,
    ]),
  ],
  controllers: [
    ProductionsController,
    ProductionStagesController,
    EquipmentMovementsController,
  ],
  providers: [
    ProductionsService,
    ProductionStagesService,
    ProductionCompletionService,
    EquipmentMovementsService,
    ProductionAccessGuard,
  ],
  exports: [
    ProductionsService,
    ProductionStagesService,
    ProductionCompletionService,
    EquipmentMovementsService,
    TypeOrmModule,
  ],
})
export class ProductionsModule {}
