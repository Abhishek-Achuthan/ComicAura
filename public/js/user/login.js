document.addEventListener('DOMContentLoaded', function() {
    // Check for error message in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorMessage = urlParams.get('error');
    
    if (errorMessage) {
        Swal.fire({
            title: 'Access Denied',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#d33',
            background: '#2A2A2A',
            color: '#fff'
        });
    }

    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });

    const togglePassword = document.querySelector('.password-toggle');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
            this.classList.toggle('active');
        });
    }

});
