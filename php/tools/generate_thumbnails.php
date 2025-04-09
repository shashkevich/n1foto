<?php
$baseGallery = realpath(__DIR__ . '/../../img/gallery');
$folders = glob($baseGallery . '/*', GLOB_ONLYDIR);

if (!$folders) {
    die("Не найдены папки внутри: $baseGallery");
}

foreach ($folders as $folder) {
    echo "<strong>Папка:</strong> $folder<br>";

    $images = glob($folder . '/*.{jpg,jpeg,png,gif}', GLOB_BRACE);
    if (!$images) {
        echo " - Нет изображений<br>";
        continue;
    }

    $thumbDir = $folder . '/thumbs';
    if (!is_dir($thumbDir)) {
        if (!mkdir($thumbDir, 0775)) {
            echo " - ❌ Не удалось создать папку: $thumbDir<br>";
            continue;
        } else {
            echo " - ✅ Создана папка: $thumbDir<br>";
        }
    }

    foreach ($images as $imgPath) {
        $imgName = basename($imgPath);
        $thumbPath = $thumbDir . '/' . $imgName;

        if (file_exists($thumbPath)) {
            echo " - Миниатюра уже есть: $thumbPath<br>";
            continue;
        }

        [$w, $h, $type] = getimagesize($imgPath);

        switch ($type) {
            case IMAGETYPE_JPEG: $src = imagecreatefromjpeg($imgPath); break;
            case IMAGETYPE_PNG:  $src = imagecreatefrompng($imgPath); break;
            case IMAGETYPE_GIF:  $src = imagecreatefromgif($imgPath); break;
            default:
                echo " - ⚠️ Пропущен неподдерживаемый формат: $imgName<br>";
                continue 2;
        }

        $newW = 400;
        $newH = intval($h * ($newW / $w));
        $thumb = imagecreatetruecolor($newW, $newH);
        imagecopyresampled($thumb, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
        imagejpeg($thumb, $thumbPath, 85);
        imagedestroy($src);
        imagedestroy($thumb);

        echo " - ✅ Создана миниатюра: $thumbPath<br>";
    }

    echo "<br>";
}

echo "<hr><strong>Готово!</strong>";
