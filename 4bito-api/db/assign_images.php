<?php
/**
 * Asigna las imágenes reales de uploads/ a los productos del catálogo en BD.
 * Las imágenes se asignan por orden de creación (nombre de archivo = uniqid = cronológico).
 *
 * Uso: php 4bito-api/db/assign_images.php
 */

require_once __DIR__ . '/../config/database.php';

$db = (new Database())->getConnection();

$uploadDir = realpath(__DIR__ . '/../../uploads');
if (!$uploadDir || !is_dir($uploadDir)) {
    die("Error: carpeta uploads/ no encontrada\n");
}

// Obtener las imágenes JPG ordenadas por nombre (= cronológico por uniqid)
$jpgs = [];
foreach (scandir($uploadDir) as $f) {
    if (preg_match('/^product_.*\.(jpg|jpeg|png|webp)$/i', $f)) {
        $jpgs[] = $f;
    }
}
sort($jpgs); // Orden cronológico

echo "=== Imágenes encontradas en uploads/ ===\n";
foreach ($jpgs as $i => $f) {
    echo "  [$i] $f\n";
}

// Obtener productos ordenados por ID (el seed los insertó en el mismo orden que el mock)
$stmt = $db->query("SELECT id, name, image_url FROM productos ORDER BY id ASC");
$productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "\n=== Productos en BD ===\n";
foreach ($productos as $p) {
    echo "  [ID {$p['id']}] {$p['name']} → img: {$p['image_url']}\n";
}

// Mapeo: los first 12 JPGs van con los productos del catálogo (IDs 2-13)
// El producto ID 1 (prueba) ya tiene su imagen asignada
echo "\n=== Asignando imágenes ===\n";

$catalogProducts = array_filter($productos, fn($p) => $p['id'] >= 2);
$catalogProducts = array_values($catalogProducts);

// Las primeras 12 imágenes (los .jpg) son las del catálogo
$catalogImages = array_filter($jpgs, fn($f) => str_ends_with(strtolower($f), '.jpg'));
$catalogImages = array_values($catalogImages);

$updated = 0;
foreach ($catalogProducts as $i => $p) {
    if (!isset($catalogImages[$i])) {
        echo "  ⚠️  Sin imagen para: {$p['name']} (posición $i)\n";
        continue;
    }
    
    $imageUrl = 'http://localhost/4bito/uploads/' . $catalogImages[$i];
    $stmt = $db->prepare("UPDATE productos SET image_url = ? WHERE id = ?");
    $stmt->execute([$imageUrl, $p['id']]);
    echo "  ✅ [{$p['id']}] {$p['name']} → {$catalogImages[$i]}\n";
    $updated++;
}

echo "\n📊 $updated productos actualizados con imágenes reales\n";

// Verificar resultado
echo "\n=== Verificación final ===\n";
$stmt = $db->query("SELECT id, name, image_url FROM productos ORDER BY id ASC");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $exists = file_exists($uploadDir . '/' . basename($row['image_url'])) ? '✅' : '❌';
    echo "  $exists [{$row['id']}] {$row['name']} → " . basename($row['image_url']) . "\n";
}
