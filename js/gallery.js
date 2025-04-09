document.addEventListener('DOMContentLoaded', function () {
    const galleryItems = document.querySelectorAll('.gallery-img');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('close');

    if (!lightbox || !lightboxImg || !closeBtn || galleryItems.length === 0) {
        console.warn('Галерея или элементы lightbox не найдены. Пропуск инициализации.');
        return;
    }

    galleryItems.forEach(img => {
        img.addEventListener('click', () => {
            const fullSrc = img.getAttribute('data-full') || img.src;
            lightboxImg.src = fullSrc;
            lightbox.classList.add('active');
        });
    });

    closeBtn.addEventListener('click', () => {
        lightbox.classList.remove('active');
        lightboxImg.src = '';
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
            lightboxImg.src = '';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
            lightboxImg.src = '';
        }
    });
});
