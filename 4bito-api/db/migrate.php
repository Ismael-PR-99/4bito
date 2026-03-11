<?php
/**
 * Ejecuta TODAS las migraciones SQL en orden.
 * Uso: php migrate.php   o   http://localhost/4bito/4bito-api/db/migrate.php
 */
require_once __DIR__ . '/../config/database.php';

$db = (new Database())->getConnection();

$migrationsDir = __DIR__ . '/migrations';
$files = glob($migrationsDir . '/*.sql');
sort($files); // orden lexicográfico: 001, 002, 003 ...

$results = [];

foreach ($files as $file) {
    $name = basename($file);
    $sql  = file_get_contents($file);
    if (empty(trim($sql))) {
        $results[] = "SKIP: {$name} (vacío)";
        continue;
    }

    try {
        // Ejecutar cada sentencia por separado (separadas por ;)
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function($s) {
                // Quitar líneas de comentario para ver si queda SQL real
                $lines = array_filter(
                    explode("\n", trim($s)),
                    fn($line) => !str_starts_with(trim($line), '--')
                );
                return !empty(trim(implode("\n", $lines)));
            }
        );

        $stmtErrors = [];
        foreach ($statements as $stmt) {
            if (empty(trim($stmt))) continue;
            try {
                $db->exec($stmt);
            } catch (PDOException $stmtEx) {
                $stmtErrors[] = $stmtEx->getMessage();
            }
        }

        if (empty($stmtErrors)) {
            $results[] = "OK: {$name}";
        } else {
            $results[] = "PARTIAL: {$name} — " . implode(' | ', $stmtErrors);
        }
    } catch (PDOException $e) {
        $results[] = "WARN: {$name} — " . $e->getMessage();
    }
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== MIGRACIÓN 4BITO ===\n";
foreach ($results as $r) {
    echo $r . "\n";
}
echo "=== FIN ===\n";
?>
