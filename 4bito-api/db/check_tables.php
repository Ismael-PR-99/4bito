<?php
require_once __DIR__ . '/../config/database.php';
$db = (new Database())->getConnection();
$stmt = $db->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Tablas en 4bito_retro_sports:\n";
foreach ($tables as $t) {
    echo "  - {$t}\n";
}
echo "\nTotal: " . count($tables) . " tablas\n";
?>
