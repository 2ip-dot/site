<?php
session_start();
require_once 'db_config.php';

// Проверка авторизации
if (!isset($_SESSION['user_logged_in']) || $_SESSION['user_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Только AJAX запросы
if (empty($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] !== 'XMLHttpRequest') {
    http_response_code(403);
    die('Direct access forbidden');
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$search  = trim($_GET['search']  ?? '');
$machine = trim($_GET['machine'] ?? '');
$volume  = trim($_GET['volume']  ?? '');

$pdo = getDB();
if (!$pdo) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

try {
    $sql    = 'SELECT machine, volume, name, dorn, nozzle, knife, weight FROM products WHERE 1=1';
    $params = [];

    if ($search !== '') {
        $sql .= ' AND (name LIKE :search OR machine LIKE :search OR volume LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }
    if ($machine !== '') {
        $sql .= ' AND machine = :machine';
        $params[':machine'] = $machine;
    }
    if ($volume !== '') {
        $sql .= ' AND volume = :volume';
        $params[':volume'] = $volume;
    }

    $sql .= ' ORDER BY name';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $data = array_map(
        fn($r) => [$r['machine'], $r['volume'], $r['name'], $r['dorn'], $r['nozzle'], $r['knife'], $r['weight']],
        $stmt->fetchAll()
    );

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

} catch (PDOException $e) {
    error_log('Query error: ' . $e->getMessage());
    echo json_encode(['error' => 'Database error']);
}
