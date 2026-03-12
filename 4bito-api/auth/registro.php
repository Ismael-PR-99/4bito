<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../config/security.php';
require_once '../helpers/rate-limiter.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Método no permitido"]);
    exit();
}

// Rate limiting: máx 3 registros por IP cada 10 minutos
if (!rateLimitCheck('registro', 3, 600)) {
    rateLimitExceeded();
}

$data = json_decode(file_get_contents("php://input"), true);

$nombre   = isset($data['nombre'])   ? trim($data['nombre'])   : '';
$email    = isset($data['email'])    ? trim($data['email'])    : '';
$password = isset($data['password']) ? trim($data['password']) : '';

if (empty($nombre) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["error" => "Todos los campos son obligatorios (nombre, email, password)"]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "El formato del email no es válido"]);
    exit();
}

// Validar longitud mínima del password (OWASP recomienda >= 8)
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["error" => "La contraseña debe tener al menos 8 caracteres"]);
    exit();
}

// Validar longitud máxima del nombre
if (mb_strlen($nombre) > 100) {
    http_response_code(400);
    echo json_encode(["error" => "El nombre es demasiado largo (máx 100 caracteres)"]);
    exit();
}

try {
    $db = (new Database())->getConnection();

    $stmt = $db->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(["error" => "El email ya está registrado"]);
        exit();
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $rol = 'cliente';

    $insert = $db->prepare(
        "INSERT INTO usuarios (nombre, email, password, rol) VALUES (:nombre, :email, :password, :rol)"
    );
    $insert->bindParam(':nombre',   $nombre);
    $insert->bindParam(':email',    $email);
    $insert->bindParam(':password', $passwordHash);
    $insert->bindParam(':rol',      $rol);
    $insert->execute();

    $nuevoId = $db->lastInsertId();

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "data" => [
            "mensaje" => "Usuario registrado correctamente",
            "usuario" => [
                "id"     => $nuevoId,
                "nombre" => $nombre,
                "email"  => $email,
                "rol"    => $rol
            ]
        ]
    ]);

} catch (PDOException $e) {
    handleServerError('Error en el servidor', $e);
}
