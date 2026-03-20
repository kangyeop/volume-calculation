SET @db = 'wms';

SELECT CONCAT('ALTER TABLE products DROP FOREIGN KEY `', CONSTRAINT_NAME, '`;')
INTO @drop_fk
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products'
  AND COLUMN_NAME = 'productGroupId' AND REFERENCED_TABLE_NAME IS NOT NULL
LIMIT 1;

SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT CONCAT('ALTER TABLE products DROP INDEX `', INDEX_NAME, '`;')
INTO @drop_idx
FROM information_schema.STATISTICS s
JOIN information_schema.TABLE_CONSTRAINTS tc
  ON tc.TABLE_SCHEMA = s.TABLE_SCHEMA
  AND tc.TABLE_NAME = s.TABLE_NAME
  AND tc.CONSTRAINT_NAME = s.INDEX_NAME
  AND tc.CONSTRAINT_TYPE = 'UNIQUE'
WHERE s.TABLE_SCHEMA = @db AND s.TABLE_NAME = 'products'
  AND s.COLUMN_NAME = 'productGroupId'
LIMIT 1;

SET @drop_idx = IFNULL(@drop_idx, 'SELECT 1');
PREPARE stmt FROM @drop_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DELETE p1 FROM products p1
INNER JOIN products p2
ON p1.sku = p2.sku AND p1.createdAt < p2.createdAt;

ALTER TABLE products
  ADD CONSTRAINT `FK_products_productGroupId`
  FOREIGN KEY (`productGroupId`) REFERENCES `product_groups`(`id`) ON DELETE CASCADE;
