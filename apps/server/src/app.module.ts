import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AIModule } from './modules/ai.module';
import { ProductGroupsModule } from './modules/product-groups.module';
import { OutboundBatchModule } from './modules/outbound-batch.module';
import { ProductsModule } from './modules/products.module';
import { OutboundModule } from './modules/outbound.module';
import { OrdersModule } from './modules/orders.module';
import { PackingModule } from './modules/packing.module';
import { BoxesModule } from './modules/boxes.module';
import { UploadModule } from './modules/upload.module';
import { ProductUploadModule } from './modules/productUpload.module';
import { DashboardModule } from './modules/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'wms',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AIModule,
    ProductGroupsModule,
    OutboundBatchModule,
    ProductsModule,
    OrdersModule,
    OutboundModule,
    PackingModule,
    BoxesModule,
    UploadModule,
    ProductUploadModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
