-- Migración: crea la tabla productos si no existe
-- Base de datos: 4bito_retro_sports
-- Ejecutar una sola vez

CREATE TABLE IF NOT EXISTS `productos` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(200)   NOT NULL,
  `price`      DECIMAL(10,2)  NOT NULL,
  `team`       VARCHAR(100)   NOT NULL,
  `year`       SMALLINT       NOT NULL,
  `league`     VARCHAR(100)   NOT NULL,
  `image_url`  VARCHAR(500)   NOT NULL,
  `category`   VARCHAR(100)   NOT NULL DEFAULT 'retro-selecciones',
  `sizes`      JSON           NOT NULL,
  `created_at` TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
