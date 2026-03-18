import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadService } from './upload.service';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { ProductEntity } from '../entities/product.entity';
import { ProductGroupEntity } from '../entities/product-group.entity';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';

// @ts-ignore
describe('UploadService - 나나시.xlsx 업로드 테스트', () => {
  let service: UploadService;
  let ordersRepository: Repository<OrderEntity>;
  let outboundRepository: Repository<OutboundItemEntity>;
  let productsRepository: Repository<ProductEntity>;
  let productGroupRepository: Repository<ProductGroupEntity>;
  let outboundBatchRepository: Repository<OutboundBatchEntity>;

  let testGroupId = 'e1de7bca-90d2-45af-bbda-39281a1795bc';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: getRepositoryToken(OrderEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(OutboundItemEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ProductGroupEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(OutboundBatchEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    ordersRepository = module.get<Repository<OrderEntity>>(getRepositoryToken(OrderEntity));
    outboundRepository = module.get<Repository<OutboundItemEntity>>(getRepositoryToken(OutboundItemEntity));
    productsRepository = module.get<Repository<ProductEntity>>(getRepositoryToken(ProductEntity));
    productGroupRepository = module.get<Repository<ProductGroupEntity>>(getRepositoryToken(ProductGroupEntity));
    outboundBatchRepository = module.get<Repository<OutboundBatchEntity>>(getRepositoryToken(OutboundBatchEntity));
  });

  afterEach(async () => {
    await ordersRepository.delete({});
    await outboundRepository.delete({});
    await productsRepository.delete({});
    await productGroupRepository.delete({});
    await outboundBatchRepository.delete({});
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
      const result = await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
      );

      const orders = await ordersRepository.find({ where: { outboundBatchId: result.batchId } });

      expect(orders).toHaveLength(nanasiOrderIds.length);

      const orderMap = new Map(orders.map((o) => [o.orderId, o]));

      for (const orderId of nanasiOrderIds) {
        const order = orderMap.get(orderId);
        expect(order).toBeDefined();
        expect(order?.orderId).toBe(orderId);
        expect(order?.status).toBe(OrderStatus.PENDING);
      }
    });

    it('Order 생성 시 동일 orderId로 그루핑', async () => {
      const result = await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
      );

      const order = await ordersRepository.findOne({
        where: { outboundBatchId: result.batchId, orderId: 'ORDER-001' },
      });

      expect(order).toBeDefined();
      expect(order?.orderId).toBe('ORDER-001');
    });
  });

  describe('나나시.xlsx Outbound 등록 테스트', () => {
    beforeEach(async () => {
      await setupTestProducts();
    });

    it('모든 outbound 아이템이 데이터베이스에 저장', async () => {
      const result = await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
      );

      const outboundCount = await outboundRepository.count({
        where: { outboundBatchId: result.batchId, orderId: 'ORDER-001' },
      });

      expect(outboundCount).toBe(2);
    });

    it('productId가 올바르게 연결', async () => {
      const product = await productsRepository.findOne({
        where: { productGroupId: testGroupId, sku: '나나시_25생일_쿠션' },
      });

      const result = await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
      );

      const outbound = await outboundRepository.findOne({
        where: { outboundBatchId: result.batchId, orderId: 'ORDER-001', sku: '나나시_25생일_쿠션' },
      });

      expect(outbound?.productId).toBe(product?.id);
    });
  });

  describe('나나시.xlsx 데이터 구조 테스트', () => {
    beforeEach(async () => {
      await setupTestProducts();
    });

    it('풀 세트 (7개 아이템) 주문 처리', async () => {
      const result = await service.uploadAndSaveDirect(
        { buffer: Buffer.from('test'), originalname: 'test.xlsx' } as any,
      );

      const order = await ordersRepository.findOne({
        where: { outboundBatchId: result.batchId, orderId: 'ORDER-FULLSET' },
      });

      expect(order).toBeDefined();
      expect(order?.orderId).toBe('ORDER-FULLSET');
    });
  });

  async function setupTestProducts(): Promise<void> {
    await productGroupRepository.save({
       id: testGroupId,
       name: 'test-group'
    });

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
        where: { productGroupId: testGroupId, sku: product.sku },
      });
      if (!existing) {
        await productsRepository.save({ ...product, productGroupId: testGroupId });
      }
    }
  }
});
