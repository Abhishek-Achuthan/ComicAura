async function toggleBlock(userId, block) {
    try {
        // Show confirmation dialog
        const result = await Swal.fire({
            title: block ? 'Block User?' : 'Unblock User?',
            text: block ? 'Are you sure you want to block this user?' : 'Are you sure you want to unblock this user?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: block ? '#dc3545' : '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: block ? 'Yes, block user' : 'Yes, unblock user',
            cancelButtonText: 'Cancel'
        });

        // If user confirms
        if (result.isConfirmed) {
            const url = `/admin/user/${userId}`;   
            
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const button = document.getElementById(`block-btn-${userId}`);
                
                if (block) {
                    button.className = 'btn btn-success btn-sm';
                    button.innerHTML = '<i class="fas fa-unlock me-1"></i> Unblock';
                    button.onclick = () => toggleBlock(userId, false);
                    
                    const statusBadge = button.closest('tr').querySelector('.badge');
                    statusBadge.className = 'badge bg-danger';
                    statusBadge.textContent = 'Blocked';

                    updateStats(true);

                    // Show success message
                    Swal.fire('Blocked!', 'User has been blocked successfully.', 'success');
                } else {
                    button.className = 'btn btn-danger btn-sm';
                    button.innerHTML = '<i class="fas fa-ban me-1"></i> Block';
                    button.onclick = () => toggleBlock(userId, true);
                    
                    const statusBadge = button.closest('tr').querySelector('.badge');
                    statusBadge.className = 'badge bg-success';
                    statusBadge.textContent = 'Active';

                    updateStats(false);

                    // Show success message
                    Swal.fire('Unblocked!', 'User has been unblocked successfully.', 'success');
                }
            } else {
                Swal.fire('Error!', data.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error!', 'An error occurred while processing your request.', 'error');
    }
}

function updateStats(isBlocking) {
    const activeUsersCount = document.getElementById('active-users-count');
    const blockedUsersCount = document.getElementById('blocked-users-count');
    
    let activeCount = parseInt(activeUsersCount.textContent);
    let blockedCount = parseInt(blockedUsersCount.textContent);
    
    if (isBlocking) {

        activeCount--;
        blockedCount++;
    } else {

        activeCount++;
        blockedCount--;
    }
    
    activeUsersCount.textContent = activeCount;
    blockedUsersCount.textContent = blockedCount;
}