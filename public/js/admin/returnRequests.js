let currentReturnRequestId = null;

function showReturnReason(reason) {
    document.getElementById('returnReasonText').textContent = reason;
    const modal = new bootstrap.Modal(document.getElementById('returnReasonModal'));
    modal.show();
}

function handleReturn(returnRequestId, action) {
    currentReturnRequestId = returnRequestId;
    
    if (action === 'approve') {
        Swal.fire({
            title: 'Confirm Approval',
            text: 'Are you sure you want to approve this return request?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, approve it!'
        }).then((result) => {
            if (result.isConfirmed) {
                approveReturn(returnRequestId);
            }
        });
    } else {
        const modal = new bootstrap.Modal(document.getElementById('rejectReturnModal'));
        modal.show();
    }
}

async function approveReturn(returnRequestId) {
    try {
        const response = await fetch(`/admin/returns/${returnRequestId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to approve return request');
        }

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Return request approved successfully',
                showConfirmButton: false,
                timer: 1500
            });
            setTimeout(() => window.location.reload(), 1500);
        } else {
            throw new Error(data.message || 'Failed to approve return request');
        }
    } catch (error) {
        console.error('Error approving return:', error);
        Swal.fire('Error', error.message, 'error');
    }
}

async function confirmRejectReturn() {
    const reason = document.getElementById('rejectionReason').value.trim();
    
    if (!reason) {
        Swal.fire('Error', 'Please provide a reason for rejection', 'error');
        return;
    }

    try {
        const response = await fetch(`/admin/returns/${currentReturnRequestId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to reject return request');
        }

        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('rejectReturnModal'));
            modal.hide();
            
            // Clear the form
            document.getElementById('rejectionReason').value = '';
            
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Return request rejected successfully',
                showConfirmButton: false,
                timer: 1500
            });
            setTimeout(() => window.location.reload(), 1500);
        } else {
            throw new Error(data.message || 'Failed to reject return request');
        }
    } catch (error) {
        console.error('Error rejecting return:', error);
        Swal.fire('Error', error.message, 'error');
    }
}
