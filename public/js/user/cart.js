function showToast(type, message) {
    const toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });

    toast.fire({
        icon: type,
        title: message
    });
}

async function addToCart(productId) {
    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (!response.ok) {
            // Show the error toast message from the server
            showToast(data.toast.type || 'error', data.toast.message || 'Something went wrong');
            return;
        }

        const cartCountElement = document.getElementById('cartCount');
        if (cartCountElement && data.cartCount) {
            cartCountElement.textContent = data.cartCount;
        }

        showToast(data.toast.type || 'success', data.toast.message || 'Item added to cart');

    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('error', 'Failed to add item to cart');
    }
}

async function removeFromCart(productId) {
    try {
        const response = await fetch('/cart/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.toast.type || 'error', data.toast.message || 'Something went wrong');
            return false;
        }

        showToast(data.toast.type || 'success', data.toast.message || 'Item removed from cart');
        return true;

    } catch (error) {
        console.error('Error removing from cart:', error);
        showToast('error', 'Failed to remove item from cart');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const increaseButtons = document.querySelectorAll('.quantity-btn.increase');
    const decreaseButtons = document.querySelectorAll('.quantity-btn.decrease');

    // Handle increase button clicks
    increaseButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.dataset.id;
            const quantityInput = button.parentElement.querySelector('.quantity-input');
            const currentQty = parseInt(quantityInput.value);

            if (currentQty >= 5) {
                showToast('warning', 'Maximum 5 items allowed per product');
                return;
            }

            try {
                const response = await fetch('/cart/update-quantity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prodId: productId, action: 'increase' })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Update quantity
                    quantityInput.value = currentQty + 1;

                    // Update totals
                    document.getElementById('subtotal').textContent = `₹${data.itemSubtotal.toFixed(2)}`;
                    document.getElementById('tax').textContent = `₹${data.tax.toFixed(2)}`;
                    document.getElementById('total').textContent = `₹${data.total.toFixed(2)}`;
                    document.getElementById('itemsCount').textContent = `${data.cartCount} item${data.cartCount !== 1 ? 's' : ''}`;
                    document.getElementById('cartCount').textContent = data.cartCount;

                    showToast('success', 'Cart updated successfully');
                } else {
                    showToast('error', data.toast?.message || 'Failed to update cart');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('error', 'Failed to update cart');
            }
        });
    });

    // Handle decrease button clicks
    decreaseButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.dataset.id;
            const quantityInput = button.parentElement.querySelector('.quantity-input');
            const currentQty = parseInt(quantityInput.value);

            if (currentQty <= 1) {
                showToast('warning', 'Minimum quantity is 1');
                return;
            }

            try {
                const response = await fetch('/cart/update-quantity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prodId: productId, action: 'decrease' })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Update quantity
                    quantityInput.value = currentQty - 1;

                    // Update totals
                    document.getElementById('subtotal').textContent = `₹${data.itemSubtotal.toFixed(2)}`;
                    document.getElementById('tax').textContent = `₹${data.tax.toFixed(2)}`;
                    document.getElementById('total').textContent = `₹${data.total.toFixed(2)}`;
                    document.getElementById('itemsCount').textContent = `${data.cartCount} item${data.cartCount !== 1 ? 's' : ''}`;
                    document.getElementById('cartCount').textContent = data.cartCount;

                    showToast('success', 'Cart updated successfully');
                } else {
                    showToast('error', data.toast?.message || 'Failed to update cart');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('error', 'Failed to update cart');
            }
        });
    });
});
