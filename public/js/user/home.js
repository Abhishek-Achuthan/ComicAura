// Initialize Owl Carousel
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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Owl Carousel
    initOwlCarousel();

    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Scroll to top functionality
    const scrollTopButton = document.querySelector('.scroll-top');
    scrollTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const backToTopButton = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Add to cart functionality
    async function addToCart(productId) {
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
                showToast('Product added to cart successfully', 'success');
                updateCartCount();
            } else {
                showToast("Failed to add product to cart", 'error');
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            showToast("An unexpected error occurred", 'error');
        }
    }

    // Make addToCart available globally
    window.addToCart = addToCart;

    const addToCartButtons = document.querySelectorAll('.btn-primary');
    const cartCount = document.querySelector('.cart-count');
    let count = 0;

    addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.textContent === 'Add to Cart') {
                const productId = button.getAttribute('data-product-id');
                addToCart(productId);
                count++;
                cartCount.textContent = count;
                button.textContent = 'Added!';
                button.style.backgroundColor = 'var(--secondary-color)';
                setTimeout(() => {
                    button.textContent = 'Add to Cart';
                    button.style.backgroundColor = 'var(--primary-color)';
                }, 2000);
            }
        });
    });

    // Navbar background on scroll
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

    // Product card hover effect
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                alert(`Searching for: ${searchInput.value}`);
                searchInput.value = '';
            }
        });
    }
});

// Toast notification function
function showToast(message, type = 'info') {
    // You can implement a better toast notification here
    alert(message);
}

// Update cart count
function updateCartCount() {
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
