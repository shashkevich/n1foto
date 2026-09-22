<?php
declare(strict_types=1);

/** Build public navigation from the same editable catalogue as the header. */
function serviceLinkGroups(array $data, string $root): array
{
    $groups = [];
    $seen = [];
    foreach ((is_array($data['main'] ?? null) ? $data['main'] : []) as $group) {
        if (!is_array($group) || !is_array($group['content'] ?? null)) {
            continue;
        }
        $links = [];
        foreach ($group['content'] as $card) {
            if (!is_array($card)) {
                continue;
            }
            $name = trim((string) ($card['name'] ?? $card['title'] ?? ''));
            $url = trim((string) ($card['link'] ?? ''));
            $parts = parse_url($url);
            if ($name === '' || !$parts || isset($parts['user']) || isset($parts['pass']) || preg_match('/[\x00-\x20\\\\]/', $url)) {
                continue;
            }
            $host = strtolower($parts['host'] ?? '');
            $scheme = strtolower($parts['scheme'] ?? '');
            if ($host !== '' && !in_array($scheme, ['http', 'https'], true)) {
                continue;
            }
            if ($host !== '' && !filter_var($url, FILTER_VALIDATE_URL)) {
                continue;
            }
            if ($host !== '' && !in_array($host, ['n1foto.com', 'www.n1foto.com', 'n1foto-test'], true)) {
                $href = $url;
            } else {
                if ($host === '' && $scheme !== '') {
                    continue;
                }
                $path = '/' . ltrim($parts['path'] ?? '', '/');
                if (!preg_match('~^/[a-z0-9-]+\.html$~D', $path) || !is_file($root . $path)) {
                    continue;
                }
                $href = $path;
            }
            if (isset($seen[$href])) {
                continue;
            }
            $seen[$href] = true;
            $links[] = ['name' => $name, 'href' => $href];
        }
        if ($links) {
            $groups[] = ['title' => trim((string) ($group['nav_title'] ?? $group['title'] ?? 'Услуги')), 'links' => $links];
        }
    }
    return $groups;
}
