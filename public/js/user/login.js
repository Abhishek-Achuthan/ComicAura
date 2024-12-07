
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
    });
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Input focus effects
document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// Password toggle
document.querySelector('.password-toggle').addEventListener('click', function() {
    const input = document.getElementById('password');
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Form submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('.login-btn');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simple validation
    if (!email || !password) {
        this.classList.add('shake');
        setTimeout(() => this.classList.remove('shake'), 500);
        return;
    }

    // Show loading state
    btn.innerHTML = '';
    btn.classList.add('loading');
    btn.disabled = true;

    // Simulate API call
    setTimeout(() => {
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fas fa-check"></i> Success!';
        btn.style.backgroundColor = '#28a745';
        
        // Redirect after success
        setTimeout(() => {
            window.location.href = '#dashboard';
        }, 1000);
    }, 2000);
});

// Social button hover effects
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
    });
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Input focus effects
document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});
