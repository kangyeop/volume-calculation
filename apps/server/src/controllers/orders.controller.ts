import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';

@Controller('outbound-batches')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':batchId/orders/:orderId/map-products')
  async mapProducts(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('orderId') orderId: string,
  ) {
    const count = await this.ordersService.mapProducts(batchId, orderId);
    return { success: true, data: { mappedCount: count } };
  }

  @Get(':batchId/orders/:orderId/volume')
  async calculateVolume(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('orderId') orderId: string,
  ) {
    const volume = await this.ordersService.calculateVolume(batchId, orderId);
    return { success: true, data: { volume, unit: 'CBM' } };
  }

  @Get(':batchId/orders/:orderId')
  async findByBatchAndOrderId(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.ordersService.findByBatchAndOrderId(batchId, orderId);
    return { success: true, data: order };
  }
}
