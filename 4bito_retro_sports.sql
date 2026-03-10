-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 10-03-2026 a las 18:18:50
-- Versión del servidor: 8.4.7
-- Versión de PHP: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `4bito_retro_sports`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `decades`
--

DROP TABLE IF EXISTS `decades`;
CREATE TABLE IF NOT EXISTS `decades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(10) NOT NULL,
  `active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `decades`
--

INSERT INTO `decades` (`id`, `name`, `active`) VALUES
(1, '70s', 1),
(2, '80s', 1),
(3, '90s', 1),
(4, '00s', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pieza_semana`
--

DROP TABLE IF EXISTS `pieza_semana`;
CREATE TABLE IF NOT EXISTS `pieza_semana` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `final_price` decimal(10,2) NOT NULL,
  `valid_until` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `pieza_semana`
--

INSERT INTO `pieza_semana` (`id`, `product_id`, `discount_percent`, `final_price`, `valid_until`, `is_active`, `created_at`) VALUES
(4, 13, 21.00, 79.00, '2026-03-10 15:02:00', 0, '2026-03-05 15:02:44');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

DROP TABLE IF EXISTS `productos`;
CREATE TABLE IF NOT EXISTS `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `discounted_price` decimal(10,2) DEFAULT NULL,
  `team` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` smallint NOT NULL,
  `league` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'retro-selecciones',
  `sizes` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_new` tinyint(1) DEFAULT '0',
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating_avg` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `name`, `price`, `discount_percent`, `discounted_price`, `team`, `year`, `league`, `image_url`, `category`, `sizes`, `created_at`, `is_new`, `sku`, `rating_avg`, `rating_count`, `activo`) VALUES
(3, 'Zidane 10 visitante', 100.00, 0.00, NULL, 'Francia', 2006, 'Mundial', 'http://localhost/4bito/uploads/product_69a5ae957e0345.98409702.jpg', 'retro-selecciones', '[{\"size\": \"M\", \"stock\": 6}, {\"size\": \"S\", \"stock\": 7}]', '2026-03-02 15:36:53', 0, NULL, 0.00, 0, 1),
(4, 'Zidane 10 local', 100.00, 0.00, NULL, 'Francia', 2006, 'Copa Mundial', 'http://localhost/4bito/uploads/product_69a5af5f9791a4.20784163.jpg', 'retro-selecciones', '[{\"size\": \"M\", \"stock\": 5}]', '2026-03-02 15:40:15', 0, NULL, 0.00, 0, 1),
(5, 'Mexico 10', 70.00, 0.00, NULL, 'Mexico', 2010, 'Copa Mundial', 'http://localhost/4bito/uploads/product_69a5b13f41aef3.30904442.jpg', 'retro-selecciones', '[{\"size\": \"M\", \"stock\": 6}]', '2026-03-02 15:48:15', 0, NULL, 0.00, 0, 1),
(6, '8 Japon', 80.00, 0.00, NULL, 'Japon', 1908, 'Copa Mundial', 'http://localhost/4bito/uploads/product_69a5b3c656cc51.56082138.jpg', 'retro-selecciones', '[{\"size\": \"M\", \"stock\": 4}]', '2026-03-02 15:59:02', 0, NULL, 0.00, 0, 1),
(7, 'Japon local', 50.00, 0.00, NULL, 'Japon', 2001, 'Copa Mundial', 'http://localhost/4bito/uploads/product_69a5b42fc92b71.75693746.jpg', 'retro-selecciones', '[{\"size\": \"M\", \"stock\": 8}]', '2026-03-02 16:00:47', 0, NULL, 0.00, 0, 1),
(10, 'España', 50.00, 0.00, NULL, 'España', 1982, 'Copa Mundial', 'http://localhost/4bito/uploads/product_69a5c906a77d04.83634524.jpg', 'retro-cuadros', '[{\"size\": \"30x40\", \"stock\": 1}]', '2026-03-02 17:29:42', 0, NULL, 0.00, 0, 1),
(11, 'Henry', 100.00, 0.00, NULL, 'Arsenal', 2000, 'Premier League', 'http://localhost/4bito/uploads/product_69a5c9348be364.59619463.jpg', 'retro-cuadros', '[{\"size\": \"50x60\", \"stock\": 1}]', '2026-03-02 17:30:28', 0, NULL, 0.00, 0, 1),
(12, 'Kaka', 120.00, 0.00, NULL, 'Milan', 2001, 'Serie A', 'http://localhost/4bito/uploads/product_69a5c99b44c055.59726749.jpg', 'retro-cuadros', '[{\"size\": \"40x60\", \"stock\": 1}]', '2026-03-02 17:32:11', 0, NULL, 0.00, 0, 1),
(13, 'Luka Modric', 100.00, 0.00, NULL, 'Croacia', 2010, 'Copa Mundial', 'http://localhost/4bito/uploads/product_69a5ca15cb10f0.34446834.jpg', 'retro-cuadros', '[{\"size\": \"30x40\", \"stock\": 1}]', '2026-03-02 17:34:13', 0, NULL, 0.00, 0, 1),
(14, 'Ronaldo 9', 200.00, 0.00, NULL, 'Barcelona', 1999, 'Liga Santander', 'http://localhost/4bito/uploads/product_69a5cbf183e0a0.72351818.jpg', 'retro-cuadros', '[{\"size\": \"30x40\", \"stock\": 1}]', '2026-03-02 17:42:09', 0, NULL, 0.00, 0, 1),
(15, 'Maceta adidas tango', 15.00, 0.00, NULL, 'Adidas', 2000, 'Objetos', 'http://localhost/4bito/uploads/product_69a5cc6d2b0e05.13662085.jpg', 'retro-objetos', '[{\"size\": \"20x20\", \"stock\": 1}]', '2026-03-02 17:44:13', 0, NULL, 0.00, 0, 1),
(16, 'Vase Fußball', 15.00, 0.00, NULL, 'Balon Maceta', 1900, 'Premier League', 'http://localhost/4bito/uploads/product_69a6f7b79e6555.85546785.jpg', 'retro-objetos', '[{\"size\": \"15x20\", \"stock\": 1}]', '2026-03-03 15:01:11', 0, NULL, 0.00, 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `push_subscriptions`
--

DROP TABLE IF EXISTS `push_subscriptions`;
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(200) NOT NULL,
  `auth_key` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('cliente','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'cliente',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `activo`, `fecha_registro`) VALUES
(4, 'Admin', 'admin@4bito.com', '$2y$12$B0XdVCkBsLL65pVzwOqiROXSBEy4IIjEaDEwOKkSv01t.TvSxC2KW', 'admin', 1, '2026-02-27 00:01:23'),
(2, 'Test', 'test@test.com', '$2y$10$RcePhl3uOup4r3Ci.mDVQelHxyrJ9zystg4g0ubF.SUZ8PB8DT9k6', 'cliente', 1, '2026-02-26 22:57:46'),
(3, 'Ismael', 'ismael199904@gmail.com', '$2y$10$Vajnb630.EpYejC8xAQ8iedG7iKQwyiOo5Zm6zTQkhyGK2b7faJ2C', 'cliente', 1, '2026-02-26 23:04:57'),
(5, 'Prueba', 'prueba999@test.com', '$2y$10$yUZ3MucvakzhV2bJX1ZlcuRyrE7HV2lpPbFAtulB1nKy90lJl/USy', 'cliente', 1, '2026-02-27 00:16:14');

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `pieza_semana`
--
ALTER TABLE `pieza_semana`
  ADD CONSTRAINT `pieza_semana_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
