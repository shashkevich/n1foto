<?php
    // $db_host='localhost'; // ваш хост
    // $db_name='test'; // ваша бд
    // $db_user='root'; // пользователь бд
    // $db_pass=''; // пароль к бд
    // mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);// включаем сообщения об ошибках
    // $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name); // коннект с сервером бд
    // $mysqli->set_charset("utf8mb4"); // задаем кодировку
    
    // $result = $mysqli->query('SELECT * FROM `price`'); // запрос на выборку
    // while($row = $result->fetch_assoc())// получаем все строки в цикле по одной
    // {
    //     echo '<p>Запись id='.$row['id'].'. Текст: '.$row['text'].'</p>';// выводим данные
    // }

    // define('DB_HOST', 'localhost');
    // define('DBB_USER', 'root');
    // define('DB_PASSWORD', '');
    // define('DB_NAME', 'test');

    // $mysqli = new mysqli(DB_HOST, DBB_USER, DB_PASSWORD, DB_NAME);
    // if ($mysql->connect_errno) exit('ошибка');
    // $mysqli->set_charset('utf8');
    // $mysqli->close();

    // $sql = mysqli_query($mysqli, 'SELECT `ID` from `price`');
    // while ($result = $mysqli_fetch_array($sql)) {
    //     echo "{$result['ID']}<br>";
    // };
    
    // while($row = $result->fetch_assoc())// получаем все строки в цикле по одной
    // {
    //     echo '<p>Запись id='.$row['id'].'. Текст: '.$row['text'].'</p>';// выводим данные
    // }
?>

<?php
    $db = new PDO("mysql:host=localhost;dbname=test", "root", "");

    $info =[];    
?> 

