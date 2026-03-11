<?php
try {
    $pdo = new PDO('mysql:host=localhost', 'root', '');
    $pdo->exec('CREATE DATABASE IF NOT EXISTS 4bito_retro_sports CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    echo "DB creada/verificada OK\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
