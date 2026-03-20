import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createConnection } from 'mysql2/promise';
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
import { BoxGroupsModule } from './modules/box-groups.module';
import { UploadModule } from './modules/upload.module';
import { ProductUploadModule } from './modules/productUpload.module';
import { DashboardModule } from './modules/dashboard.module';
import { UploadTemplateModule } from './modules/upload-template.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const logger = new Logger('DatabaseMigration');
        const host = process.env.DB_HOST || 'localhost';
        try {
          const conn = await createConnection({
            host,
            port: 3306,
            user: 'root',
            password: 'root',
            database: 'wms',
          });

          const [compositeUx] = await conn.query<any[]>(
            `SELECT DISTINCT s.INDEX_NAME
             FROM information_schema.STATISTICS s
             JOIN information_schema.TABLE_CONSTRAINTS tc
               ON tc.TABLE_SCHEMA = s.TABLE_SCHEMA
               AND tc.TABLE_NAME = s.TABLE_NAME
               AND tc.CONSTRAINT_NAME = s.INDEX_NAME
               AND tc.CONSTRAINT_TYPE = 'UNIQUE'
             WHERE s.TABLE_SCHEMA = 'wms' AND s.TABLE_NAME = 'products'
               AND s.COLUMN_NAME = 'productGroupId'`,
          );

          if (compositeUx?.length > 0) {
            const [fkRows] = await conn.query<any[]>(
              `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
               WHERE TABLE_SCHEMA = 'wms' AND TABLE_NAME = 'products'
                 AND COLUMN_NAME = 'productGroupId' AND REFERENCED_TABLE_NAME IS NOT NULL`,
            );

            for (const fk of fkRows ?? []) {
              logger.log(`Dropping FK ${fk.CONSTRAINT_NAME} before index migration...`);
              await conn.query(`ALTER TABLE products DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``).catch(() => {});
            }

            for (const ux of compositeUx) {
              logger.log(`Dropping composite unique index ${ux.INDEX_NAME}...`);
              await conn.query(`ALTER TABLE products DROP INDEX \`${ux.INDEX_NAME}\``).catch(() => {});
            }

            await conn.query(
              `ALTER TABLE products ADD CONSTRAINT \`FK_products_productGroupId\` FOREIGN KEY (\`productGroupId\`) REFERENCES \`product_groups\`(\`id\`) ON DELETE CASCADE`,
            ).catch(() => {});

            logger.log('Migration complete: composite unique constraint removed, FK recreated');
          }

          await conn.end();
        } catch (e: any) {
          if (e?.code !== 'ER_NO_SUCH_TABLE') {
            logger.warn(`Pre-sync migration skipped: ${e?.message}`);
          }
        }

        return {
          type: 'mysql' as const,
          host,
          port: 3306,
          username: 'root',
          password: 'root',
          database: 'wms',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        };
      },
    }),
    AIModule,
    ProductGroupsModule,
    OutboundBatchModule,
    ProductsModule,
    OrdersModule,
    OutboundModule,
    PackingModule,
    BoxesModule,
    BoxGroupsModule,
    UploadModule,
    ProductUploadModule,
    DashboardModule,
    UploadTemplateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
