<?php
session_start();
require_once 'db_config.php';

// Проверка авторизации
if (!isset($_SESSION['user_logged_in']) || $_SESSION['user_logged_in'] !== true) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Только AJAX запросы
if (empty($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] != 'XMLHttpRequest') {
    header('HTTP/1.0 403 Forbidden');
    die('Direct access forbidden');
}

header('Content-Type: application/json; charset=utf-8');

// Получаем параметры фильтрации
$search = $_GET['search'] ?? '';
$machine = $_GET['machine'] ?? '';
$volume = $_GET['volume'] ?? '';

$pdo = getDB();
if (!$pdo) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

try {
    $sql = "SELECT machine, volume, name, dorn, nozzle, knife, weight FROM products WHERE 1=1";
    $params = [];
    
    if (!empty($search)) {
        $sql .= " AND (name LIKE :search OR machine LIKE :search OR volume LIKE :search)";
        $params[':search'] = "%$search%";
    }
    
    if (!empty($machine)) {
        $sql .= " AND machine = :machine";
        $params[':machine'] = $machine;
    }
    
    if (!empty($volume)) {
        $sql .= " AND volume = :volume";
        $params[':volume'] = $volume;
    }
    
    // УБИРАЕМ ЛИМИТ - грузим все данные
    $sql .= " ORDER BY name";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();
    
    // Преобразуем в формат массива как раньше
    $data = array_map(function($row) {
        return [
            $row['machine'],
            $row['volume'],
            $row['name'],
            $row['dorn'],
            $row['nozzle'],
            $row['knife'],
            $row['weight']
        ];
    }, $results);
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Query error: " . $e->getMessage());
    echo json_encode(['error' => 'Database error']);
}
?>