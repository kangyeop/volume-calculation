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

-- 2. Create box_groups table
CREATE TABLE IF NOT EXISTS box_groups (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 3. Create default group if none exists
SET @has_groups = (SELECT COUNT(*) FROM box_groups);
SET @default_group_id = UUID();

SET @sql = IF(@has_groups = 0,
  CONCAT('INSERT INTO box_groups (id, name) VALUES (''', @default_group_id, ''', ''기본 박스 그룹'')'),
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Use existing group if one was already created
SET @default_group_id = (SELECT id FROM box_groups LIMIT 1);

-- 4. Add boxGroupId column if not exists
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'wms'
    AND TABLE_NAME = 'boxes'
    AND COLUMN_NAME = 'boxGroupId'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE boxes ADD COLUMN boxGroupId VARCHAR(36) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Assign all unassigned boxes to default group
UPDATE boxes SET boxGroupId = @default_group_id WHERE boxGroupId IS NULL;

-- 6. Make column NOT NULL
ALTER TABLE boxes MODIFY COLUMN boxGroupId VARCHAR(36) NOT NULL;

-- 7. Add foreign key constraint
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'wms'
    AND TABLE_NAME = 'boxes'
    AND CONSTRAINT_NAME = 'FK_b7fcbee085af928481aa4172e21'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE boxes ADD CONSTRAINT FK_b7fcbee085af928481aa4172e21 FOREIGN KEY (boxGroupId) REFERENCES box_groups(id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
