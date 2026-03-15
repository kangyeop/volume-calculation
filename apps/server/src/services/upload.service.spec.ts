import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadService } from './upload.service';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OutboundEntity } from '../entities/outbound.entity';
import { ProductEntity } from '../entities/product.entity';

// @ts-ignore
describe('UploadService - 나나시.xlsx 업로드 테스트', () => {
  let service: UploadService;
  let ordersRepository: Repository<OrderEntity>;
  let outboundRepository: Repository<OutboundEntity>;
  let productsRepository: Repository<ProductEntity>;

  const testProjectId = 'test-project-001';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: getRepositoryToken(OrderEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(OutboundEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    ordersRepository = module.get<Repository<OrderEntity>>(getRepositoryToken(OrderEntity));
    outboundRepository = module.get<Repository<OutboundEntity>>(getRepositoryToken(OutboundEntity));
    productsRepository = module.get<Repository<ProductEntity>>(getRepositoryToken(ProductEntity));
  });

  afterEach(async () => {
    await ordersRepository.delete({});
    await outboundRepository.delete({});
    await productsRepository.delete({});
  });

  describe('나나시.xlsx Order 등록 테스트', () => {
    const nanasiOrderIds = [
      '20251224070140994747',
      '20251224070211231281',
      '20251224071000394017',
      '20260107121137812246',
    ];

    beforeEach(async () => {
      await setupTestProducts();
    });

    it('여러 주문에서 동일한 orderId는 하나의 Order로 생성', async () => {
      await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
        testProjectId,
      );

      const orders = await ordersRepository.find({ where: { projectId: testProjectId } });

      expect(orders).toHaveLength(nanasiOrderIds.length);

      const orderMap = new Map(orders.map((o) => [o.orderId, o]));

      for (const orderId of nanasiOrderIds) {
        const order = orderMap.get(orderId);
        expect(order).toBeDefined();
        expect(order?.orderId).toBe(orderId);
        expect(order?.status).toBe(OrderStatus.PENDING);
        expect(order?.quantity).toBeGreaterThan(0);
      }
    });

    it('Order 생성 시 동일 orderId의 quantity를 합산', async () => {
      await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
        testProjectId,
      );

      const order = await ordersRepository.findOne({
        where: { projectId: testProjectId, orderId: 'ORDER-001' },
      });

      expect(order?.quantity).toBe(6);
    });
  });

  describe('나나시.xlsx Outbound 등록 테스트', () => {
    beforeEach(async () => {
      await setupTestProducts();
    });

    it('모든 outbound 아이템이 데이터베이스에 저장', async () => {
      await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
        testProjectId,
      );

      const outboundCount = await outboundRepository.count({
        where: { projectId: testProjectId, orderId: 'ORDER-001' },
      });

      expect(outboundCount).toBe(2);
    });

    it('productId가 올바르게 연결', async () => {
      const product = await productsRepository.findOne({
        where: { projectId: testProjectId, sku: '나나시_25생일_쿠션' },
      });

      await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
        testProjectId,
      );

      const outbound = await outboundRepository.findOne({
        where: { projectId: testProjectId, orderId: 'ORDER-001', sku: '나나시_25생일_쿠션' },
      });

      expect(outbound?.productId).toBe(product?.id);
    });
  });

  describe('나나시.xlsx 데이터 구조 테스트', () => {
    beforeEach(async () => {
      await setupTestProducts();
    });

    it('풀 세트 (7개 아이템) 주문 처리', async () => {
      await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
        testProjectId,
      );

      const order = await ordersRepository.findOne({
        where: { projectId: testProjectId, orderId: 'ORDER-FULLSET' },
      });

      expect(order?.quantity).toBe(7);
    });
  });

  async function setupTestProducts(): Promise<void> {
    const testProducts = [
      {
        sku: '나나시_25생일_쿠션',
        name: '나나시 25생일 쿠션',
        width: 20,
        length: 20,
        height: 10,
      },
      {
        sku: '나나시_25생일_싸인장패드',
        name: '나나시 25생일 싸인장패드',
        width: 15,
        length: 15,
        height: 2,
      },
      {
        sku: '나나시_25생일_장패드',
        name: '나나시 25생일 장패드',
        width: 15,
        length: 15,
        height: 2,
      },
      {
        sku: '나나시_25생일_포카',
        name: '나나시 25생일 포카',
        width: 10,
        length: 10,
        height: 1,
      },
      {
        sku: '나나시_25생일_생축키링',
        name: '나나시 25생일 생축키링',
        width: 5,
        length: 5,
        height: 2,
      },
      {
        sku: '나나시_25생일_꾹꾹키링',
        name: '나나시 25생일 꾹꾹키링',
        width: 5,
        length: 5,
        height: 2,
      },
      {
        sku: '나나시_25생일_랑이키링',
        name: '나나시 25생일 랑이키링',
        width: 5,
        length: 5,
        height: 2,
      },
      {
        sku: '나나시_25생일_호이키링',
        name: '나나시 25생일 호이키링',
        width: 5,
        length: 5,
        height: 2,
      },
    ];

    for (const product of testProducts) {
      const existing = await productsRepository.findOne({
        where: { projectId: testProjectId, sku: product.sku },
      });
      if (!existing) {
        await productsRepository.save({ ...product, projectId: testProjectId });
      }
    }
  }
});
