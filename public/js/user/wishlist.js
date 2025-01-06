
window.toggleWishlist = async function(productId, button) {
    try {
        // Debug: Initial state
        console.log('Initial button state:', {
            isActive: button.classList.contains('active'),
            buttonClasses: button.className,
            iconClasses: button.querySelector('i').className
        });

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
        console.log('Server Response:', data);  // Debug: Server response

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
            
            if (button.classList.contains('active')) {
                icon.className = 'fas fa-heart'; // Solid filled heart
            } else {
                icon.className = 'far fa-heart'; // Regular outlined heart
            }


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
