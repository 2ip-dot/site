<?php
session_start();

// ========== НАСТРОЙКИ ДОСТУПА ==========
// Меняй логин и пароль здесь!
$VALID_USERNAME = 'admin';
$VALID_PASSWORD = 'kot';
// =======================================

header('Content-Type: application/json');

// Принимаем только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input    = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if ($username === $VALID_USERNAME && $password === $VALID_PASSWORD) {
    session_regenerate_id(true); // защита от session fixation
    $_SESSION['user_logged_in'] = true;
    $_SESSION['username']       = $username;
    $_SESSION['login_time']     = time();
    echo json_encode(['success' => true]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Неверный логин или пароль']);
}
