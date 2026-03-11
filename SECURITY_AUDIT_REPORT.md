# 🔒 Informe de Auditoría de Seguridad — 4BITO Retro Sports

**Fecha:** Junio 2025  
**Auditor:** GitHub Copilot (Análisis OWASP automatizado)  
**Alcance:** Backend PHP completo (`4bito-api/`) — 69 archivos PHP  
**Estado:** ✅ Todas las vulnerabilidades críticas y altas remediadas  

---

## 📋 Resumen Ejecutivo

Se realizó una auditoría de seguridad completa del backend PHP de 4BITO Retro Sports, cubriendo los 69 archivos PHP de la API. Se identificaron **16 vulnerabilidades** de severidad variada, todas remediadas. Se crearon 3 nuevos archivos de infraestructura de seguridad y se modificaron 44+ archivos existentes.

### Estadísticas de vulnerabilidades

| Severidad | Encontradas | Corregidas | Sin corregir |
|-----------|:-----------:|:----------:|:------------:|
| CRÍTICA   | 4           | 4          | 0            |
| ALTA      | 6           | 6          | 0            |
| MEDIA     | 5           | 5          | 0            |
| BAJA      | 1           | 1          | 0            |
| **TOTAL** | **16**      | **16**     | **0**        |

---

## 🔴 Vulnerabilidades CRÍTICAS

### 1. Manipulación de precios en pedidos (A04: Insecure Design)
- **Archivo:** `orders/create.php`
- **Antes:** El total del pedido venía del frontend: `$total = (float)$input['total']`
- **Riesgo:** Un atacante podía enviar `"total": 0.01` y comprar productos al precio que quisiera
- **Corrección:** 
  - Se eliminó `total` de los campos requeridos del frontend
  - Se recalcula el total consultando la BD con `SELECT ... FOR UPDATE` (bloqueo de fila)
  - Se valida stock disponible antes de confirmar compra
  - Se usa `$productosValidados[]` construido desde datos de la BD, no del frontend

### 2. JWT sin verificación de expiración (A07: Auth Failures)
- **Archivo:** `helpers/jwt.php`
- **Antes:** Los tokens JWT no tenían claim `exp`, eran válidos eternamente
- **Corrección:**
  - `generarJWT()` añade automáticamente `iat` y `exp` (24 horas)
  - `verificarJWT()` rechaza tokens expirados

### 3. JWT vulnerable a timing attacks (A02: Crypto Failures)
- **Archivo:** `helpers/jwt.php`
- **Antes:** Verificación de firma con `$firma !== $firmaEsperada` (operador `!==`)
- **Riesgo:** Permite timing attacks para deducir la firma byte a byte
- **Corrección:** Verificación con `hash_equals()` (constante en tiempo)

### 4. Secreto JWT débil y hardcodeado (A02: Crypto Failures)
- **Archivo:** `helpers/jwt.php`
- **Antes:** `$secret = 'clave_secreta_4bito_2024'` (23 caracteres, predecible)
- **Corrección:** Secreto de 64 caracteres con mezcla alfanumérica y símbolos, definido como constante `JWT_SECRET`
- **Nota:** En producción, mover a variable de entorno `$_ENV['JWT_SECRET']`

---

## 🟠 Vulnerabilidades ALTAS

### 5. Sin rate limiting en login (A07: Auth Failures)
- **Archivo:** `auth/login.php`
- **Antes:** Sin límite de intentos → fuerza bruta posible
- **Corrección:** Máximo 5 intentos por IP cada 5 minutos
- **Implementación:** Nuevo helper `helpers/rate-limiter.php` basado en archivos temporales

### 6. Sin rate limiting en registro (A07: Auth Failures)  
- **Archivo:** `auth/registro.php`
- **Corrección:** Máximo 3 registros por IP cada 10 minutos

### 7. CORS permisivo `Access-Control-Allow-Origin: *` (A05: Security Misconfiguration)
- **Archivos:** 12 archivos en `chat/`, `returns/`, `notifications/`
- **Antes:** Cualquier dominio podía hacer peticiones cross-origin
- **Corrección:** Restringido a `http://localhost:4200`
- **Archivos afectados:**
  - `chat/send.php`, `create.php`, `messages.php`, `resolve.php`, `rooms.php`
  - `returns/create.php`, `get.php`, `list.php`, `update.php`
  - `notifications/list.php`, `mark-read.php`, `subscribe.php`

### 8. Chat sin sanitización ni límites (A03: Injection)
- **Archivo:** `chat/send.php`
- **Antes:** Mensajes sin sanitizar ni limitar en tamaño
- **Corrección:**
  - `sanitizeInput()` con `htmlspecialchars()` + límite de 2000 caracteres
  - Rate limiting: 30 mensajes por IP cada 5 minutos

### 9. Sin validación de longitud mínima de contraseña (A07: Auth Failures)
- **Archivo:** `auth/registro.php`
- **Corrección:** Mínimo 8 caracteres (OWASP recommendation)
- **Adicional:** Nombre limitado a 100 caracteres máximo

### 10. Stock no validado antes de compra (A04: Insecure Design)
- **Archivo:** `orders/create.php`
- **Antes:** No se verificaba si había stock disponible
- **Corrección:** Verificación de stock con `SELECT ... FOR UPDATE` antes de confirmar

---

## 🟡 Vulnerabilidades MEDIAS

### 11. Errores de PDO expuestos al cliente (A09: Logging Failures)
- **Archivos:** ~25 archivos
- **Antes:** `echo json_encode(['error' => $e->getMessage()])` exponía SQL, nombres de tablas, etc.
- **Corrección:** Respuesta genérica `'Error interno del servidor'` + logging con `error_log()`
- **Excepciones:** Scripts CLI de administración (`db/create_db.php`, `db/setup.php`, `db/migrate.php`)

### 12. Sin headers de seguridad HTTP (A05: Security Misconfiguration)
- **Antes:** Sin protección contra clickjacking, MIME sniffing, XSS
- **Corrección:** Nuevo archivo `config/security.php` que establece:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 13. Nombres de archivo predecibles en uploads (A04: Insecure Design)
- **Archivos:** `products/create.php`, `products/update.php`
- **Antes:** `uniqid('product_', true)` — secuencial y predecible
- **Corrección:** `bin2hex(random_bytes(16))` — criptográficamente seguro

### 14. Sin protección contra ejecución PHP en uploads (A05: Security Misconfiguration)
- **Antes:** Un archivo `.php` subido podía ejecutarse como código
- **Corrección:** Nuevo `uploads/.htaccess` que:
  - Bloquea `.php`, `.php3-7`, `.phtml`, `.pht`
  - Deshabilita `ExecCGI`
  - Impide listado de directorio

### 15. Sin whitelist de extensiones de imagen (A04: Insecure Design)
- **Archivos:** `products/create.php`, `products/update.php`
- **Antes:** Solo validación de MIME type (falsificable)
- **Corrección:** Whitelist explícita: `['jpg', 'jpeg', 'png', 'webp']`

---

## 🟢 Vulnerabilidades BAJAS

### 16. Bcrypt sin parámetro de coste (A02: Crypto Failures)
- **Archivo:** `auth/registro.php`
- **Antes:** `password_hash($password, PASSWORD_BCRYPT)` (cost default = 10)
- **Corrección:** `password_hash($password, PASSWORD_BCRYPT, ['cost' => 12])`

---

## 📁 Archivos creados (3)

| Archivo | Propósito |
|---------|-----------|
| `config/security.php` | Headers de seguridad, CORS whitelist, sanitización, manejo de errores |
| `helpers/rate-limiter.php` | Rate limiting basado en archivos temporales por IP |
| `uploads/.htaccess` | Prevención de ejecución de PHP en directorio de uploads |

## 📝 Archivos modificados (44+)

| Módulo | Archivos | Cambios principales |
|--------|----------|---------------------|
| `helpers/jwt.php` | 1 | Reescrito: secreto fuerte, expiración, hash_equals |
| `auth/` | 2 | Rate limiting, validaciones, handleServerError |
| `orders/` | 2 | Recálculo de precio servidor, stock check, sanitización |
| `pieza-semana/` | 4 | Rate limiting, error handling seguro |
| `chat/` | 5 | CORS restrictivo, rate limit, sanitización |
| `returns/` | 4 | CORS restrictivo |
| `notifications/` | 3 | CORS restrictivo |
| `products/` | 7 | Error handling, upload seguro, filenames aleatorios |
| `reviews/` | 2 | Error handling seguro |
| `stock-movements/` | 2 | Error handling seguro |
| `stock-notifications/` | 3 | Error handling seguro |
| `wishlist/` | 2 | Error handling seguro |
| `alerts/` | 3 | Error handling seguro |
| `config/database.php` | 1 | Error de conexión genérico |
| `user/sizes.php` | 1 | Error handling seguro |
| `orders/create.php` | 1 | **REESCRITO** — recálculo de precios desde BD |

---

## 🗺️ Mapeo OWASP Top 10 (2021)

| # | Categoría OWASP | Hallazgos | Estado |
|---|-----------------|-----------|--------|
| A01 | Broken Access Control | CORS permisivo en 12 archivos | ✅ Corregido |
| A02 | Cryptographic Failures | JWT débil, timing attack, bcrypt weak | ✅ Corregido |
| A03 | Injection | Chat sin sanitización (XSS stored potencial) | ✅ Corregido |
| A04 | Insecure Design | Manipulación de precios, uploads predecibles, sin stock check | ✅ Corregido |
| A05 | Security Misconfiguration | CORS *, sin headers seguridad, PHP exec en uploads | ✅ Corregido |
| A06 | Vulnerable Components | No aplica (sin dependencias externas PHP) | N/A |
| A07 | Auth Failures | Sin rate limit, JWT sin expiración, password débil | ✅ Corregido |
| A08 | Software & Data Integrity | No aplica | N/A |
| A09 | Logging & Monitoring | PDO errors expuestos, sin logging estructurado | ✅ Corregido |
| A10 | SSRF | No aplica (sin peticiones server-side) | N/A |

---

## ⚠️ Recomendaciones adicionales (no implementadas)

Estas son mejoras que quedan fuera del alcance inmediato pero se sugieren para producción:

1. **Base de datos**: Cambiar credenciales de MySQL (`root` sin contraseña)
2. **JWT Secret**: Mover a variable de entorno (`$_ENV['JWT_SECRET']`)
3. **HTTPS**: Forzar HTTPS en producción (actualmente HTTP)
4. **CSP Header**: Añadir `Content-Security-Policy` restrictivo
5. **Rate Limiter**: Migrar de archivos temporales a Redis para mejor rendimiento
6. **Logging**: Implementar logging centralizado (e.g., Monolog)
7. **CORS producción**: Actualizar `ALLOWED_ORIGINS` con dominio real de producción
8. **Admin password**: Cambiar `admin123` por una contraseña fuerte
9. **Backup**: Implementar backup automatizado de la BD
10. **WAF**: Considerar un Web Application Firewall en producción

---

## ✅ Verificación

- **PHP Lint:** Los 44+ archivos modificados pasan `php -l` sin errores de sintaxis
- **Encoding:** Todos los caracteres UTF-8 verificados correctos (mojibake corregido)
- **SQL Injection:** Todas las queries usan prepared statements (PDO)
- **XSS:** Sanitización implementada en endpoints de entrada de texto
- **CSRF:** Mitigado por CORS restrictivo + tokens JWT en Authorization header

---

*Informe generado automáticamente. Última actualización: Junio 2025*
