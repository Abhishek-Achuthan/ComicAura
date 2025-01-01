// Global variables
let currentOrderId = null;
let currentReturnRequestId = null;

async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/admin/orders/${orderId}/details`);
        const data = await response.json();

        if (data.success) {
            currentOrderId = orderId;
            const { order, returnRequest } = data;

            // Fill order details
            document.getElementById('orderIdDetail').textContent = order._id;
            document.getElementById('orderDateDetail').textContent = new Date(order.orderDate).toLocaleDateString();
            document.getElementById('orderStatusDetail').textContent = order.orderStatus;
            document.getElementById('paymentMethodDetail').textContent = order.paymentMethod;
            document.getElementById('paymentStatusDetail').textContent = order.paymentStatus;
            document.getElementById('totalAmountDetail').textContent = order.totalAmount;
            document.getElementById('customerNameDetail').textContent = order.userId.name;
            document.getElementById('customerEmailDetail').textContent = order.userId.email;

            // Fill order items
            const itemsContainer = document.getElementById('orderItemsDetail');
            itemsContainer.innerHTML = order.items.map(item => `
                <tr>
                    <td>${item.productId.name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price}</td>
                    <td>₹${item.price * item.quantity}</td>
                </tr>
            `).join('');

            // Handle return request section
            const returnSection = document.getElementById('returnRequestSection');
            if (returnRequest) {
                currentReturnRequestId = returnRequest._id;
                document.getElementById('returnRequestDateDetail').textContent = new Date(returnRequest.requestDate).toLocaleDateString();
                document.getElementById('returnStatusDetail').textContent = returnRequest.status;
                document.getElementById('returnReasonDetail').textContent = returnRequest.reason;
                
                // Show/hide action buttons based on status
                const actionButtons = document.getElementById('returnActionButtons');
                actionButtons.style.display = returnRequest.status === 'pending' ? 'block' : 'none';
                
                returnSection.style.display = 'block';
            } else {
                returnSection.style.display = 'none';
            }

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
            modal.show();
        } else {
            showToast('error', data.message || 'Failed to fetch order details');
        }
    } catch (error) {
        console.error('Error fetching order details:', error);
        showToast('error', 'Failed to fetch order details');
    }
}

async function approveReturn() {
    try {
        const response = await fetch(`/admin/orders/returns/${currentReturnRequestId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Return request approved successfully');
            // Refresh order details
            viewOrderDetails(currentOrderId);
        } else {
            showToast('error', data.message || 'Failed to approve return request');
        }
    } catch (error) {
        console.error('Error approving return:', error);
        showToast('error', 'Failed to approve return request');
    }
}

function rejectReturn() {
    // Show rejection reason modal
    const modal = new bootstrap.Modal(document.getElementById('rejectReturnModal'));
    modal.show();
}

async function confirmRejectReturn() {
    const reason = document.getElementById('rejectionReason').value.trim();
    
    if (!reason) {
        showToast('error', 'Please provide a reason for rejection');
        return;
    }

    try {
        const response = await fetch(`/admin/orders/returns/${currentReturnRequestId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Return request rejected successfully');
            // Close rejection modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('rejectReturnModal'));
            modal.hide();
            // Refresh order details
            viewOrderDetails(currentOrderId);
        } else {
            showToast('error', data.message || 'Failed to reject return request');
        }
    } catch (error) {
        console.error('Error rejecting return:', error);
        showToast('error', 'Failed to reject return request');
    }
}

// Helper function to show toast messages
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
