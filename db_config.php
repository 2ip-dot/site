<?php
// ========== КОНФИГ БАЗЫ ДАННЫХ ==========
define('DB_HOST', 'localhost');
define('DB_NAME', 'g9050059_user');
define('DB_USER', 'g9050059_user');
define('DB_PASS', 'g9050059_userg9050059_user');

// Подключение
function getDB() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        error_log("DB Error: " . $e->getMessage());
        return null;
    }
}
?>