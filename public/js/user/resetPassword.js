document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resetPasswordForm');
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const isValid = passwordPattern.test(this.value);
            this.classList.toggle('is-valid', isValid);
            this.classList.toggle('is-invalid', !isValid && this.value !== '');
            
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

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const token = document.querySelector('input[name="token"]').value;
            const submitBtn = this.querySelector('button[type="submit"]');

            if (!newPassword || !confirmPassword) {
                showToast('error', 'Please fill in all fields');
                return;
            }

            if (!passwordPattern.test(newPassword)) {
                showToast('error', 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('error', 'Passwords do not match');
                return;
            }

            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Resetting...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token,
                        newPassword
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('success', 'Password has been reset successfully');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    throw new Error(data.message || 'Failed to reset password');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('error', error.message || 'Something went wrong. Please try again.');
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});

function showToast(type, message) {
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
