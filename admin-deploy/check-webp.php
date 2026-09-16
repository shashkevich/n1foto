<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

$supported = function_exists('gd_info')
    && function_exists('imagewebp')
    && !empty(gd_info()['WebP Support']);

echo $supported
    ? 'Конвертация в WebP поддерживается'
    : 'Поддержка WebP через GD отсутствует';
