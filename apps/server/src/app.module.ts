import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsModule } from './modules/projects/projects.module';
import { ProductsModule } from './modules/products/products.module';
import { OutboundModule } from './modules/outbound/outbound.module';
import { PackingModule } from './modules/packing/packing.module';
import { BoxesModule } from './modules/boxes/boxes.module';

@Module({
  imports: [
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
    ProjectsModule,
    ProductsModule,
    OutboundModule,
    PackingModule,
    BoxesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
