const inputs = document.querySelectorAll('.otp-input');
const verifyBtn = document.getElementById('verifyBtn');
const timerElement = document.getElementById('timer');
const resendLink = document.getElementById('resendLink');

inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
            inputs[index - 1].focus();
        }
    });
});

let timeLeft = 120;
let timerInterval;

function showResendButton() {
    resendLink.style.display = 'inline-block';
    timerElement.textContent = 'Code Expired';
    verifyBtn.disabled = true;
}

function hideResendButton() {
    resendLink.style.display = 'none';
    verifyBtn.disabled = false;
}

function updateTimer() {
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        showResendButton();
        return;
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `Code expires in ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timeLeft = 120;
    hideResendButton();
    updateTimer();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimer();
    }, 1000);
}

// the timer will start when the page reloads
startTimer();

verifyBtn.addEventListener('click', () => {
    if (timeLeft <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'OTP Expired',
            text: 'The OTP has expired. Please click the Resend OTP button.',
            confirmButtonColor: '#ff6b00'
        });
        return;
    }

    const otpCode = Array.from(inputs).map(input => input.value).join('');
    if (otpCode.length === 4) {
        verifyBtn.disabled = true;
        
        Swal.fire({
            title: 'Verifying...',
            text: 'Please wait while we verify your OTP',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        fetch('/verifyOtp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ otp: otpCode })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                clearInterval(timerInterval);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Your account has been verified successfully!',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = '/login';
                });
            } else {
                verifyBtn.disabled = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: data.message || 'Invalid OTP. Please try again.',
                    confirmButtonColor: '#ff6b00'
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            verifyBtn.disabled = false;
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Something went wrong! Please try again.',
                confirmButtonColor: '#ff6b00'
            });
        });
    } else {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete OTP',
            text: 'Please enter all 4 digits of the OTP',
            confirmButtonColor: '#ff6b00'
        });
    }
});

resendLink.addEventListener('click', (e) => {
    e.preventDefault();
    
    Swal.fire({
        title: 'Resending OTP...',
        text: 'Please wait',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    fetch('/resendOtp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear OTP inputs
            inputs.forEach(input => input.value = '');
            inputs[0].focus();
            
            // Restart timer
            startTimer();
            
            Swal.fire({
                icon: 'success',
                title: 'OTP Sent!',
                text: data.message || 'A new OTP has been sent to your email',
                confirmButtonColor: '#ff6b00'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Resend',
                text: data.message || 'Failed to resend OTP. Please try again.',
                confirmButtonColor: '#ff6b00'
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong! Please try again.',
            confirmButtonColor: '#ff6b00'
        });
    });
});
