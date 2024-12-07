async function toggleBlock(userId, block) {
    try {
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
            } else {
                button.className = 'btn btn-danger btn-sm';
                button.innerHTML = '<i class="fas fa-ban me-1"></i> Block';
                button.onclick = () => toggleBlock(userId, true);
                
                const statusBadge = button.closest('tr').querySelector('.badge');
                statusBadge.className = 'badge bg-success';
                statusBadge.textContent = 'Active';

                updateStats(false);
            }
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert("An error occurred while processing your request.");
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