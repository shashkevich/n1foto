<?php
declare(strict_types=1);

function adminSitePages(): array
{
    return [
        [
            'id' => 'shary',
            'title' => 'Елочные игрушки',
            'path' => '/shary.html',
            'group' => 'Сувениры',
            'data' => [
                'cards' => 'db/tovary.json#shary',
                'seo' => 'php/seo.php#/shary.html',
                'template' => 'shary.html',
            ],
            'modules' => [
                [
                    'id' => 'seo',
                    'title' => 'SEO и заголовок',
                    'description' => 'Title, description, keywords и H1 из php/seo.php',
                    'status' => 'planned',
                ],
                [
                    'id' => 'cards',
                    'title' => 'Карточки товаров',
                    'description' => 'Название, цена, подпись и картинка из db/tovary.json',
                    'status' => 'planned',
                ],
                [
                    'id' => 'preview',
                    'title' => 'Предпросмотр страницы',
                    'description' => 'Быстрая ссылка на текущую страницу сайта',
                    'status' => 'active',
                ],
            ],
        ],
        [
            'id' => 'listovki',
            'title' => 'Листовки',
            'path' => '/listovki.html',
            'group' => 'Полиграфия',
            'manualEditor' => [
                'api' => '/api/manual-section-json.php?page=listovki',
                'source' => 'db/poligrafy.json#listovki-cifra',
                'sections' => ['listovki-cifra'],
            ],
            'data' => [
                'prices' => 'db/poligrafy.json#listovki,listovki-cifra',
                'seo' => 'php/seo.php#/listovki.html',
                'template' => 'listovki.html',
            ],
            'modules' => [
                [
                    'id' => 'seo',
                    'title' => 'SEO и заголовок',
                    'description' => 'Title, description, keywords и H1 из php/seo.php',
                    'status' => 'planned',
                ],
                [
                    'id' => 'poligrafy-prices',
                    'title' => 'Офсетная печать',
                    'description' => 'Импорт CSV партнера, коэффициенты, ручные правки и сохранение',
                    'status' => 'active',
                    'href' => '/prices.php?site_page=listovki',
                ],
                [
                    'id' => 'manual-copy-prices',
                    'title' => 'Цифровая печать',
                    'description' => 'Ручное редактирование карточек и цен без загрузки прайса',
                    'status' => 'active',
                ],
                [
                    'id' => 'notice',
                    'title' => 'Текст над калькулятором',
                    'description' => 'Предупреждение о примерной стоимости на странице',
                    'status' => 'planned',
                ],
            ],
        ],
        [
            'id' => 'vizitki',
            'title' => 'Визитки',
            'path' => '/vizitki.html',
            'group' => 'Полиграфия',
            'pageJson' => 'db/pages/vizitki.json',
            'manualSections' => ['vizitki-cifra', 'vizitki-offset'],
            'data' => [
                'prices' => 'db/pages/vizitki.json',
                'seo' => 'php/seo.php#/vizitki.html',
                'template' => 'vizitki.html',
            ],
            'modules' => [
                [
                    'id' => 'seo',
                    'title' => 'SEO и заголовок',
                    'description' => 'Title, description, keywords и H1 из php/seo.php',
                    'status' => 'planned',
                ],
                [
                    'id' => 'manual-copy-prices',
                    'title' => 'Карточки и ручные цены',
                    'description' => 'Ручное редактирование карточек, таблиц, изображений и примечаний',
                    'status' => 'active',
                ],
            ],
        ],
        [
            'id' => 'buklety',
            'title' => 'Буклеты',
            'path' => '/buklety.html',
            'group' => 'Полиграфия',
            'data' => [
                'prices' => 'db/poligrafy.json#buklety',
                'seo' => 'php/seo.php#/buklety.html',
                'template' => 'buklety.html',
            ],
            'modules' => [
                [
                    'id' => 'seo',
                    'title' => 'SEO и заголовок',
                    'description' => 'Title, description, keywords и H1 из php/seo.php',
                    'status' => 'planned',
                ],
                [
                    'id' => 'poligrafy-prices',
                    'title' => 'Калькуляторы и цены',
                    'description' => 'Импорт CSV, коэффициенты, ручные правки и JSON',
                    'status' => 'active',
                    'href' => '/prices.php?site_page=buklety',
                ],
            ],
        ],
        [
            'id' => 'pechat-na-odezhde',
            'title' => 'Печать на одежде',
            'path' => '/pechat-na-odezhde.html',
            'group' => 'Одежда и текстиль',
            'pageJson' => 'db/pages/pechat-na-odezhde.json',
            'manualSections' => ['print-methods'],
            'imageUpload' => [
                'directory' => 'img/odezhda/uploads',
                'sections' => ['print-methods'],
            ],
            'data' => [
                'prices' => 'db/pages/pechat-na-odezhde.json#print-methods',
                'seo' => 'php/seo.php#/pechat-na-odezhde.html',
                'template' => 'pechat-na-odezhde.html',
            ],
            'modules' => [
                [
                    'id' => 'seo',
                    'title' => 'SEO и заголовок',
                    'description' => 'Title, description, keywords и H1 из php/seo.php',
                    'status' => 'planned',
                ],
                [
                    'id' => 'manual-copy-prices',
                    'title' => 'Методы печати и цены',
                    'description' => 'Ручное редактирование карточек, калькуляторов, изображений и примечаний',
                    'status' => 'active',
                ],
                [
                    'id' => 'preview',
                    'title' => 'Предпросмотр страницы',
                    'description' => 'Открыть текущую страницу сайта и проверить калькуляторы',
                    'status' => 'active',
                ],
            ],
        ],
    ];
}

function adminSitePageById(string $id): ?array
{
    foreach (adminSitePages() as $page) {
        if ($page['id'] === $id) {
            return $page;
        }
    }

    return null;
}

function adminDefaultSitePage(): array
{
    return adminSitePages()[0];
}

function adminSitePagesByGroup(): array
{
    $groups = [];

    foreach (adminSitePages() as $page) {
        $groups[$page['group']][] = $page;
    }

    return $groups;
}

function adminPublicSiteBaseUrl(): string
{
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));

    if (strpos($host, 'admin.n1foto.com') !== false) {
        return 'https://n1foto.com';
    }

    return 'http://n1foto-test';
}

function adminPublicSiteUrl(string $path): string
{
    return rtrim(adminPublicSiteBaseUrl(), '/') . '/' . ltrim($path, '/');
}
