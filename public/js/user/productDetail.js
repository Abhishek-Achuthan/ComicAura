async function addToCartWithQuantity(productId) {
    try {
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const maxStock = parseInt(document.getElementById('quantity').getAttribute('max')) || 0;
        
        // Frontend validations
        if (quantity < 1) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Quantity',
                text: 'Please select at least 1 item'
            });
            return;
        }

        if (quantity > maxStock) {
            Swal.fire({
                icon: 'error',
                title: 'Not Enough Stock',
                text: `Only ${maxStock} items available in stock`
            });
            return;
        }

        if (quantity > 5) {
            Swal.fire({
                icon: 'error',
                title: 'Quantity Limit Exceeded',
                text: 'Maximum 5 items allowed per product'
            });
            return;
        }
        
        const response = await fetch('/addToCartWithQuantity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: productId,
                quantity: quantity
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update cart count in UI if available
            if (data.cartCount) {
                const cartCountElement = document.querySelector('.cart-count');
                if (cartCountElement) {
                    cartCountElement.textContent = data.cartCount;
                }
            }

            Swal.fire({
                icon: 'success',
                title: 'Added to Cart!',
                text: 'Product has been added to your cart.',
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: data.message || 'Failed to add to cart'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong!'
        });
    }
}

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
