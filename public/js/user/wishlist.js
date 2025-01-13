async function toggleWishlist(productId, button) {
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
                window.location.href = '/login';
                return;
            }
            throw new Error(data.message || 'Failed to update wishlist');
        }

        if (data.success) {
            button.classList.toggle('active');
            const icon = button.querySelector('i');
            
            if (button.classList.contains('active')) {
                icon.className = 'bi bi-heart-fill'; // Filled heart
            } else {
                icon.className = 'bi bi-heart'; // Outlined heart
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
        console.error('Error:', error);
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            background: '#1a1a1a',
            color: '#fff'
        });

        Toast.fire({
            icon: 'error',
            title: error.message || 'Failed to update wishlist'
        });
    }
}
