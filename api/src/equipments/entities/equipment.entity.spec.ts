import { Equipment } from './equipment.entity';
import { ProductionEquipment } from '../../production-equipment/entities/production-equipment.entity';

describe('EquipmentEntity', () => {
  it('should create an Equipment entity', () => {
    const equipment = new Equipment();
    equipment.id = 'uuid';
    equipment.name = 'Camera';
    equipment.category = 'Video';
    equipment.serialNumber = 'SN123';
    equipment.purchaseDate = new Date();
    equipment.status = 'available';
    equipment.dailyCost = 100;
    equipment.createdAt = new Date();
    equipment.productionEquipments = [new ProductionEquipment()];

    expect(equipment).toBeDefined();
    expect(equipment.name).toBe('Camera');
    expect(equipment.status).toBe('available');
  });
});
