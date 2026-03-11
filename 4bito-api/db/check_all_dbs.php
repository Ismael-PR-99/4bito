<?php
$conn = new mysqli('localhost', 'root', '');
if ($conn->connect_error) { die('Error: ' . $conn->connect_error); }

echo "=== TODAS LAS BASES DE DATOS ===\n";
$r = $conn->query('SHOW DATABASES');
while ($row = $r->fetch_row()) echo "  " . $row[0] . "\n";

echo "\n=== TABLAS CON 'producto' o 'product' EN CUALQUIER BD ===\n";
$r = $conn->query("SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_NAME LIKE '%producto%' OR TABLE_NAME LIKE '%product%'");
while ($row = $r->fetch_row()) {
    echo "  " . $row[0] . "." . $row[1] . " (~" . $row[2] . " rows)\n";
}

echo "\n=== TABLAS EN 4bito_retro_sports ===\n";
$conn->select_db('4bito_retro_sports');
$r = $conn->query('SHOW TABLES');
while ($row = $r->fetch_row()) {
    $cnt = $conn->query("SELECT COUNT(*) FROM `{$row[0]}`")->fetch_row()[0];
    echo "  " . $row[0] . " ($cnt rows)\n";
}

echo "\n=== ESTRUCTURA DE productos EN 4bito_retro_sports ===\n";
$r = $conn->query('DESCRIBE productos');
if ($r) {
    while ($row = $r->fetch_row()) echo "  " . $row[0] . " | " . $row[1] . " | " . ($row[2]==='YES'?'NULL':'NOT NULL') . " | " . ($row[3]?:'') . "\n";
} else {
    echo "  (tabla no existe)\n";
}

echo "\n=== PRODUCTOS EN 4bito_retro_sports (primeros 5) ===\n";
$r = $conn->query('SELECT * FROM productos LIMIT 5');
if ($r && $r->num_rows > 0) {
    $fields = $r->fetch_fields();
    $cols = array_map(fn($f) => $f->name, $fields);
    echo "  Columnas: " . implode(', ', $cols) . "\n";
    while ($row = $r->fetch_assoc()) {
        $preview = [];
        foreach ($row as $k => $v) {
            $val = is_null($v) ? 'NULL' : (strlen($v) > 50 ? substr($v, 0, 50) . '...' : $v);
            $preview[] = "$k=$val";
        }
        echo "  → " . implode(' | ', $preview) . "\n";
    }
} else {
    echo "  (sin datos o tabla no existe)\n";
}

echo "\n=== CONTEO REAL POR BD ===\n";
$dbs = $conn->query('SHOW DATABASES');
while ($db = $dbs->fetch_row()) {
    $dbname = $db[0];
    if (in_array($dbname, ['information_schema','mysql','performance_schema','sys','phpmyadmin'])) continue;
    $conn->select_db($dbname);
    $tables = $conn->query('SHOW TABLES');
    if (!$tables) continue;
    while ($t = $tables->fetch_row()) {
        $tname = $t[0];
        if (stripos($tname, 'producto') !== false || stripos($tname, 'product') !== false) {
            $cnt = $conn->query("SELECT COUNT(*) FROM `$tname`")->fetch_row()[0];
            echo "  $dbname.$tname = $cnt productos reales\n";
            if ($cnt > 0) {
                $sample = $conn->query("SELECT * FROM `$tname` LIMIT 3");
                $fields = $sample->fetch_fields();
                echo "    Cols: " . implode(', ', array_map(fn($f) => $f->name, $fields)) . "\n";
                while ($row = $sample->fetch_assoc()) {
                    $preview = [];
                    foreach ($row as $k => $v) {
                        $val = is_null($v) ? 'NULL' : (strlen($v) > 40 ? substr($v, 0, 40) . '...' : $v);
                        $preview[] = "$k=$val";
                    }
                    echo "    → " . implode(' | ', $preview) . "\n";
                }
            }
        }
    }
}

$conn->close();
