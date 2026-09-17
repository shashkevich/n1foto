<?php
declare(strict_types=1);

const ADMIN_IMAGE_INPUT_LIMIT = 10 * 1024 * 1024;
const ADMIN_IMAGE_OUTPUT_LIMIT = 100000;
const ADMIN_IMAGE_MAX_EDGE = 1600;

/** Return a validated WebP payload; never return an oversized result. */
function adminOptimizeImage(string $source): string
{
    $size = @filesize($source);
    if ($size === false || $size === 0 || $size > ADMIN_IMAGE_INPUT_LIMIT) {
        throw new RuntimeException('Выберите изображение размером до 10 МБ.', 400);
    }
    $info = @getimagesize($source);
    $mime = is_array($info) ? ($info['mime'] ?? '') : '';
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        throw new RuntimeException('Разрешены только изображения JPG, PNG и WebP.', 400);
    }
    if (!function_exists('gd_info') || !function_exists('imagewebp') || empty(gd_info()['WebP Support'])) {
        throw new RuntimeException('На сервере недоступно сохранение WebP. Обратитесь к администратору.', 500);
    }

    $width = (int) $info[0];
    $height = (int) $info[1];
    // Compressed bytes alone do not bound the memory needed to decode an image.
    $pixels = $width * $height;
    $memorySetting = trim((string) ini_get('memory_limit'));
    $unit = strtolower(substr($memorySetting, -1));
    $multiplier = ['g' => 1024 ** 3, 'm' => 1024 ** 2, 'k' => 1024][$unit] ?? 1;
    $memoryLimit = (int) $memorySetting * $multiplier;
    $estimatedMemory = $pixels * 12 + 32 * 1024 * 1024;
    if ($width < 1 || $height < 1 || max($width, $height) > 16000 || $pixels > 12000000
        || ($memoryLimit > 0 && memory_get_usage(true) + $estimatedMemory > $memoryLimit)) {
        throw new RuntimeException('Слишком большое разрешение изображения. Уменьшите его размеры и загрузите снова.', 400);
    }

    $bytes = @file_get_contents($source);
    $decoded = $bytes !== false ? @imagecreatefromstring($bytes) : false;
    if ($decoded === false) {
        throw new RuntimeException('Не удалось прочитать изображение. Загрузите исправный статичный JPG, PNG или WebP.', 400);
    }

    try {
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($source);
            $orientation = (int) ($exif['Orientation'] ?? 1);
            if (in_array($orientation, [2, 5, 7], true)) imageflip($decoded, IMG_FLIP_HORIZONTAL);
            if ($orientation === 4) imageflip($decoded, IMG_FLIP_VERTICAL);
            $angle = [3 => 180, 5 => 90, 6 => -90, 7 => -90, 8 => 90][$orientation] ?? 0;
            if ($angle !== 0) {
                $rotated = @imagerotate($decoded, $angle, 0);
                if ($rotated === false) throw new RuntimeException('Не удалось повернуть изображение.', 500);
                $decoded = $rotated;
                unset($rotated);
            }
        }
        $width = imagesx($decoded);
        $height = imagesy($decoded);
        // A small, valid WebP needs no additional generation of lossy compression.
        if ($mime === 'image/webp' && strlen($bytes) <= ADMIN_IMAGE_OUTPUT_LIMIT
            && max($width, $height) <= ADMIN_IMAGE_MAX_EDGE) {
            return $bytes;
        }
        unset($bytes);

        $scale = min(1, ADMIN_IMAGE_MAX_EDGE / max($width, $height));
        for ($attempt = 0; $attempt < 12; $attempt++, $scale *= 0.8) {
            $targetWidth = max(1, (int) round($width * $scale));
            $targetHeight = max(1, (int) round($height * $scale));
            $candidate = imagecreatetruecolor($targetWidth, $targetHeight);
            if ($candidate === false) throw new RuntimeException('Не удалось обработать изображение.', 500);
            imagealphablending($candidate, false);
            imagesavealpha($candidate, true);
            imagefill($candidate, 0, 0, imagecolorallocatealpha($candidate, 0, 0, 0, 127));
            if (!imagecopyresampled($candidate, $decoded, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height)) {
                throw new RuntimeException('Не удалось уменьшить изображение.', 500);
            }
            foreach ([90, 84, 78, 72] as $quality) {
                ob_start();
                try {
                    $encoded = @imagewebp($candidate, null, $quality);
                    $output = (string) ob_get_contents();
                } finally {
                    ob_end_clean();
                }
                // GD can report success without output: verify the actual bytes.
                $outputInfo = $output !== '' ? @getimagesizefromstring($output) : false;
                if (!$encoded || !is_array($outputInfo) || ($outputInfo['mime'] ?? '') !== 'image/webp') {
                    throw new RuntimeException('Не удалось преобразовать изображение в WebP.', 500);
                }
                if (strlen($output) <= ADMIN_IMAGE_OUTPUT_LIMIT) return $output;
            }
            unset($candidate);
        }
        throw new RuntimeException('Не удалось уменьшить изображение до 100 КБ. Попробуйте другой файл.', 400);
    } finally {
        unset($decoded, $candidate);
    }
}

/** Save only a complete converted image, without replacing an existing file. */
function adminSaveOptimizedImage(string $source, string $target): void
{
    $output = adminOptimizeImage($source);
    $file = @fopen($target, 'xb');
    if ($file === false) throw new RuntimeException('Не удалось создать файл изображения.', 500);
    $written = @fwrite($file, $output);
    $closed = @fclose($file);
    if ($written !== strlen($output) || !$closed) {
        @unlink($target);
        throw new RuntimeException('Не удалось сохранить изображение на сервере.', 500);
    }
}
