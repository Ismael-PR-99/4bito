-- 005_add_missing_indexes.sql
-- Añade índices faltantes detectados en la auditoría
-- BD: 4bito_retro_sports

-- productos: columnas usadas en WHERE/ORDER BY de products/list.php
ALTER TABLE productos ADD INDEX idx_productos_category (category);
ALTER TABLE productos ADD INDEX idx_productos_year (year);
ALTER TABLE productos ADD INDEX idx_productos_is_new (is_new);
ALTER TABLE productos ADD INDEX idx_productos_created_at (created_at);

-- reviews: columna approved usada en WHERE de reviews/list.php
ALTER TABLE reviews ADD INDEX idx_reviews_approved (product_id, approved);

-- stock_movements: columna type usada en WHERE de stock-movements/list.php
ALTER TABLE stock_movements ADD INDEX idx_sm_type (type);
