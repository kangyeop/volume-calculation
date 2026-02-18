import { Test, TestingModule } from '@nestjs/testing';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';
import { PackingResultEntity } from './entities/packing-result.entity';
import { PackingGroupingOption } from '@wms/types';

describe('PackingController', () => {
  let controller: PackingController;
  let service: PackingService;

  const mockPackingService = {
    calculate: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackingController],
      providers: [
        {
          provide: PackingService,
          useValue: mockPackingService,
        },
      ],
    }).compile();

    controller = module.get<PackingController>(PackingController);
    service = module.get<PackingService>(PackingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('calculate', () => {
    it('should call packingService.calculate with correct parameters', async () => {
      const projectId = 'test-project';
      const dto = { groupingOption: PackingGroupingOption.ORDER, batchId: 'test-batch' };
      const expectedResult = { groups: [], totalCBM: 0, totalEfficiency: 0 };

      mockPackingService.calculate.mockResolvedValue(expectedResult);

      const result = await controller.calculate(projectId, dto);

      expect(service.calculate).toHaveBeenCalledWith(
        projectId,
        dto.groupingOption,
        dto.batchId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should call packingService.findAll with correct projectId', async () => {
      const projectId = 'test-project';
      const expectedResult: PackingResultEntity[] = [];

      mockPackingService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(projectId);

      expect(service.findAll).toHaveBeenCalledWith(projectId);
      expect(result).toEqual(expectedResult);
    });
  });
});
