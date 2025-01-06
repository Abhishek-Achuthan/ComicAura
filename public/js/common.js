// User dropdown functionality
document.addEventListener('DOMContentLoaded', function() {
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownContent = document.getElementById('userDropdownContent');
    
    if (userDropdownBtn && userDropdownContent) {
        userDropdownBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            userDropdownContent.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#userDropdownBtn') && !e.target.closest('#userDropdownContent')) {
                userDropdownContent.classList.remove('show');
            }
        });
    }
});

// Order return functionality
async function initiateReturn(orderId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        const { value: reason } = await Swal.fire({
            title: 'Return Order',
            input: 'textarea',
            inputLabel: 'Please provide a reason for return',
            inputPlaceholder: 'Enter your reason here...',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Submit Return Request',
            background: '#2A2A2A',
            color: '#fff',
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to provide a reason for return!';
                }
            },
            customClass: {
                input: 'swal2-textarea dark-theme'
            }
        });

        if (reason) {
            const response = await fetch(`/orders/${orderId}/return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    title: 'Return Request Submitted!',
                    text: 'Your return request has been submitted for admin approval. You will be notified once it is processed.',
                    icon: 'success',
                    background: '#2A2A2A',
                    color: '#fff'
                });
                // Reload orders if the function exists
                if (typeof loadOrders === 'function') {
                    loadOrders(currentPage);
                } else {
                    // Fallback to page reload if loadOrders doesn't exist
                    window.location.reload();
                }
            } else {
                throw new Error(data.message || 'Failed to submit return request');
            }
        }
    } catch (error) {
        console.error('Return Request Error:', error);
        await Swal.fire({
            title: 'Error!',
            text: error.message || 'Failed to submit return request. Please try again later.',
            icon: 'error',
            background: '#2A2A2A',
            color: '#fff'
        });
    }
}
