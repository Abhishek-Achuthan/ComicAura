document.addEventListener('DOMContentLoaded', () => {
    toastr.options = {
        positionClass: "toast-top-right",
        timeOut: 2000
    };

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
                    const price = parseFloat(cartItem.dataset.price);
                    const total = price * parseInt(quantityInput.value);
                    cartItem.querySelector('.price-container').innerHTML = `₹${total.toFixed(2)}`;

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

            // Update button
            if (button) {
                button.innerHTML = '<i class="fas fa-shopping-cart"></i> Go to Cart';
                button.classList.add('in-cart');
                button.onclick = () => window.location.href = '/cart';
            }
        } else {
            toastr.error(data.message || 'Failed to add item');
        }
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to add item');
    }
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
                setTimeout(() => location.reload(), 500);h
            }
        } else {
            toastr.error(data.message || 'Failed to remove item');
        }
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to remove item');
    }
}
