<?php
declare(strict_types=1);

/** Give legacy business cards stable upload targets without rewriting data on GET. */
function adminEnsurePageCardIds(string $pageId, array $data): array
{
    if ($pageId !== 'vizitki' || !is_array($data['sections'] ?? null)) {
        return $data;
    }
    $used = [];
    foreach ($data['sections'] as $section) {
        foreach (($section['cards'] ?? []) as $card) {
            if (!empty($card['id'])) $used[(string) $card['id']] = true;
        }
    }
    foreach ($data['sections'] as $sectionIndex => &$section) {
        foreach ($section['cards'] as $cardIndex => &$card) {
            if (!empty($card['id'])) continue;
            // Content and position make stale uploads fail instead of targeting another card.
            $fingerprint = $sectionIndex . ':' . $cardIndex . ':' . json_encode($card, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $base = 'vizitki-legacy-' . substr(hash('sha256', $fingerprint), 0, 20);
            $id = $base;
            for ($suffix = 1; isset($used[$id]); $suffix++) $id = $base . '-' . $suffix;
            $card['id'] = $id;
            $used[$id] = true;
        }
        unset($card);
    }
    unset($section);
    return $data;
}
