import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AIModule } from './modules/ai.module';
import { ProjectsModule } from './modules/projects.module';
import { ProductsModule } from './modules/products.module';
import { OutboundModule } from './modules/outbound.module';
import { OrdersModule } from './modules/orders.module';
import { PackingModule } from './modules/packing.module';
import { BoxesModule } from './modules/boxes.module';
import { UploadModule } from './modules/upload.module';

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
    ProjectsModule,
    ProductsModule,
    OrdersModule,
    OutboundModule,
    PackingModule,
    BoxesModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
