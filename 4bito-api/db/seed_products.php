<?php
/**
 * Seed: inserta los 12 productos retro de catálogo en la tabla productos.
 * Las imágenes ya existen en public/images/ y Angular las sirve como assets.
 *
 * Uso: php 4bito-api/db/seed_products.php
 */

require_once __DIR__ . '/../config/database.php';

$db = (new Database())->getConnection();

$products = [
    [
        'name'     => 'Brasil 1970 — Campeones',
        'price'    => 59.99,
        'team'     => 'Brasil',
        'year'     => 1970,
        'league'   => 'Copa del Mundo',
        'image_url'=> 'images/retro_selecciones.jpg',
        'category' => 'selecciones',
        'sizes'    => [['size'=>'S','stock'=>12],['size'=>'M','stock'=>15],['size'=>'L','stock'=>10],['size'=>'XL','stock'=>8]],
        'is_new'   => 0,
        'discount_percent' => 33,
        'discounted_price' => 59.99,
    ],
    [
        'name'     => 'Juventus 1977 — Classic',
        'price'    => 54.99,
        'team'     => 'Juventus',
        'year'     => 1977,
        'league'   => 'Serie A',
        'image_url'=> 'images/retro_serie_A.jpg',
        'category' => 'serie-a',
        'sizes'    => [['size'=>'S','stock'=>8],['size'=>'M','stock'=>12],['size'=>'L','stock'=>6]],
        'is_new'   => 0,
        'discount_percent' => 31,
        'discounted_price' => 54.99,
    ],
    [
        'name'     => 'Argentina 1986 — Maradona',
        'price'    => 74.99,
        'team'     => 'Argentina',
        'year'     => 1986,
        'league'   => 'Copa del Mundo',
        'image_url'=> 'images/retro_selecciones.jpg',
        'category' => 'selecciones',
        'sizes'    => [['size'=>'S','stock'=>10],['size'=>'M','stock'=>18],['size'=>'L','stock'=>14],['size'=>'XL','stock'=>10],['size'=>'XXL','stock'=>5]],
        'is_new'   => 0,
        'discount_percent' => 32,
        'discounted_price' => 74.99,
    ],
    [
        'name'     => 'Milan 1988 — Invincibles',
        'price'    => 64.99,
        'team'     => 'AC Milan',
        'year'     => 1988,
        'league'   => 'Serie A',
        'image_url'=> 'images/retro_serie_A.jpg',
        'category' => 'serie-a',
        'sizes'    => [['size'=>'S','stock'=>7],['size'=>'M','stock'=>9],['size'=>'L','stock'=>11],['size'=>'XL','stock'=>6]],
        'is_new'   => 0,
        'discount_percent' => 32,
        'discounted_price' => 64.99,
    ],
    [
        'name'     => 'Francia 1998 — Tricampeones',
        'price'    => 69.99,
        'team'     => 'Francia',
        'year'     => 1998,
        'league'   => 'Copa del Mundo',
        'image_url'=> 'images/retro_selecciones.jpg',
        'category' => 'selecciones',
        'sizes'    => [['size'=>'S','stock'=>14],['size'=>'M','stock'=>20],['size'=>'L','stock'=>16],['size'=>'XL','stock'=>12],['size'=>'XXL','stock'=>4]],
        'is_new'   => 0,
        'discount_percent' => 30,
        'discounted_price' => 69.99,
    ],
    [
        'name'     => 'Barcelona 1992 — Dream Team',
        'price'    => 79.99,
        'team'     => 'FC Barcelona',
        'year'     => 1992,
        'league'   => 'La Liga',
        'image_url'=> 'images/retro_cuadros.jpg',
        'category' => 'cuadros',
        'sizes'    => [['size'=>'S','stock'=>6],['size'=>'M','stock'=>10],['size'=>'L','stock'=>8],['size'=>'XL','stock'=>5]],
        'is_new'   => 0,
        'discount_percent' => 33,
        'discounted_price' => 79.99,
    ],
    [
        'name'     => 'Inter Milan 1998 — Ronaldo',
        'price'    => 72.99,
        'team'     => 'Inter de Milán',
        'year'     => 1998,
        'league'   => 'Serie A',
        'image_url'=> 'images/retro_serie_A.jpg',
        'category' => 'serie-a',
        'sizes'    => [['size'=>'S','stock'=>9],['size'=>'M','stock'=>11],['size'=>'L','stock'=>7],['size'=>'XL','stock'=>4]],
        'is_new'   => 0,
        'discount_percent' => 30,
        'discounted_price' => 72.99,
    ],
    [
        'name'     => 'Brasil 2002 — Pentacampeones',
        'price'    => 67.99,
        'team'     => 'Brasil',
        'year'     => 2002,
        'league'   => 'Copa del Mundo',
        'image_url'=> 'images/retro_selecciones.jpg',
        'category' => 'selecciones',
        'sizes'    => [['size'=>'S','stock'=>12],['size'=>'M','stock'=>16],['size'=>'L','stock'=>14],['size'=>'XL','stock'=>9],['size'=>'XXL','stock'=>3]],
        'is_new'   => 0,
        'discount_percent' => 31,
        'discounted_price' => 67.99,
    ],
    [
        'name'     => 'Real Madrid 2002 — Galácticos',
        'price'    => 84.99,
        'team'     => 'Real Madrid',
        'year'     => 2002,
        'league'   => 'La Liga',
        'image_url'=> 'images/retro_cuadros.jpg',
        'category' => 'cuadros',
        'sizes'    => [['size'=>'S','stock'=>5],['size'=>'M','stock'=>8],['size'=>'L','stock'=>7],['size'=>'XL','stock'=>4]],
        'is_new'   => 1,
        'discount_percent' => 32,
        'discounted_price' => 84.99,
    ],
    [
        'name'     => 'Juventus 1995 — Del Piero',
        'price'    => 68.99,
        'team'     => 'Juventus',
        'year'     => 1995,
        'league'   => 'Serie A',
        'image_url'=> 'images/retro_serie_A.jpg',
        'category' => 'serie-a',
        'sizes'    => [['size'=>'S','stock'=>6],['size'=>'M','stock'=>10],['size'=>'L','stock'=>8],['size'=>'XL','stock'=>5]],
        'is_new'   => 0,
        'discount_percent' => 31,
        'discounted_price' => 68.99,
    ],
    [
        'name'     => 'Portugal 2004 — Euro UEFA',
        'price'    => 62.99,
        'team'     => 'Portugal',
        'year'     => 2004,
        'league'   => 'Eurocopa',
        'image_url'=> 'images/retro_selecciones.jpg',
        'category' => 'selecciones',
        'sizes'    => [['size'=>'S','stock'=>10],['size'=>'M','stock'=>12],['size'=>'L','stock'=>9],['size'=>'XL','stock'=>6]],
        'is_new'   => 0,
        'discount_percent' => 30,
        'discounted_price' => 62.99,
    ],
    [
        'name'     => 'Alemania 1974 — Kaiser Franz',
        'price'    => 56.99,
        'team'     => 'Alemania',
        'year'     => 1974,
        'league'   => 'Copa del Mundo',
        'image_url'=> 'images/retro_selecciones.jpg',
        'category' => 'selecciones',
        'sizes'    => [['size'=>'S','stock'=>7],['size'=>'M','stock'=>9],['size'=>'L','stock'=>5]],
        'is_new'   => 0,
        'discount_percent' => 31,
        'discounted_price' => 56.99,
    ],
];

$sql = "INSERT INTO productos (name, price, team, year, league, image_url, category, sizes, is_new, discount_percent, discounted_price)
        VALUES (:name, :price, :team, :year, :league, :image_url, :category, :sizes, :is_new, :discount_percent, :discounted_price)";
$stmt = $db->prepare($sql);

$inserted = 0;
$skipped  = 0;

foreach ($products as $p) {
    // Skip si ya existe por nombre
    $check = $db->prepare("SELECT id FROM productos WHERE name = ?");
    $check->execute([$p['name']]);
    if ($check->fetch()) {
        echo "⏭  Ya existe: {$p['name']}\n";
        $skipped++;
        continue;
    }

    $stmt->execute([
        ':name'             => $p['name'],
        ':price'            => $p['price'],
        ':team'             => $p['team'],
        ':year'             => $p['year'],
        ':league'           => $p['league'],
        ':image_url'        => $p['image_url'],
        ':category'         => $p['category'],
        ':sizes'            => json_encode($p['sizes']),
        ':is_new'           => $p['is_new'],
        ':discount_percent' => $p['discount_percent'],
        ':discounted_price' => $p['discounted_price'],
    ]);

    $newId = (int)$db->lastInsertId();
    
    // Generar SKU
    $catAbbrev = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $p['category']), 0, 3));
    $sku = sprintf('4BT-%s-%d-%04d', $catAbbrev, $p['year'], $newId);
    $db->prepare("UPDATE productos SET sku=? WHERE id=?")->execute([$sku, $newId]);

    echo "✅ Insertado [ID $newId]: {$p['name']} (SKU: $sku)\n";
    $inserted++;
}

echo "\n📊 Resumen: $inserted insertados, $skipped ya existían\n";

// Total actual
$total = $db->query("SELECT COUNT(*) FROM productos")->fetchColumn();
echo "📦 Total de productos en BD: $total\n";
