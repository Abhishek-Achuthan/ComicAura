document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('emailForm');
    const otpForm = document.getElementById('otpForm');
    const resetForm = document.getElementById('resetForm');
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Email form submission
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showToast('error', 'Please enter a valid email address');
                return;
            }

            // Show loading state
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('success', 'OTP has been sent to your email');
                    emailForm.style.display = 'none';
                    otpForm.style.display = 'block';
                } else {
                    throw new Error(data.message || 'Failed to send OTP');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('error', error.message || 'Something went wrong. Please try again.');
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // OTP form submission
    if (otpForm) {
        otpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const otp = document.getElementById('otp').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            if (!otp || otp.length !== 4) {
                showToast('error', 'Please enter a valid OTP');
                return;
            }

            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/verify-reset-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ otp })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('success', 'OTP verified successfully');
                    otpForm.style.display = 'none';
                    resetForm.style.display = 'block';
                } else {
                    throw new Error(data.message || 'Invalid OTP');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('error', error.message || 'Failed to verify OTP');
            } finally {
                submitBtn.innerHTML = 'Verify OTP';
                submitBtn.disabled = false;
            }
        });
    }

    // Reset password form submission
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
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

            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Resetting...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newPassword })
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
                showToast('error', error.message || 'Failed to reset password');
                submitBtn.innerHTML = 'Reset Password';
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
