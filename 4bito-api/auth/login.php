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
require_once '../helpers/jwt.php';
require_once '../helpers/rate-limiter.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Método no permitido"]);
    exit();
}

// Rate limiting: máx 5 intentos de login por IP cada 5 minutos
if (!rateLimitCheck('login', 5, 300)) {
    rateLimitExceeded();
}

$data = json_decode(file_get_contents("php://input"), true);

$email    = isset($data['email'])    ? trim($data['email'])    : '';
$password = isset($data['password']) ? trim($data['password']) : '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["error" => "Email y password son obligatorios"]);
    exit();
}

try {
    $db = (new Database())->getConnection();

    $stmt = $db->prepare(
        "SELECT id, nombre, email, password, rol FROM usuarios WHERE email = :email LIMIT 1"
    );
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        http_response_code(401);
        echo json_encode(["error" => "Credenciales incorrectas"]);
        exit();
    }

    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!password_verify($password, $usuario['password'])) {
        http_response_code(401);
        echo json_encode(["error" => "Credenciales incorrectas"]);
        exit();
    }

    $payload = [
        "id"     => $usuario['id'],
        "nombre" => $usuario['nombre'],
        "email"  => $usuario['email'],
        "rol"    => $usuario['rol']
    ];

    $token = generarJWT($payload);

    http_response_code(200);
    echo json_encode([
        "mensaje" => "Login exitoso",
        "token"   => $token,
        "usuario" => [
            "id"     => $usuario['id'],
            "nombre" => $usuario['nombre'],
            "email"  => $usuario['email'],
            "rol"    => $usuario['rol']
        ]
    ]);

} catch (PDOException $e) {
    handleServerError('Error en el servidor', $e);
}
