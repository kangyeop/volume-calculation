import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PackingService } from './packing.service';
import { PackingResultEntity } from './entities/packing-result.entity';
import { OutboundService } from '../outbound/outbound.service';
import { ProductsService } from '../products/products.service';
import { BoxesService } from '../boxes/boxes.service';
import { BadRequestException } from '@nestjs/common';
import { PackingGroupingOption } from '@wms/types';

describe('PackingService', () => {
  let service: PackingService;
  let boxesService: BoxesService;

  const mockPackingResultRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockOutboundService = {
    findAll: jest.fn().mockResolvedValue([]),
  };

  const mockProductsService = {
    findAll: jest.fn().mockResolvedValue([]),
  };

  const mockBoxesService = {
    findAll: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackingService,
        {
          provide: getRepositoryToken(PackingResultEntity),
          useValue: mockPackingResultRepository,
        },
        {
          provide: OutboundService,
          useValue: mockOutboundService,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: BoxesService,
          useValue: mockBoxesService,
        },
      ],
    }).compile();

    service = module.get<PackingService>(PackingService);
    boxesService = module.get<BoxesService>(BoxesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException if no boxes are found', async () => {
    jest.spyOn(boxesService, 'findAll').mockResolvedValue([]);

    await expect(
      service.calculate('project-id', PackingGroupingOption.ORDER),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.calculate('project-id', PackingGroupingOption.ORDER),
    ).rejects.toThrow('등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.');
  });

  it('should calculate packing when boxes exist', async () => {
    const mockBoxes = [
      { id: '1', name: 'Box 1', width: 100, length: 100, height: 100, createdAt: new Date() },
    ];
    const mockProducts = [
      { id: 'p1', sku: 'SKU1', name: 'Product 1', width: 10, length: 10, height: 10, projectId: 'project-id', createdAt: new Date() },
    ];
    const mockOutbounds = [
      { id: 'o1', sku: 'SKU1', quantity: 1, orderId: 'ord1', projectId: 'project-id', createdAt: new Date() },
    ];

    jest.spyOn(boxesService, 'findAll').mockResolvedValue(mockBoxes as any);
    jest.spyOn(mockOutboundService, 'findAll').mockResolvedValue(mockOutbounds as any);
    jest.spyOn(mockProductsService, 'findAll').mockResolvedValue(mockProducts as any);

    const result = await service.calculate('project-id', PackingGroupingOption.ORDER);

    expect(result).toBeDefined();
    expect(result.groups).toHaveLength(1);
    expect(mockPackingResultRepository.save).toHaveBeenCalled();
  });
});
