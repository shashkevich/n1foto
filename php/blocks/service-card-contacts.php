<?php
$contactEscape = static fn($value): string => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$contactPhone = (string) ($serviceCard['contactPhone'] ?? '');
$contactDigits = preg_replace('/[^0-9]/', '', $contactPhone);
$contactTelegram = preg_replace('/[^a-zA-Z0-9_]/', '', (string) ($serviceCard['contactTelegram'] ?? ''));
$contactVk = preg_replace('/[^a-zA-Z0-9_.-]/', '', (string) ($serviceCard['contactVk'] ?? ''));
?>
<!-- Contact artwork adapted from the supplied SVG Repo icons. -->
<div class="service-card-contacts">
    <div class="service-card-contacts__phone-row">
        <?php if ($contactDigits !== ''): ?>
        <a class="service-card-contacts__icon service-card-contacts__icon--whatsapp" href="https://wa.me/<?= $contactEscape($contactDigits) ?>" target="_blank" rel="noopener noreferrer" aria-label="Написать в WhatsApp" title="WhatsApp">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="2 2 20 20" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M12,2 C6.47715,2 2,6.47715 2,12 C2,13.8896 2.52505,15.6594 3.43756,17.1683 L2.54581,20.2002 C2.32023,20.9672 3.03284,21.6798 3.79975,21.4542 L6.83171,20.5624 C8.34058,21.475 10.1104,22 12,22 C17.5228,22 22,17.5228 22,12 C22,6.47715 17.5228,2 12,2 Z M9.73821,14.2627 C11.7607,16.2852 13.692,16.5518 14.3739,16.5769 C15.4111,16.6151 16.421,15.823 16.8147,14.9042 C16.9112,14.6792 16.8871,14.4085 16.7255,14.2014 C16.1782,13.5005 15.4373,12.9983 14.7134,12.4984 C14.4006,12.282 13.9705,12.349 13.7401,12.6555 L13.1394,13.5706 C13.0727,13.6721 12.9402,13.707 12.8348,13.6467 C12.4283,13.4143 11.8356,13.018 11.4092,12.5916 C10.9833,12.1657 10.6111,11.5998 10.4022,11.2195 C10.3473,11.1195 10.3777,10.996 10.4692,10.928 L11.3927,10.2422 C11.6681,10.0038 11.7165,9.59887 11.5138,9.30228 C11.065,8.64569 10.5422,7.8112 9.7855,7.25926 C9.57883,7.1085 9.3174,7.09158 9.10155,7.18408 C8.1817,7.5783 7.38574,8.58789 7.42398,9.62695 C7.44908,10.3089 7.71572,12.2402 9.73821,14.2627 Z" fill="currentColor"/></svg>
        </a>
        <?php endif; ?>
        <?php if ($contactTelegram !== ''): ?>
        <a class="service-card-contacts__icon service-card-contacts__icon--telegram" href="https://t.me/<?= $contactEscape($contactTelegram) ?>" target="_blank" rel="noopener noreferrer" aria-label="Написать в Telegram" title="Telegram">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="2 2 20 20" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM12.3583 9.38244C11.3857 9.787 9.44177 10.6243 6.52657 11.8944C6.05318 12.0827 5.8052 12.2669 5.78263 12.4469C5.74448 12.7513 6.12559 12.8711 6.64455 13.0343C6.71515 13.0565 6.78829 13.0795 6.86327 13.1038C7.37385 13.2698 8.06068 13.464 8.41773 13.4717C8.74161 13.4787 9.1031 13.3452 9.50219 13.0711C12.226 11.2325 13.632 10.3032 13.7202 10.2831C13.7825 10.269 13.8688 10.2512 13.9273 10.3032C13.9858 10.3552 13.98 10.4536 13.9738 10.48C13.9361 10.641 12.4401 12.0318 11.6659 12.7515C11.4246 12.9759 11.2534 13.135 11.2184 13.1714C11.14 13.2528 11.0601 13.3298 10.9833 13.4038C10.509 13.8611 10.1532 14.204 11.003 14.764C11.4114 15.0331 11.7381 15.2556 12.0641 15.4776C12.4201 15.7201 12.7752 15.9619 13.2347 16.2631C13.3517 16.3398 13.4635 16.4195 13.5724 16.4971C13.9867 16.7925 14.3589 17.0579 14.8188 17.0155C15.086 16.991 15.362 16.7397 15.5022 15.9903C15.8335 14.2193 16.4847 10.382 16.6352 8.80081C16.6484 8.66228 16.6318 8.48498 16.6185 8.40715C16.6051 8.32932 16.5773 8.21842 16.4761 8.13633C16.3563 8.03911 16.1714 8.01861 16.0886 8.02C15.7125 8.0267 15.1354 8.22735 12.3583 9.38244Z" fill="currentColor"/></svg>
        </a>
        <?php endif; ?>
        <?php if ($contactDigits !== ''): ?>
        <a class="service-card-contacts__number" href="tel:+<?= $contactEscape($contactDigits) ?>"><?= $contactEscape($contactPhone) ?></a>
        <?php endif; ?>
    </div>
    <?php if ($contactVk !== ''): ?>
    <a class="service-card-contacts__vk" href="https://vk.com/<?= $contactEscape($contactVk) ?>" target="_blank" rel="noopener noreferrer">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="32.55 63.06 84.9 84.9" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M90.62 147.24C80.3 147.24 65.62 146.72 55.83 146.72C37.52 146.72 32.55 135.89 32.55 122.12C32.55 108.35 32.82 93.1198 32.82 87.8998C32.82 72.4298 39.67 63.8398 56.65 63.8398C62.93 63.8398 86.55 63.7798 94.59 63.7798C110.04 63.7798 117.45 70.1598 117.45 88.8398C117.45 93.4498 117.11 102.08 117.11 126.01C117.11 141.06 110 147.24 90.62 147.24ZM106.62 93.7298L96 86.1698L80.38 103.39L80.86 88.0898L66.3 87.8498L68 93.4398L68.34 110.44C63.04 109.52 56.58 96.2298 56.99 88.4398L43.12 88.6298C46.5 116.04 66.76 129.35 79.69 127.47L80 117.35C81 116.87 82.36 116.13 84 115.15L93.35 127.42L108.73 126.59L94 108C98.9452 103.948 103.209 99.1306 106.63 93.7298H106.62Z" fill="currentColor"/></svg>
        <span>vk.com/<?= $contactEscape($contactVk) ?></span>
    </a>
    <?php endif; ?>
</div>
