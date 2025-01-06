window.toggleWishlist = async function(productId, button) {
    try {
        const isInWishlist = button.classList.contains('active');
        const endpoint = isInWishlist ? '/wishlist/remove' : '/wishlist/add';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();
        console.log('Response Data:', data);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error(data.message || 'Failed to update wishlist');
        }

        if (data.success) {
            button.classList.toggle('active');
            const icon = button.querySelector('i');
            icon.classList.toggle('bi-heart');
            icon.classList.toggle('bi-heart-fill');

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: '#1a1a1a',
                color: '#fff'
            });

            Toast.fire({
                icon: 'success',
                title: isInWishlist ? 'Removed from wishlist' : 'Added to wishlist'
            });
        } else {
            throw new Error(data.message || 'Failed to update wishlist');
        }
    } catch (error) {
        console.error('Error updating wishlist:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to update wishlist',
            background: '#1a1a1a',
            color: '#fff'
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    function initOwlCarousel() {
        if (typeof jQuery !== 'undefined' && jQuery.fn.owlCarousel) {
            $('.owl-carousel').owlCarousel({
                loop: true,
                margin: 20,
                nav: true,
                dots: true,
                autoplay: true,
                autoplayTimeout: 5000,
                autoplayHoverPause: true,
                responsive: {
                    0: {
                        items: 1
                    },
                    576: {
                        items: 2
                    },
                    768: {
                        items: 3
                    },
                    992: {
                        items: 4
                    }
                }
            });
        }
    }

    initOwlCarousel();

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        });
    }

    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                alert(`Searching for: ${searchInput.value}`);
                searchInput.value = '';
            }
        });
    }

    const wishlistButtons = document.querySelectorAll('.wishlist-btn');
    wishlistButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            window.toggleWishlist(productId, this);
        });
    });
});
