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

          const [fkRows] = await conn.query<any[]>(
            `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = 'wms' AND TABLE_NAME = 'products'
               AND COLUMN_NAME = 'productGroupId' AND REFERENCED_TABLE_NAME IS NOT NULL`,
          );

          const [uxRows] = await conn.query<any[]>(
            `SELECT DISTINCT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = 'wms' AND TABLE_NAME = 'products'
               AND CONSTRAINT_TYPE = 'UNIQUE' AND CONSTRAINT_NAME LIKE '%sku%'`,
          );

          const hasCompositeUnique = uxRows?.some((r: any) => {
            return r.CONSTRAINT_NAME?.includes('productGroup') || r.CONSTRAINT_NAME?.includes('IDX');
          });

          if (hasCompositeUnique && fkRows?.length > 0) {
            const fkName = fkRows[0].CONSTRAINT_NAME;
            logger.log(`Migrating products unique constraint: dropping FK ${fkName}, recreating...`);
            await conn.query(`ALTER TABLE products DROP FOREIGN KEY \`${fkName}\``);
            for (const ux of uxRows) {
              await conn.query(`ALTER TABLE products DROP INDEX \`${ux.CONSTRAINT_NAME}\``).catch(() => {});
            }
            await conn.query(`ALTER TABLE products ADD CONSTRAINT \`FK_products_productGroupId\` FOREIGN KEY (\`productGroupId\`) REFERENCES \`product_groups\`(\`id\`) ON DELETE CASCADE`);
            logger.log('Migration complete: products unique constraint updated');
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
