<?php
declare(strict_types=1);

header('X-Robots-Tag: noindex, nofollow, noarchive', true);
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0', true);

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');

if (session_status() !== PHP_SESSION_ACTIVE) {
    $sessionPath = dirname(__DIR__) . '/storage/sessions';

    if (is_dir($sessionPath) && is_writable($sessionPath)) {
        session_save_path($sessionPath);
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD_HASH = '$2y$10$mH7FCOqmBgcPARaDumZ5MeZ4d213Qzf/kJ9kAfiqer3EwraToxZBC';

function adminIsAuthorized(): bool
{
    return !empty($_SESSION['admin_authorized']);
}

function adminLogout(): void
{
    $_SESSION = [];
    session_destroy();
}

function adminHandleLogin(): string
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return '';
    }

    $login = trim((string) ($_POST['login'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if (hash_equals(ADMIN_LOGIN, $login) && password_verify($password, ADMIN_PASSWORD_HASH)) {
        session_regenerate_id(true);
        $_SESSION['admin_authorized'] = true;
        header('Location: /', true, 303);
        exit;
    }

    return 'Неверный логин или пароль';
}

function adminRequireLogin(): void
{
    if (!adminIsAuthorized()) {
        header('Location: /', true, 303);
        exit;
    }
}

function adminEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
