async function toggleWishlist(productId, button) {
    try {
        const response = await fetch(`/wishlist/toggle/${productId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            button.classList.toggle('in-wishlist');
            
            // Show toast notification
            const toastMessage = button.classList.contains('in-wishlist') 
                ? 'Added to wishlist!' 
                : 'Removed from wishlist!';
            
            showToast(toastMessage, button.classList.contains('in-wishlist') ? 'success' : 'info');
        } else {
            showToast('Failed to update wishlist', 'error');
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        showToast('Failed to update wishlist', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate__animated animate__fadeIn`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger reflow for animation
    toast.offsetHeight;
    
    // Add fade out animation after a delay
    setTimeout(() => {
        toast.classList.remove('animate__fadeIn');
        toast.classList.add('animate__fadeOut');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
}
