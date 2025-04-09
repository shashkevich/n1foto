<?php


$pageName = pathinfo($_SERVER['PHP_SELF'], PATHINFO_FILENAME);
$galleryDir = "img/gallery/" . $pageName;
$thumbsDir = $galleryDir . "/thumbs";

// Вывод директории для отладки
// echo "<!-- galleryDir: $galleryDir -->\n";

$images = glob($galleryDir . "/*.{jpg,jpeg,png,gif,JPG,JPEG,PNG,GIF}", GLOB_BRACE);


function createThumbnail($src, $thumbPath, $thumbWidth = 400) {
    if (file_exists($thumbPath)) return;

    $info = getimagesize($src);
    $mime = $info['mime'];

    switch ($mime) {
        case 'image/jpeg':
            $image_create_func = 'imagecreatefromjpeg';
            $image_save_func = 'imagejpeg';
            break;
        case 'image/png':
            $image_create_func = 'imagecreatefrompng';
            $image_save_func = 'imagepng';
            break;
        case 'image/gif':
            $image_create_func = 'imagecreatefromgif';
            $image_save_func = 'imagegif';
            break;
        default:
            return;
    }

    $img = $image_create_func($src);
    $width = imagesx($img);
    $height = imagesy($img);
    $thumbHeight = floor($height * ($thumbWidth / $width));
    $tmp_img = imagecreatetruecolor($thumbWidth, $thumbHeight);

    imagecopyresampled($tmp_img, $img, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $width, $height);
    if (!file_exists(dirname($thumbPath))) {
        mkdir(dirname($thumbPath), 0777, true);
    }
    $image_save_func($tmp_img, $thumbPath);
}

if ($images && count($images) > 0): ?>
    <section class="py-5 text-center container">
        <h2 class="gallery-heading">Наши работы</h2>
        <div class="gallery">
            <?php foreach ($images as $index => $img): 
                $filename = basename($img);
                $thumb = "$thumbsDir/$filename";
                createThumbnail($img, $thumb, 400);
            ?>
                <div class="gallery-item">
                    <img 
                        src="<?= $thumb ?>" 
                        data-full="<?= $img ?>" 
                        alt="Work Sample <?= $index + 1 ?>" 
                        class="gallery-img"
                    >
                </div>
            <?php endforeach; ?>
        </div>

        <div class="lightbox" id="lightbox">
            <span class="close" id="close">&times;</span>
            <img class="lightbox-img" id="lightbox-img" src="" alt="Enlarged Work">
        </div>
    </section>
<?php endif; ?>

