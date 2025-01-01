// Make toggleWishlist available globally before DOMContentLoaded
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

        if (!response.ok) {
            if (response.status === 401) {
                // Redirect to login if not authenticated
                window.location.href = '/login';
                return;
            }
            throw new Error(data.message || 'Failed to update wishlist');
        }

        if (data.success) {
            // Toggle button state
            button.classList.toggle('active');
            const icon = button.querySelector('i');
            icon.classList.toggle('bi-heart');
            icon.classList.toggle('bi-heart-fill');

            // Show success message
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

    async function addToCart(productId, button) {
        try {
            const response = await fetch("/addToCart", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ productId: productId })
            });
            
            if(!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if(data.success) {
                // Show success message using SweetAlert2
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
                    title: 'Product added to cart successfully'
                });
                
                updateCartCount();

                // Update button to "Go to Cart"
                button.innerHTML = '<i class="fas fa-shopping-cart"></i> Go to Cart';
                button.classList.add('in-cart');
                button.onclick = () => window.location.href = '/cart';
            } else {
                // Show error message
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to add product to cart',
                    background: '#1a1a1a',
                    color: '#fff'
                });
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An unexpected error occurred',
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    }

    window.addToCart = addToCart;

    function showToast(message, type = 'success') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            background: '#1a1a1a',
            color: '#fff'
        });

        Toast.fire({
            icon: type,
            title: message
        });
    }

    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn:not(.in-cart)');
    const cartCount = document.querySelector('.cart-count');
    let count = 0;

    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = button.getAttribute('data-product-id');
            if (productId) {
                addToCart(productId, button);
            }
        });
    });

    // Add click event listeners to all wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent any parent link clicks
            const productId = this.dataset.productId;
            window.toggleWishlist(productId, this);
        });
    });

    async function updateCartCount() {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            fetch('/cart/count')
                .then(response => response.json())
                .then(data => {
                    cartCountElement.textContent = data.count;
                })
                .catch(error => console.error('Error updating cart count:', error));
        }
    }
});


