// mkaed the toggle button active but not consistent
document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
    });
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const fields = {
        firstName: document.querySelector('input[name="firstName"]'),
        lastName: document.querySelector('input[name="lastName"]'),
        email: document.querySelector('input[name="email"]'),
        phoneNumber: document.querySelector('input[name="phoneNumber"]'),
        password: document.querySelector('input[name="password"]'),
        confirmPassword: document.querySelector('input[name="confirmPassword"]')
    };

    const validationRules = {
        firstName: {
            required: true,
            minLength: 2,
            maxLength: 50,
            pattern: /^[A-Za-z\s'-]+$/,
            errorMessage: 'First name must be 2-50 characters and contain only letters'
        },
        lastName: {
            required: true,
            minLength: 2,
            maxLength: 50,
            pattern: /^[A-Za-z\s'-]+$/,
            errorMessage: 'Last name must be 2-50 characters and contain only letters'
        },
        email: {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            errorMessage: 'Please enter a valid email address'
        },
        phoneNumber: {
            required: true,
            pattern: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
            errorMessage: 'Please enter a valid phone number'
        },
        password: {
            required: true,
            minLength: 8,
            maxLength: 128,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            errorMessage: 'Password must be 8-128 characters, include uppercase, lowercase, number, and special character'
        },
        confirmPassword: {
            required: true,
            match: 'password',
            errorMessage: 'Passwords do not match'
        }
    };

    function showError(field, message) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
        
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('invalid-feedback')) {
            existingError.remove();
        }
        
        const errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback';
        
        if (field.name === 'password' || field.name === 'confirmPassword') {
            errorElement.style.marginTop = '0.25rem';
            errorElement.textContent = message;
        } else {
            const icon = document.createElement('i');
            icon.className = 'fas fa-exclamation-circle me-2';
            errorElement.appendChild(icon);
            errorElement.appendChild(document.createTextNode(message));
        }
        
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }

    function clearError(field) {
        field.classList.remove('is-invalid');
        field.classList.remove('is-valid');
        
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('invalid-feedback')) {
            existingError.remove();
        }
    }

    function validateField(fieldName, value) {
        const rules = validationRules[fieldName];
        
        clearError(fields[fieldName]);
        
        if (rules.required && !value.trim()) {
            showError(fields[fieldName], `${fieldName} is required`);
            return false;
        }

        if (rules.minLength && value.length < rules.minLength) {
            showError(fields[fieldName], rules.errorMessage);
            return false;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            showError(fields[fieldName], rules.errorMessage);
            return false;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
            showError(fields[fieldName], rules.errorMessage);
            return false;
        }

        if (rules.match) {
            const originalValue = fields[rules.match].value;
            if (value !== originalValue) {
                showError(fields[fieldName], rules.errorMessage);
                return false;
            }
        }
        return true;
    }

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        let isValid = true;
        
        Object.keys(fields).forEach(fieldName => {
            if (!validateField(fieldName, fields[fieldName].value)) {
                isValid = false;
            }
        });
        
        if (isValid) {
            form.submit();
        }
    });
});