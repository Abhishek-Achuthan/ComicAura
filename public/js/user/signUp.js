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
            pattern: /^\+?[1-9]\d{9,14}$/,
            errorMessage: 'Please enter a valid phone number'
        },
        password: {
            required: true,
            minLength: 8,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            errorMessage: 'Password must be at least 8 characters and contain uppercase, lowercase, number and special character'
        },
        confirmPassword: {
            required: true,
            match: 'password',
            errorMessage: 'Passwords do not match'
        }
    };

    function showError(field, message) {
        const errorElement = field.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            const error = document.createElement('div');
            error.className = 'error-message';
            error.textContent = message;
            error.style.color = '#ff0000';
            error.style.fontSize = '0.8em';
            error.style.marginTop = '5px';
            field.parentNode.insertBefore(error, field.nextSibling);
        }
        field.classList.add('error');
    }

    function clearError(field) {
        const errorElement = field.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.style.display = 'none';
        }
        field.classList.remove('error');
    }

    function validateField(fieldName, value) {
        const rules = validationRules[fieldName];
        const field = fields[fieldName];

        if (!rules) return true;

        if (rules.required && !value) {
            showError(field, `${fieldName} is required`);
            return false;
        }

        if (rules.minLength && value.length < rules.minLength) {
            showError(field, rules.errorMessage);
            return false;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            showError(field, rules.errorMessage);
            return false;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
            showError(field, rules.errorMessage);
            return false;
        }

        if (rules.match) {
            const matchValue = fields[rules.match].value;
            if (value !== matchValue) {
                showError(field, rules.errorMessage);
                return false;
            }
        }

        clearError(field);
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

    Object.keys(fields).forEach(fieldName => {
        fields[fieldName].addEventListener('input', function() {
            validateField(fieldName, this.value);
        });
    });
});