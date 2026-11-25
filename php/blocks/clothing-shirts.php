<?php
$shirtGroups = [
    'adult' => [
        'label' => 'Взрослые',
        'price' => 550,
        'sizes' => [
            ['XXS', 66, 46, 21],
            ['XS', 68, 48, 21],
            ['S', 70, 50, 22],
            ['M', 72, 52, 22],
            ['L', 74, 54, 23],
            ['XL', 76, 56, 23],
            ['XXL', 78, 58, 24],
            ['3XL', 80, 62, 24],
            ['4XL', 82, 66, 25],
            ['5XL', 84, 70, 25],
            ['6XL', 86, 74, 26],
        ],
    ],
    'child' => [
        'label' => 'Детские',
        'price' => 450,
        'sizes' => [
            ['98', 40, 31, 11],
            ['104', 42, 33, 12],
            ['110', 44, 34, 12],
            ['116', 46, 35, 13],
            ['122', 48, 36, 13],
            ['128', 50, 37, 14],
            ['134', 52, 38, 14],
            ['140', 54, 40, 15],
            ['146', 56, 42, 15],
            ['152', 58, 42, 16],
            ['158', 60, 44, 16],
            ['164', 62, 46, 17],
        ],
    ],
];
?>
<section class="shirt-card" id="dtg" aria-labelledby="shirt-card-title">
    <div class="shirt-card__reference">
        <div class="shirt-card__photos">
            <figure>
                <img src="img/odezhda/tshirt-white.webp" width="675" height="900" alt="Белая футболка на вешалке">
                <figcaption>Белая</figcaption>
            </figure>
            <figure>
                <img src="img/odezhda/tshirt-black.webp" width="900" height="1200" alt="Чёрная футболка на вешалке">
                <figcaption>Чёрная</figcaption>
            </figure>
        </div>

        <figure class="shirt-card__measurements">
            <svg viewBox="0 0 154 142" aria-hidden="true" focusable="false">
                <defs>
                    <marker id="shirt-measure-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M0 0 8 4 0 8Z" fill="currentColor"/>
                    </marker>
                </defs>
                <path class="shirt-card__outline" d="M57 15Q77 24 97 15L121 25 149 62 127 79 115 67V130Q77 135 39 130V67L27 79 5 62 33 25Z M57 15Q77 51 97 15"/>
                <g class="shirt-card__arrows" marker-start="url(#shirt-measure-arrow)" marker-end="url(#shirt-measure-arrow)">
                    <path d="M53 21V127"/>
                    <path d="M40 72H114"/>
                    <path d="M121 30 144 61"/>
                </g>
                <text x="59" y="50">A</text>
                <text x="77" y="66">B</text>
                <text x="121" y="58">C</text>
            </svg>
            <figcaption>A — длина<br>B — ширина<br>C — длина рукава<br><span>Все замеры в см</span></figcaption>
        </figure>
    </div>

    <div class="shirt-card__sizes">
        <header class="shirt-card__intro">
            <h2 class="shirt-card__title" id="shirt-card-title">Футболки хлопок 100%</h2>
            <p class="shirt-card__availability">в наличии или под заказ (возможны различные варианты цвета)</p>
        </header>
        <?php foreach ($shirtGroups as $groupId => $group): ?>
            <div class="shirt-card__panel" id="shirt-table-<?= $groupId ?>">
                <header class="shirt-card__group">
                    <h3><?= $group['label'] ?></h3>
                    <strong><?= $group['price'] ?> ₽</strong>
                </header>
                <table class="shirt-card__table" aria-describedby="shirt-size-note">
                    <caption class="visually-hidden"><?= $group['label'] ?> футболки. Размерная сетка в сантиметрах.</caption>
                    <thead>
                        <tr>
                            <th scope="col">Размер</th>
                            <th scope="col">A <span class="visually-hidden">— длина</span></th>
                            <th scope="col">B <span class="visually-hidden">— ширина</span></th>
                            <th scope="col">C <span class="visually-hidden">— длина рукава</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($group['sizes'] as [$size, $length, $width, $sleeve]): ?>
                            <tr>
                                <th scope="row"><?= $size ?></th>
                                <td><?= $length ?></td>
                                <td><?= $width ?></td>
                                <td><?= $sleeve ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endforeach; ?>
        <p class="shirt-card__note" id="shirt-size-note">Допустимое отклонение по ширине&nbsp;—&nbsp;5%, по&nbsp;длине&nbsp;—&nbsp;7%.</p>
    </div>
</section>
