// Add pagination functionality
let currentPage = 1;

function loadOrders(page = 1) {
    fetch(`/profile/orders?page=${page}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentPage = data.pagination.currentPage;
                updateOrdersUI(data.orders, data.pagination);
            }
        })
        .catch(error => console.error('Error loading orders:', error));
}

function updateOrdersUI(orders, pagination) {
    const ordersList = document.querySelector('.orders-list');
    if (!ordersList) return;

    // Clear existing orders
    ordersList.innerHTML = '';

    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <div class="text-center py-5">
                    <i class="bi bi-bag-x fs-1"></i>
                    <h3 class="mt-3">No Orders Yet</h3>
                    <p>You haven't placed any orders yet.</p>
                    <a href="/shop" class="btn btn-primary">Start Shopping</a>
                </div>
            </div>
        `;
        return;
    }

    // Create table for orders
    const table = document.createElement('table');
    table.className = 'orders-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            ${orders.map(order => `
                <tr class="order-row" onclick="viewOrderDetails('${order._id}')">
                    <td>#${order._id.slice(-6)}</td>
                    <td>${new Date(order.orderDate).toLocaleDateString()}</td>
                    <td><span class="status-badge ${order.orderStatus.toLowerCase()}">${order.orderStatus}</span></td>
                    <td>₹${order.totalAmount.toFixed(2)}</td>
                    <td>
                        ${['Pending', 'Processing'].includes(order.orderStatus) ? 
                            `<button class="btn btn-sm btn-danger" onclick="cancelOrder('${order._id}', event)">Cancel</button>` : 
                            order.orderStatus === 'Delivered' && !order.isReturned ?
                            `<button class="btn btn-sm btn-outline-primary" onclick="initiateReturn('${order._id}', event)">Return</button>` :
                            '-'
                        }
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    ordersList.appendChild(table);

    // Add pagination
    if (pagination.totalPages > 1) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        paginationContainer.innerHTML = `
            <div class="pagination">
                ${pagination.hasPrevPage ? `
                    <button class="page-link" onclick="loadOrders(${currentPage - 1})">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                ` : ''}
                
                ${generatePageNumbers(currentPage, pagination.totalPages)}
                
                ${currentPage < pagination.totalPages ? `
                    <button class="page-link" onclick="loadOrders(${currentPage + 1})">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                ` : ''}
            </div>
        `;
        ordersList.appendChild(paginationContainer);
    }
}

function generatePageNumbers(currentPage, totalPages) {
    let pages = [];
    const maxVisiblePages = 3; // Reduced from 5 to 3
    
    if (totalPages <= maxVisiblePages) {
        // Show all pages if total pages are less than max visible
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Always show first page
        pages.push(1);
        
        if (currentPage > 2) {
            pages.push('...');
        }
        
        // Show current page if not first or last
        if (currentPage !== 1 && currentPage !== totalPages) {
            pages.push(currentPage);
        }
        
        if (currentPage < totalPages - 1) {
            pages.push('...');
        }
        
        // Always show last page
        pages.push(totalPages);
    }
    
    return pages.map(page => {
        if (page === '...') {
            return '<span class="page-link dots">...</span>';
        }
        return `
            <button class="page-link ${page === currentPage ? 'active' : ''}"
                    onclick="loadOrders(${page})">
                ${page}
            </button>
        `;
    }).join('');
}

// Function to view order details
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();

        if (data.success) {
            const order = data.order;
            
            // Create the modal content
            const modalContent = `
                <div class="order-details-modal">
                    <div class="order-header">
                        <h3>Order #${order._id.slice(-6)}</h3>
                        <div class="order-date">Ordered on: ${new Date(order.orderDate).toLocaleDateString()}</div>
                        <div class="order-status">
                            <span class="status-badge ${order.orderStatus.toLowerCase()}">${order.orderStatus}</span>
                            ${order.returnStatus ? `
                                <span class="status-badge ${order.returnStatus.toLowerCase()}">
                                    Return ${order.returnStatus.charAt(0).toUpperCase() + order.returnStatus.slice(1)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="order-items">
                        <h4>Items</h4>
                        <div class="items-list">
                            ${order.items.map(item => `
                                <div class="order-item">
                                    <div class="item-details">
                                        <h5>${item.productId.name}</h5>
                                        <div class="item-meta">
                                            <span>Quantity: ${item.quantity}</span>
                                            <span>Price: ₹${item.price.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div class="item-total">
                                        ₹${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="order-summary">
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>₹${order.totalAmount.toFixed(2)}</span>
                        </div>
                        ${order.discount ? `
                            <div class="summary-row discount">
                                <span>Discount</span>
                                <span>-₹${order.discount.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="summary-row total">
                            <span>Total</span>
                            <span>₹${(order.totalAmount - (order.discount || 0)).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="shipping-address">
                        <h4>Shipping Address</h4>
                        <p>
                            ${order.shippingAddress.name}<br>
                            ${order.shippingAddress.address}<br>
                            ${order.shippingAddress.city}, ${order.shippingAddress.state}<br>
                            ${order.shippingAddress.country} - ${order.shippingAddress.pincode}<br>
                            Phone: ${order.shippingAddress.phoneNumber}
                        </p>
                    </div>

                    <div class="order-actions mt-4 text-end">
                        ${order.orderStatus === 'Delivered' && !order.isReturned && !order.returnStatus ? `
                            <button class="btn btn-outline-primary" onclick="initiateReturn('${order._id}', event)">
                                <i class="bi bi-arrow-return-left"></i> Return Order
                            </button>
                        ` : ''}
                        ${['Pending', 'Processing'].includes(order.orderStatus) ? `
                            <button class="btn btn-danger" onclick="cancelOrder('${order._id}', event)">
                                <i class="bi bi-x-circle"></i> Cancel Order
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            // Show the modal using SweetAlert2
            Swal.fire({
                title: '',
                html: modalContent,
                width: '600px',
                showCloseButton: true,
                showConfirmButton: false,
                customClass: {
                    container: 'order-details-container',
                    popup: 'order-details-popup'
                },
                background: '#1a1a1a',
                buttonsStyling: false
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to fetch order details'
            });
        }
    } catch (error) {
        console.error('Error viewing order details:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load order details'
        });
    }
}

// Prevent event bubbling for action buttons
function cancelOrder(orderId, event) {
    event.stopPropagation();
    // Your existing cancel order logic
}

async function initiateReturn(orderId, event) {
    event.stopPropagation();
    
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
                loadOrders(currentPage);
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

async function editModal(addressId) {
    const address = window.addresses.address.find(addr => addr._id === addressId);
    if (!address) return;

    const form = document.getElementById('editAddressForm');
    
    let hiddenIdField = form.querySelector('input[name="_id"]');
    if (!hiddenIdField) {
        hiddenIdField = document.createElement('input');
        hiddenIdField.type = 'hidden';
        hiddenIdField.name = '_id';
        form.appendChild(hiddenIdField);
    }
    hiddenIdField.value = addressId;

    Object.entries(address).forEach(([key, value]) => {
        const input = form.elements[key];
        if (input && key !== '_id') { 
            input.type === 'checkbox' ? input.checked = value : input.value = value;
        }
    });

    const modal = new bootstrap.Modal(document.getElementById('editAddressModal'));
    modal.show();
}

async function deleteAddress(addressId) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (!result.isConfirmed) {
            return;
        }

        const response = await fetch(`/address/${addressId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete address');
        }

        await Swal.fire(
            'Deleted!',
            'Your address has been deleted.',
            'success'
        );

        window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire(
            'Error!',
            'Failed to delete address',
            'error'
        );
    }
}

async function changePassword(event) {
    event.preventDefault();
    
    try {
        const form = document.getElementById('password-change-form');
        if (!form) {
            console.error('Password change form not found');
            showToast('error', 'Something went wrong. Please try again.');
            return;
        }

        const currentPassword = form.currentPassword.value;
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('error', 'Please fill in all password fields');
            return;
        }

        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordPattern.test(newPassword)) {
            showToast('error', 'New password must be at least 8 characters and include uppercase, lowercase, number, and special character');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('error', 'New passwords do not match');
            return;
        }

        const response = await fetch('/profile/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to change password');
        }

        form.reset();
        
        showToast('success', data.message || 'Password changed successfully');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (error) {
        console.error('Error changing password:', error);
        showToast('error', error.message || 'Failed to change password. Please try again.');
    }
}

function showToast(type, message) {
    if (!message) {
        message = type === 'success' ? 'Operation successful' : 'Something went wrong';
    }

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
            popup: 'colored-toast',
            title: 'toast-title'
        },
        background: '#fff',
        color: '#000'
    });
}

const style = document.createElement('style');
style.textContent = `
    .colored-toast {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
    .colored-toast .toast-title {
        color: #000 !important;
        font-weight: 500 !important;
    }
    .colored-toast.swal2-icon-success {
        border-left: 4px solid #28a745 !important;
    }
    .colored-toast.swal2-icon-error {
        border-left: 4px solid #dc3545 !important;
    }
    .colored-toast.swal2-icon-warning {
        border-left: 4px solid #ffc107 !important;
    }
    .colored-toast.swal2-icon-info {
        border-left: 4px solid #17a2b8 !important;
    }
    .swal-dark {
        background-color: #2A2A2A !important;
    }
    .swal-dark .swal2-title,
    .swal-dark .swal2-html-container,
    .swal-dark .swal2-content {
        color: #ffffff !important;
    }
    .swal-dark .swal2-input,
    .swal-dark .swal2-textarea {
        background-color: #3a3a3a !important;
        color: #ffffff !important;
        border-color: #4a4a4a !important;
    }
    .swal-dark .swal2-validation-message {
        background-color: #3a3a3a !important;
        color: #ffffff !important;
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', function() {
    // Tab Switching
    document.querySelectorAll('.profile-nav .nav-item').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all sections and buttons
            document.querySelectorAll('.profile-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelectorAll('.nav-item').forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to clicked button and corresponding section
            button.classList.add('active');
            const sectionId = button.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });

    // Profile Navigation
    const navItems = document.querySelectorAll('.profile-nav .nav-item');
    const sections = document.querySelectorAll('.profile-section');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            
            // Remove active class from all nav items and sections
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));

            // Add active class to clicked nav item and corresponding section
            this.classList.add('active');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    const newPasswordInput = document.querySelector('input[name="newPassword"]');
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const isValid = passwordPattern.test(this.value);
            this.classList.toggle('is-valid', isValid);
            this.classList.toggle('is-invalid', !isValid && this.value !== '');
            
            // Update confirm password validation if it has a value
            if (confirmPasswordInput && confirmPasswordInput.value) {
                const confirmIsValid = this.value === confirmPasswordInput.value;
                confirmPasswordInput.classList.toggle('is-valid', confirmIsValid);
                confirmPasswordInput.classList.toggle('is-invalid', !confirmIsValid);
            }
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            if (newPasswordInput) {
                const isValid = this.value === newPasswordInput.value;
                this.classList.toggle('is-valid', isValid);
                this.classList.toggle('is-invalid', !isValid && this.value !== '');
            }
        });
    }

    // Email Change Functionality
    const changeEmailForm = document.getElementById('changeEmailForm');
    const newEmailInput = document.getElementById('newEmail');
    const emailOtpInput = document.getElementById('emailOtp');
    const sendEmailOtpBtn = document.getElementById('sendEmailOtp');
    const changeEmailBtn = changeEmailForm?.querySelector('button[type="submit"]');

    if (sendEmailOtpBtn) {
        sendEmailOtpBtn.addEventListener('click', async function() {
            const newEmail = newEmailInput.value;
            
            if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                showToast('error', 'Please enter a valid email address');
                return;
            }

            // Disable button and show loading
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

            try {
                const response = await fetch('/profile/send-email-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newEmail })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('success', 'OTP sent to your new email');
                    emailOtpInput.disabled = false;
                    changeEmailBtn.disabled = false;
                    
                    // Start countdown timer
                    let timeLeft = 60;
                    this.disabled = true;
                    const timer = setInterval(() => {
                        if (timeLeft <= 0) {
                            clearInterval(timer);
                            this.innerHTML = originalText;
                            this.disabled = false;
                        } else {
                            this.innerHTML = `Resend in ${timeLeft}s`;
                            timeLeft--;
                        }
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Failed to send OTP');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('error', error.message || 'Failed to send OTP');
                this.innerHTML = originalText;
                this.disabled = false;
            }
        });
    }

    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const newEmail = newEmailInput.value;
            const otp = emailOtpInput.value;
            const submitBtn = this.querySelector('button[type="submit"]');

            if (!newEmail || !otp) {
                showToast('error', 'Please fill in all fields');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                showToast('error', 'Please enter a valid email address');
                return;
            }

            if (!/^\d{4}$/.test(otp)) {
                showToast('error', 'Please enter a valid 4-digit OTP');
                return;
            }

            // Show loading state
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Changing...';

            try {
                const response = await fetch('/profile/change-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newEmail, otp })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('success', 'Email changed successfully');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    throw new Error(data.message || 'Failed to change email');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('error', error.message || 'Failed to change email');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Wallet Functions
function showAddMoneyModal() {
    const modal = new bootstrap.Modal(document.getElementById('addMoneyModal'));
    modal.show();
}

async function addMoneyToWallet() {
    const amount = document.getElementById('walletAmount').value;
    
    if (!amount || amount <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Amount',
            text: 'Please enter a valid amount',
            background: '#1a1a1a',
            color: '#fff'
        });
        return;
    }

    try {
        // Initiate Razorpay order
        const response = await fetch('/initiate-wallet-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: parseFloat(amount) })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to initiate payment');
        }

        const options = {
            key: data.key,
            amount: data.order.amount,
            currency: data.order.currency,
            name: "Comic Aura",
            description: "Wallet Recharge",
            order_id: data.order.id,
            handler: async function (response) {
                try {
                    const verifyResponse = await fetch('/verify-wallet-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyResponse.json();

                    if (verifyData.success) {
                        bootstrap.Modal.getInstance(document.getElementById('addMoneyModal')).hide();
                        
                        await Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: 'Money added to wallet successfully',
                            background: '#1a1a1a',
                            color: '#fff'
                        });

                        location.reload();
                    } else {
                        throw new Error(verifyData.message || 'Payment verification failed');
                    }
                } catch (error) {
                    throw new Error(error.message || 'Payment verification failed');
                }
            },
            theme: {
                color: '#38ef7d'
            }
        };

        // Initialize Razorpay
        const rzp = new Razorpay(options);
        rzp.open();

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to add money to wallet',
            background: '#1a1a1a',
            color: '#fff'
        });
    }
}

async function removeFromWishlist(productId) {
    try {
        const response = await fetch('/remove-from-wishlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Product removed from wishlist',
                background: '#1a1a1a',
                color: '#fff'
            });
            location.reload();
        } else {
            throw new Error(data.message || 'Failed to remove from wishlist');
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to remove from wishlist',
            background: '#1a1a1a',
            color: '#fff'
        });
    }
}

async function addToCart(productId) {
    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });

        const data = await response.json();

        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Product added to cart',
                background: '#1a1a1a',
                color: '#fff'
            });
            
            await removeFromWishlist(productId);
        } else {
            throw new Error(data.message || 'Failed to add to cart');
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to add to cart',
            background: '#1a1a1a',
            color: '#fff'
        });
    }
}

function initiateReturn(orderId) {
    document.getElementById('returnOrderId').value = orderId;
    const returnModal = new bootstrap.Modal(document.getElementById('returnOrderModal'));
    returnModal.show();
}

async function submitReturn() {
    try {
        const orderId = document.getElementById('returnOrderId').value;
        const returnReason = document.getElementById('returnReason').value;

        if (!returnReason.trim()) {
            showToast('error', 'Please provide a return reason');
            return;
        }

        if (!orderId) {
            showToast('error', 'Order ID is missing');
            return;
        }

        const response = await fetch(`/orders/${orderId}/return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: returnReason
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('success', data.message);
            $('#returnModal').modal('hide');
            location.reload();
        } else {
            showToast('error', data.message || 'Failed to process return request');
        }
    } catch (error) {
        console.error('Return request error:', error);
        showToast('error', 'Failed to process return request');
    }
}

async function cancelOrder(orderId, event) {
    event.stopPropagation();
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, cancel it!',
            background: '#2A2A2A',
            color: '#ffffff',
            customClass: {
                title: 'text-white',
                htmlContainer: 'text-white',
                popup: 'swal-dark',
                confirmButton: 'btn btn-danger',
                cancelButton: 'btn btn-primary'
            }
        });

        if (result.isConfirmed) {
            const response = await fetch(`/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    title: 'Cancelled!',
                    text: 'Your order has been cancelled.',
                    icon: 'success',
                    background: '#2A2A2A',
                    color: '#ffffff',
                    customClass: {
                        title: 'text-white',
                        htmlContainer: 'text-white',
                        popup: 'swal-dark',
                        confirmButton: 'btn btn-success'
                    }
                });
                location.reload();
            } else {
                throw new Error(data.message || 'Failed to cancel order');
            }
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        await Swal.fire({
            title: 'Error!',
            text: error.message || 'Failed to cancel order',
            icon: 'error',
            background: '#2A2A2A',
            color: '#ffffff',
            customClass: {
                title: 'text-white',
                htmlContainer: 'text-white',
                popup: 'swal-dark',
                confirmButton: 'btn btn-danger'
            }
        });
    }
}

async function addAddress(event) {
    if(event) event.preventDefault();

    try {
        const saveAddress = document.getElementById('addressForm');
        const formData = new FormData(saveAddress);

        const errors = validateAddressForm(formData);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        const data = {};
        formData.forEach((value, key) => {
            // Transform field names to match backend expectations
            if (key === 'fullName') {
                data.name = value.trim();
            } else if (key === 'phone') {
                data.phoneNumber = value.trim();
            } else {
                data[key] = value.trim();
            }
        });
        console.log('Data to be sent to backend:', data);

        const isDefaultCb = document.getElementById('defaultAddress');
        data.isDefault = isDefaultCb.checked;

        const response = await fetch("/addAddress", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to add address");
        }

        const result = await response.json();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addAddressModal'));
        modal.hide();
        
        window.location.reload();
        
    } catch (error) {
        console.error("Error:", error.message);
        showErrorToast("Failed to add address: " + error.message);
    }
}

async function updateAddress(event) {
    if(event) event.preventDefault();

    try {
        const editAddressForm = document.getElementById('editAddressForm');
        console.log('Edit Form:', editAddressForm);
        
        const formData = new FormData(editAddressForm);
        console.log('Raw Form Data:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        const errors = validateAddressForm(formData);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        const data = {};
        formData.forEach((value, key) => {
            // Transform field names to match backend expectations
            if (key === 'fullName') {
                data.name = value.trim();
            } else if (key === 'phone') {
                data.phoneNumber = value.trim();
            } else {
                data[key] = value.trim();
            }
        });
        console.log('Data to be sent to backend:', data);

        const isDefaultCb = document.getElementById('editDefaultAddress');
        data.isDefault = isDefaultCb.checked;

        const addressId = data._id;
        if (!addressId) {
            throw new Error("Address ID is missing");
        }

        const response = await fetch(`/profile/${addressId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update address");
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('editAddressModal'));
        modal.hide();
        
        window.location.reload();
        
    } catch (error) {
        console.error("Error:", error.message);
        showErrorToast("Failed to update address: " + error.message);
    }
}

function validateAddressForm(formData) {
    const errors = [];
    
    // Log all form data for debugging
    console.log('Validating form data:');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }
    
    const name = formData.get('name') || formData.get('fullName');
    if (!name || name.trim().length < 3) {
        errors.push('Name must be at least 3 characters long');
    }

    // Phone validation with both possible field names
    const phoneNumber = formData.get('phoneNumber') || formData.get('phone');
    console.log('Phone number from form:', phoneNumber);
    
    if (!phoneNumber) {
        errors.push('Phone number is required');
    } else if (!/^\d+$/.test(phoneNumber)) {
        errors.push('Phone number must contain only digits');
    } else if (phoneNumber.length < 10) {
        errors.push('Phone number must be at least 10 digits');
    } else if (phoneNumber.length > 10) {
        errors.push('Phone number cannot be more than 10 digits');
    }

    if (!formData.get('street') || formData.get('street').trim().length < 5) {
        errors.push('Street address must be at least 5 characters long');
    }

    if (!formData.get('city') || formData.get('city').trim().length < 2) {
        errors.push('City name must be at least 2 characters long');
    }

    if (!formData.get('state') || formData.get('state').trim().length < 2) {
        errors.push('State name must be at least 2 characters long');
    }

    if (!formData.get('country') || formData.get('country').trim().length < 2) {
        errors.push('Country name must be at least 2 characters long');
    }

    const pinCode = formData.get('pinCode');
    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
        errors.push('Pin code must be 6 digits');
    }

    if (!formData.get('addressType')) {
        errors.push('Please select an address type');
    }

    console.log('Validation errors:', errors);
    return errors;
}

async function showValidationErrors(errors) {
    const errorHtml = errors.map(error => `<li>${error}</li>`).join('');
    Swal.fire({
        title: 'Validation Error',
        html: `<ul class="text-start">${errorHtml}</ul>`,
        icon: 'error',
        background: '#2A2A2A',
        color: '#ffffff',
        customClass: {
            title: 'text-white',
            htmlContainer: 'text-white',
            popup: 'swal-dark'
        }
    });
}

async function showErrorToast(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        background: '#2A2A2A',
        color: '#ffffff',
        customClass: {
            title: 'text-white',
            htmlContainer: 'text-white',
            popup: 'swal-dark'
        }
    });
}
