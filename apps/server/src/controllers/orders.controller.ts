import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';

@Controller('projects')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':projectId/orders/:orderId/map-products')
  async mapProducts(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('orderId') orderId: string,
  ) {
    const count = await this.ordersService.mapProducts(projectId, orderId);
    return { success: true, data: { mappedCount: count } };
  }

  @Get(':projectId/orders/:orderId/volume')
  async calculateVolume(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('orderId') orderId: string,
  ) {
    const volume = await this.ordersService.calculateVolume(projectId, orderId);
    return { success: true, data: { volume, unit: 'CBM' } };
  }

  @Get(':projectId/orders/:orderId')
  async findByProjectAndOrderId(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.ordersService.findByProjectAndOrderId(projectId, orderId);
    return { success: true, data: order };
  }
}
