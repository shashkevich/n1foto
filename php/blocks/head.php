<?php
require ('php/seo.php');
global $title_arr;
$link = $title_arr[$_SERVER["SCRIPT_NAME"]]?>
<?php echo '<title>'. $link['title'].'</title>'?>

<meta charset="UTF-8">

<?php echo '<meta name="description" content="' . $title_arr[$_SERVER["SCRIPT_NAME"]]['description'] . '" />' ?>
<?php echo '<meta name="keywords" content="' . $title_arr[$_SERVER["SCRIPT_NAME"]]['keywords'] . '" />' ?>

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="icon" href="https://n1foto.com/favicon.svg" type="image/x-icon">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
<link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="css/main.min.css">
