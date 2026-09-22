<?php
declare(strict_types=1);
require __DIR__ . '/../../php/service-links.php';

// stdin allows deployment to validate the live JSON without replacing local data.
$root = dirname(__DIR__, 2);
$payload = in_array('--stdin', $argv, true) ? stream_get_contents(STDIN) : file_get_contents($root . '/db/main-page-cards.json');
$data = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
if (!is_array($data['main'] ?? null) || !$data['main']) {
    throw new RuntimeException('The service catalogue is empty or invalid.');
}
$errors = [];
$count = 0;
foreach ($data['main'] as $group) {
    if (!is_array($group) || !is_array($group['content'] ?? null)) {
        $errors[] = 'Invalid service group.';
        continue;
    }
    foreach ($group['content'] as $card) {
        $single = ['main' => [['content' => [$card]]]];
        if (!serviceLinkGroups($single, $root)) {
            $errors[] = 'Missing page or invalid service link: ' . json_encode($card['link'] ?? null, JSON_UNESCAPED_UNICODE);
        }
        $count++;
    }
}
if ($errors || !$count) {
    fwrite(STDERR, implode("\n", $errors) . "\nService link validation failed.\n");
    exit(1);
}
echo "Checked $count service links; all local targets exist. External URLs checked for syntax only.\n";
