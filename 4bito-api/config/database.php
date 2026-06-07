<?php
class Database {
    private $host = 'localhost';
    private $port = '5432';
    private $db   = '4bito';
    private $user = 'postgres';
    private $pass = 'pi48ELFC*';

    public function getConnection() {
        try {
            $pdo = new PDO("pgsql:host=$this->host;port=$this->port;dbname=$this->db", $this->user, $this->pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error interno del servidor']);
            exit();
        }
    }
}
?>