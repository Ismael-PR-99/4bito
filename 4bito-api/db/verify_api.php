<?php
$r = file_get_contents('http://localhost/4bito/4bito-api/products/list.php');
$d = json_decode($r, true);
$prods = $d['productos'] ?? [];
echo "Total: " . count($prods) . "\n";
foreach ($prods as $p) {
    echo "  [{$p['id']}] {$p['name']} | cat={$p['category']} | img={$p['imageUrl']}\n";
}
