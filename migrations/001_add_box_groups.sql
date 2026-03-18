-- Migration: Add box_groups table and boxGroupId to boxes
-- Run this BEFORE deploying the new server version

-- 1. Clean up any failed previous migration attempts
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'wms'
    AND TABLE_NAME = 'boxes'
    AND CONSTRAINT_NAME = 'FK_b7fcbee085af928481aa4172e21'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE boxes DROP FOREIGN KEY FK_b7fcbee085af928481aa4172e21',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'wms'
    AND TABLE_NAME = 'boxes'
    AND COLUMN_NAME = 'boxGroupId'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE boxes DROP COLUMN boxGroupId',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Create box_groups table
CREATE TABLE IF NOT EXISTS box_groups (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 3. Create default group and assign all existing boxes
SET @default_group_id = UUID();

INSERT INTO box_groups (id, name) VALUES (@default_group_id, '기본 박스 그룹');

-- 4. Add NOT NULL boxGroupId column with default group
ALTER TABLE boxes ADD COLUMN boxGroupId VARCHAR(36) NOT NULL DEFAULT 'temp';

UPDATE boxes SET boxGroupId = @default_group_id;

ALTER TABLE boxes ALTER COLUMN boxGroupId DROP DEFAULT;

-- 5. Add foreign key constraint
ALTER TABLE boxes ADD CONSTRAINT FK_b7fcbee085af928481aa4172e21
  FOREIGN KEY (boxGroupId) REFERENCES box_groups(id) ON DELETE CASCADE;
