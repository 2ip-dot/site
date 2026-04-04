<?php
session_start();

// ========== НАСТРОЙКИ ДОСТУПА ==========
// Меняй логин и пароль здесь!
$VALID_USERNAME = 'admin';
$VALID_PASSWORD = 'kot';
// =======================================

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if ($username === $VALID_USERNAME && $password === $VALID_PASSWORD) {
    $_SESSION['user_logged_in'] = true;
    $_SESSION['username'] = $username;
    $_SESSION['login_time'] = time();
    
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Неверный логин или пароль']);
}
?>