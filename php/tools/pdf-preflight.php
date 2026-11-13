<?php
declare(strict_types=1);

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_INVALID_UTF8_SUBSTITUTE);
}

function inspectUpload(): array
{
    $maxBytes = 20 * 1024 * 1024;
    $upload = $_FILES['pdf'] ?? [];
    $uploadError = $upload['error'] ?? UPLOAD_ERR_NO_FILE;
    if (in_array($uploadError, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
        || (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $maxBytes + 64 * 1024
        || ($upload['size'] ?? 0) > $maxBytes) {
        return [413, ['error' => 'size']];
    }
    if ($uploadError !== UPLOAD_ERR_OK || !is_uploaded_file($upload['tmp_name'])) {
        return [400, ['error' => 'upload']];
    }

    $path = $upload['tmp_name'];
    try {
        $signature = file_get_contents($path, false, null, 0, 8);
        if ($signature === false || !preg_match('/^%PDF-[12]\.\d$/D', $signature)) {
            return [422, ['error' => 'invalid']];
        }
        return runInspection($path);
    } finally {
        unlink($path);
    }
}

function preflightPython(): string
{
    $configured = getenv('PDF_PREFLIGHT_PYTHON');
    if ($configured !== false && $configured !== '') {
        return $configured;
    }
    if (PHP_OS_FAMILY !== 'Windows') {
        return 'python3';
    }

    // Open Server can replace PATH. Look for a per-user Python.org install.
    $appData = getenv('LOCALAPPDATA');
    if ($appData !== false && $appData !== '') {
        $installs = glob($appData . '/Programs/Python/Python3*/python.exe') ?: [];
        natsort($installs);
        if ($installs) {
            return end($installs);
        }
    }
    return 'python.exe';
}

function runInspection(string $path): array
{
    if (!function_exists('proc_open')) {
        return [503, ['error' => 'unavailable']];
    }

    // A host-wide lock limits concurrent parser processes for this site.
    $lock = fopen(sys_get_temp_dir() . '/n1foto-preflight-' . hash('sha256', __DIR__) . '.lock', 'c');
    if ($lock === false) {
        return [503, ['error' => 'unavailable']];
    }

    $output = null;
    try {
        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            return [503, ['error' => 'busy']];
        }
        $output = tmpfile();
        if ($output === false) {
            return [503, ['error' => 'unavailable']];
        }

        $python = preflightPython();
        $script = dirname(__DIR__, 2) . '/tools/pdf-preflight/inspect_pdf.py';
        $null = PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null';
        $process = proc_open(
            [$python, '-I', '-B', $script, $path],
            [0 => ['file', $null, 'r'], 1 => $output, 2 => ['file', $null, 'w']],
            $pipes
        );
        if (!is_resource($process)) {
            return [503, ['error' => 'unavailable']];
        }

        try {
            $deadline = hrtime(true) + 15_000_000_000;
            do {
                $status = proc_get_status($process);
                if (!$status['running']) {
                    break;
                }
                if (hrtime(true) >= $deadline) {
                    return [422, ['error' => 'limit']];
                }
                usleep(50_000);
            } while (true);
        } finally {
            if ($status['running'] ?? true) {
                proc_terminate($process, 9);
            }
            proc_close($process);
        }

        rewind($output);
        $result = json_decode(stream_get_contents($output, 128 * 1024), true);
        if (!is_array($result)) {
            if (($status['signaled'] ?? false) === true) {
                return [422, ['error' => 'limit']];
            }
            error_log('PDF preflight worker returned no report; check Python installation.');
            return [503, ['error' => 'unavailable']];
        }
        return [isset($result['error']) ? 422 : 200, $result];
    } finally {
        if (is_resource($output)) {
            fclose($output);
        }
        fclose($lock);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'method']);
    return;
}

ignore_user_abort(true);
[$status, $body] = inspectUpload();
respond($status, $body);
