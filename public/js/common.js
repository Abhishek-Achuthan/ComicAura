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
