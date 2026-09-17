<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/admin-deploy/includes/image-upload.php';

function check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

$directory = sys_get_temp_dir() . '/n1foto-image-test-' . bin2hex(random_bytes(8));
check(mkdir($directory), 'Cannot create test directory');
$results = [];
try {
    // High-detail inputs force the size/quality fallback, not just a format rename.
    $noise = imagecreatetruecolor(900, 600);
    mt_srand(1234);
    for ($y = 0; $y < 600; $y++) {
        for ($x = 0; $x < 900; $x++) imagesetpixel($noise, $x, $y, mt_rand(0, 0xffffff));
    }
    imagejpeg($noise, $directory . '/photo.jpg', 90);
    imagewebp($noise, $directory . '/large.webp', 95);
    $png = imagecreatetruecolor(600, 400);
    imagecopy($png, $noise, 0, 0, 0, 0, 600, 400);
    imagepng($png, $directory . '/detail.png');
    foreach (['photo.jpg', 'detail.png', 'large.webp'] as $name) {
        $before = file_get_contents($directory . '/' . $name);
        check(strlen($before) > ADMIN_IMAGE_OUTPUT_LIMIT, "$name must exceed the output cap");
        check(strlen($before) <= ADMIN_IMAGE_INPUT_LIMIT, "$name must fit the input cap");
        $output = adminOptimizeImage($directory . '/' . $name);
        check(strlen($output) <= 100000, "$name exceeds 100 KB");
        $info = getimagesizefromstring($output);
        check($info['mime'] === 'image/webp', "$name is not WebP");
        check(abs($info[0] / $info[1] - 1.5) < 0.01, "$name changed proportions");
        check(file_get_contents($directory . '/' . $name) === $before, 'Input was modified');
        $results[] = "$name: " . strlen($before) . ' -> ' . strlen($output) . " bytes, {$info[0]}x{$info[1]}";
    }
    $alpha = imagecreatetruecolor(240, 120);
    imagealphablending($alpha, false);
    imagesavealpha($alpha, true);
    imagefill($alpha, 0, 0, imagecolorallocatealpha($alpha, 0, 0, 0, 127));
    imagefilledrectangle($alpha, 60, 30, 180, 90, imagecolorallocatealpha($alpha, 240, 30, 60, 0));
    imagepng($alpha, $directory . '/alpha.png');
    $output = adminOptimizeImage($directory . '/alpha.png');
    $decoded = imagecreatefromstring($output);
    check(imagesx($decoded) === 240 && imagesy($decoded) === 120, 'Small image was enlarged');
    check(imagecolorsforindex($decoded, imagecolorat($decoded, 0, 0))['alpha'] === 127, 'Transparency lost');
    check(imagecolorsforindex($decoded, imagecolorat($decoded, 120, 60))['alpha'] === 0, 'Opaque area lost');
    file_put_contents($directory . '/small.webp', $output);
    check(adminOptimizeImage($directory . '/small.webp') === $output, 'Small WebP was recompressed');

    $palette = imagecreate(100, 100);
    imagecolortransparent($palette, imagecolorallocate($palette, 255, 255, 255));
    imagefilledrectangle($palette, 20, 20, 80, 80, imagecolorallocate($palette, 80, 20, 240));
    imagepng($palette, $directory . '/palette.png');
    $decoded = imagecreatefromstring(adminOptimizeImage($directory . '/palette.png'));
    check(imagecolorsforindex($decoded, imagecolorat($decoded, 0, 0))['alpha'] === 127, 'Palette alpha lost');

    $wide = imagecreatetruecolor(2000, 1000);
    imagepng($wide, $directory . '/wide.png');
    $info = getimagesizefromstring(adminOptimizeImage($directory . '/wide.png'));
    check($info[0] === 1600 && $info[1] === 800, 'Long edge limit failed');

    // JPEG orientation must be applied before removing metadata.
    if (function_exists('exif_read_data')) {
        $corners = imagecreatetruecolor(200, 100);
        $colours = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        foreach ($colours as $i => $colour) {
            $x = ($i % 2) * 100;
            $y = intdiv($i, 2) * 50;
            imagefilledrectangle($corners, $x, $y, $x + 99, $y + 49, $colour);
        }
        ob_start(); imagejpeg($corners, null, 100); $jpeg = ob_get_clean();
        $orders = [1 => [0,1,2,3], 2 => [1,0,3,2], 3 => [3,2,1,0], 4 => [2,3,0,1],
            5 => [0,2,1,3], 6 => [2,0,3,1], 7 => [3,1,2,0], 8 => [1,3,0,2]];
        foreach ($orders as $orientation => $order) {
            $exif = "Exif\0\0II\x2a\0" . pack('Vv', 8, 1)
                . pack('vvVv', 0x0112, 3, 1, $orientation) . "\0\0" . pack('V', 0);
            $file = $directory . '/orientation.jpg';
            file_put_contents($file, substr($jpeg, 0, 2) . "\xff\xe1" . pack('n', strlen($exif) + 2) . $exif . substr($jpeg, 2));
            $decoded = imagecreatefromstring(adminOptimizeImage($file));
            check(imagesx($decoded) === ($orientation >= 5 ? 100 : 200), 'EXIF dimensions incorrect');
            foreach ($order as $position => $colourIndex) {
                $x = (int) (imagesx($decoded) * (($position % 2) ? .75 : .25));
                $y = (int) (imagesy($decoded) * ($position >= 2 ? .75 : .25));
                $actual = imagecolorat($decoded, $x, $y);
                foreach ([0, 8, 16] as $shift) {
                    check(abs((($actual >> $shift) & 255) - (($colours[$colourIndex] >> $shift) & 255)) < 35, "EXIF $orientation incorrect");
                }
            }
        }
    }

    file_put_contents($directory . '/invalid.jpg', 'not an image');
    file_put_contents($directory . '/oversized.jpg', str_repeat('x', ADMIN_IMAGE_INPUT_LIMIT + 1));
    foreach (['invalid.jpg', 'oversized.jpg'] as $name) {
        try { adminSaveOptimizedImage($directory . '/' . $name, $directory . '/failed.webp'); throw new LogicException('Invalid input accepted'); }
        catch (RuntimeException $error) { check($error->getCode() === 400, 'Wrong validation status'); }
        check(!file_exists($directory . '/failed.webp'), 'Failed conversion left an output');
    }
    adminSaveOptimizedImage($directory . '/alpha.png', $directory . '/saved.webp');
    check(filesize($directory . '/saved.webp') <= 100000, 'Saved file exceeds cap');
    $saved = file_get_contents($directory . '/saved.webp');
    try { adminSaveOptimizedImage($directory . '/photo.jpg', $directory . '/saved.webp'); throw new LogicException('Existing file overwritten'); }
    catch (RuntimeException $error) { check($error->getCode() === 500, 'Wrong write failure status'); }
    check(file_get_contents($directory . '/saved.webp') === $saved, 'Existing image changed');
    echo implode("\n", $results) . "\nPASS: WebP size cap, resize, alpha, palette, EXIF 1-8, passthrough, invalid input and safe writes.\n";
} finally {
    foreach (glob($directory . '/*') as $file) unlink($file);
    rmdir($directory);
}
