document.addEventListener('DOMContentLoaded', function() {
    const galleryThumbs = new Swiper('.gallery-thumbs', {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true,
        watchSlidesVisibility: true
    });

    const galleryMain = new Swiper('.gallery-main', {
        spaceBetween: 10,
        slidesPerView: 1,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        thumbs: {
            swiper: galleryThumbs
        }
    });

    const zoomContainers = document.querySelectorAll('.zoom-container');
    zoomContainers.forEach(container => {
        const img = container.querySelector('.zoom-image');
        
        container.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = container.getBoundingClientRect();
            const x = (e.clientX - left) / width * 100;
            const y = (e.clientY - top) / height * 100;
            
            img.style.transformOrigin = `${x}% ${y}%`;
        });
        
        container.addEventListener('mouseenter', () => {
            img.style.transform = 'scale(2)';
        });
        
        container.addEventListener('mouseleave', () => {
            img.style.transform = 'scale(1)';
        });
    });

    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decreaseQuantity');
    const increaseBtn = document.getElementById('increaseQuantity');

    if (decreaseBtn && increaseBtn && quantityInput) {
        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });

        increaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            const maxValue = parseInt(quantityInput.getAttribute('max'));
            if (currentValue < maxValue) {
                quantityInput.value = currentValue + 1;
            }
        });
    }
});
