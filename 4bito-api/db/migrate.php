<?php
require_once __DIR__ . '/../config/database.php';

$db  = (new Database())->getConnection();
$sql = file_get_contents(__DIR__ . '/migrations/001_create_productos.sql');

$db->exec($sql);
echo "OK: tabla productos creada/verificada correctamente\n";
?>
