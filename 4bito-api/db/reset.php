<?php
/**
 * Reset: elimina todas las tablas y re-ejecuta migraciones.
 * CUIDADO: Borra todos los datos.
 */
require_once __DIR__ . '/../config/database.php';

$db = (new Database())->getConnection();

// Desactivar FK checks para poder borrar en cualquier orden
$db->exec('SET FOREIGN_KEY_CHECKS = 0');

$stmt = $db->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($tables as $table) {
    $db->exec("DROP TABLE IF EXISTS `{$table}`");
    echo "Dropped: {$table}\n";
}

$db->exec('SET FOREIGN_KEY_CHECKS = 1');
echo "\nTodas las tablas eliminadas. Ejecuta migrate.php para recrearlas.\n";
?>
