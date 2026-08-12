<?php
declare(strict_types=1);

function adminSiteRootPath(): string
{
    $adminRoot = dirname(__DIR__);
    $localSiteRoot = dirname($adminRoot);

    if (is_dir($localSiteRoot . '/db')) {
        return $localSiteRoot;
    }

    return dirname($adminRoot, 2) . '/n1foto.com/public_html';
}

function adminSiteFilePath(string $relativePath): string
{
    return adminSiteRootPath() . '/' . ltrim($relativePath, '/');
}
