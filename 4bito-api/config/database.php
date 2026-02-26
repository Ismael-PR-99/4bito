<?php
class Database {
    private $host = 'localhost';
    private $db   = '4bito_retro_sports';
    private $user = 'root';
    private $pass = '';

    public function getConnection() {
        try {
            $pdo = new PDO("mysql:host=$this->host;dbname=$this->db;charset=utf8mb4", $this->user, $this->pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
            exit();
        }
    }
}
?>