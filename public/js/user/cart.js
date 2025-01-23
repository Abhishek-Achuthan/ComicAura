// Set to store products in cart
let productsInCart = new Set();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Configure toastr
    toastr.options = {
        positionClass: "toast-top-right",
        timeOut: 2000
    };
    
    // Initialize products in cart from existing buttons
    document.querySelectorAll('.add-to-cart-btn.in-cart').forEach(button => {
        const productId = button.getAttribute('data-product-id');
        if (productId) {
            productsInCart.add(productId);
        }
    });
});

// Function to update a single button
function updateCartButton(button, productId) {
    if (!button) return;

    // Create new button to avoid event listener issues
    const newButton = document.createElement('button');
    newButton.id = button.id;
    newButton.className = button.className + ' in-cart';
    newButton.setAttribute('data-product-id', productId);
    newButton.innerHTML = '<i class="fas fa-shopping-cart"></i> Go to Cart';
    
    // Set up the click handler
    newButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = '/cart';
    };

    // Replace the old button
    if (button.parentNode) {
        button.parentNode.replaceChild(newButton, button);
    }
}

// Function to update all buttons for a product
function updateAllCartButtons(productId) {
    // Update all buttons with this productId
    document.querySelectorAll(`button[data-product-id="${productId}"]`).forEach(button => {
        updateCartButton(button, productId);
    });

    // Update buttons in carousel items (including cloned ones)
    const carousel = document.querySelector('.owl-carousel');
    if (carousel) {
        carousel.querySelectorAll(`button[data-product-id="${productId}"]`).forEach(button => {
            updateCartButton(button, productId);
        });
    }
}

// Main function to add item to cart
async function addToCart(productId, button) {
    // Prevent adding if already in cart
    if (!button || button.classList.contains('in-cart')) {
        return;
    }

    try {
        // Show loading state
        button.disabled = true;
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        // Make API call
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (data.success) {
            // Update cart count in header
            const cartCount = document.getElementById('cartCount');
            if (cartCount) {
                cartCount.textContent = data.cartCount;
            }

            // Add to tracking set
            productsInCart.add(productId);

            // Show success message
            toastr.success('Item added to cart');

            // Update all instances of the button
            updateAllCartButtons(productId);

            // If in carousel, update after a slight delay
            const carousel = document.querySelector('.owl-carousel');
            if (carousel) {
                setTimeout(() => {
                    updateAllCartButtons(productId);
                }, 100);
            }
        } else {
            // Show error and reset button
            toastr.error(data.message || 'Failed to add item');
            button.innerHTML = originalContent;
            button.classList.remove('in-cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        toastr.error('Failed to add item');
        button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        button.classList.remove('in-cart');
    } finally {
        button.disabled = false;
    }
}

// Function to check if a product is in cart
function isProductInCart(productId) {
    return productsInCart.has(productId);
}

// Function to update carousel buttons after movement
function updateCarouselButtons() {
    productsInCart.forEach(productId => {
        updateAllCartButtons(productId);
    });
}

// Export functions for use in other files
let productsInCart = new Set();

document.addEventListener('DOMContentLoaded', () => {
    toastr.options = {
        positionClass: "toast-top-right",
        timeOut: 2000
    };

    
    document.querySelectorAll('.add-to-cart-btn.in-cart').forEach(button => {
        const productId = button.getAttribute('data-product-id');
        if (productId) {
            productsInCart.add(productId);
        }
    });

    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (this.disabled) return;
            
            const productId = this.getAttribute('data-id');
            const action = this.classList.contains('increase') ? 'increase' : 'decrease';
            const quantityInput = this.parentElement.querySelector('.quantity-input');
            const currentQty = parseInt(quantityInput.value);

            if (action === 'increase' && currentQty >= 5) {
                toastr.warning('Maximum 5 items allowed');
                return;
            }
            if (action === 'decrease' && currentQty <= 1) {
                toastr.warning('Minimum quantity is 1');
                return;
            }

            this.disabled = true;
            
            try {
                const response = await fetch('/updateCartQuantity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prodId: productId, action })
                });

                const data = await response.json();

                if (data.success) {
                    quantityInput.value = action === 'increase' ? currentQty + 1 : currentQty - 1;
                    
                    const cartItem = this.closest('.cart-item');
                    const priceContainer = cartItem.querySelector('.price-container');
                    const regularPrice = parseFloat(priceContainer.dataset.regularPrice);
                    const salePrice = parseFloat(priceContainer.dataset.salePrice);
                    const effectivePrice = salePrice < regularPrice ? salePrice : regularPrice;
                    const newQuantity = parseInt(quantityInput.value);

                    // Update price display
                    if (salePrice < regularPrice) {
                    priceContainer.innerHTML = `
                        <span class="sale-price">₹${(salePrice * newQuantity).toFixed(2)}</span>
                        <span class="original-price">₹${(regularPrice * newQuantity).toFixed(2)}</span>
                    `;
                    } else {
                        priceContainer.innerHTML = `
                            <span class="regular-price">₹${(regularPrice * newQuantity).toFixed(2)}</span>
                        `;
                    }

                    document.getElementById('subtotal').textContent = `₹${data.itemSubtotal.toFixed(2)}`;
                    document.getElementById('tax').textContent = `₹${data.tax.toFixed(2)}`;
                    document.getElementById('total').textContent = `₹${data.total.toFixed(2)}`;
                    document.getElementById('itemsCount').textContent = `${data.cartCount} item${data.cartCount !== 1 ? 's' : ''}`;
                    
                    toastr.success('Cart updated');
                } else {
                    toastr.error(data.message || 'Update failed');
                    setTimeout(() => window.location.reload(), 1000);
                }
            } catch (error) {
                console.error('Error:', error);
                toastr.error('Failed to update cart');
            } finally {
                this.disabled = false;
            }
        });
    });
});

async function addToCart(productId, button) {
    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();
        
        if (data.success) {
            document.getElementById('cartCount').textContent = data.cartCount;
            toastr.success('Item added to cart');
            
            productsInCart.add(productId);
            updateAllCartButtons(productId);
        } else {
            toastr.error(data.message || 'Failed to add item');
        }
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to add item');
    }
}

function updateAllCartButtons(productId) {
    document.querySelectorAll(`button[data-product-id="${productId}"]`).forEach(button => {
        updateCartButton(button);
    });
}

function updateCartButton(button) {
    if (!button) return;
    
    button.innerHTML = '<i class="fas fa-shopping-cart"></i> Go to Cart';
    button.classList.add('in-cart');
    button.onclick = () => window.location.href = '/cart';
}

// Function to check if a product is in cart
function isProductInCart(productId) {
    return productsInCart.has(productId);
}

// Function to update button states after carousel movement
function updateCarouselButtons() {
    productsInCart.forEach(productId => {
        updateAllCartButtons(productId);
    });
}

async function removeFromCart(productId) {
    try {
        const response = await fetch('/cart/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();
        
        if (data.success) {
            const cartItem = document.querySelector(`.cart-item[data-id="${productId}"]`);
            if (cartItem) cartItem.remove();
            
            document.getElementById('cartCount').textContent = data.cartCount;
            toastr.success('Item removed from cart');
            
            if (data.cartCount === 0) {
                setTimeout(() => location.reload(), 500);
            }
        } else {
            toastr.error(data.message || 'Failed to remove item');
        }
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to remove item');
    }
}

// Export functions for use in other files
window.addToCart = addToCart;
window.isProductInCart = isProductInCart;
window.updateCarouselButtons = updateCarouselButtons;
