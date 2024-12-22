// Global variable to store selected address ID
let selectedAddressId = null;

// Make selectAddress function global
window.selectAddress = function() {
    if (!selectedAddressId) return;

    const selectedOption = document.querySelector(`.address-option[data-address-id="${selectedAddressId}"]`);
    if (!selectedOption) return;

    // Update preview with selected address details
    const previewDetails = document.querySelector('.selected-address-details');
    const selectedDetails = selectedOption.querySelector('.address-details').cloneNode(true);
    previewDetails.innerHTML = selectedDetails.innerHTML;

    // Update preview data attribute
    const preview = document.querySelector('.address-preview');
    preview.dataset.addressId = selectedAddressId;

    // Update hidden input
    const hiddenInput = document.querySelector('input[name="selectedAddress"]');
    if (hiddenInput) {
        hiddenInput.value = selectedAddressId;
    }

    // Close modal
    const modalElement = document.getElementById('addressListModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
        // Wait for modal to finish hiding before reloading
        modalElement.addEventListener('hidden.bs.modal', function() {
            location.reload();
        }, { once: true });
    } else {
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Set initial selected address
    const currentPreview = document.querySelector('.address-preview');
    if (currentPreview) {
        selectedAddressId = currentPreview.dataset.addressId;
    }

    // Add click event listeners to address options
    const addressOptions = document.querySelectorAll('.address-option');
    addressOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selection from all options
            addressOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selection to clicked option
            this.classList.add('selected');
            // Update selected address ID
            selectedAddressId = this.dataset.addressId;
        });
    });

    // Add event listener for modal show
    const addressModal = document.getElementById('addressListModal');
    if (addressModal) {
        addressModal.addEventListener('show.bs.modal', function() {
            // Reset selection to current address
            const currentAddressId = document.querySelector('.address-preview').dataset.addressId;
            addressOptions.forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.addressId === currentAddressId);
            });
            selectedAddressId = currentAddressId;
        });
    }

    // Place order button click handler
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async function() {
            try {
                // Get the selected address ID from the hidden input
                const addressInput = document.querySelector('input[name="selectedAddress"]');
                const addressId = addressInput ? addressInput.value : null;

                if (!addressId) {
                    alert('Please select a delivery address');
                    return;
                }

                // Show loading state
                placeOrderBtn.disabled = true;
                placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

                const response = await fetch('/place-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        addressId: addressId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    // Redirect to order success page with the order ID
                    window.location.href = `/order/${data.orderId}/success`;
                } else {
                    throw new Error(data.message || 'Failed to place order');
                }
            } catch (error) {
                console.error('Error placing order:', error);
                alert(error.message || 'An error occurred while placing your order. Please try again.');
                // Reset button state
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = '<i class="fas fa-shopping-bag me-2"></i>Place Order';
            }
        });
    }

    const addressCards = document.querySelectorAll('.address-card');
    let currentSlide = 0;
    const slidesPerView = window.innerWidth < 768 ? 1 : 3;

    // Address selection handling
    addressCards.forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            
            // Remove selected class from all cards
            addressCards.forEach(c => c.classList.remove('selected'));
            
            // Add selected class to clicked card
            this.classList.add('selected');
            
            selectedAddressId = this.dataset.addressId;
        });
    });

    // Save new address
    document.getElementById('saveAddress').addEventListener('click', function() {
        const formData = new FormData(document.getElementById('addressForm'));
        const addressData = Object.fromEntries(formData);

        fetch('/address/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    function initAddressSlider() {
        const slider = document.getElementById('addressesSlider');
        const slides = document.querySelectorAll('.address-slide');
        const totalSlides = slides.length;
        
        // Initialize pagination dots
        const pagination = document.getElementById('sliderPagination');
        const totalPages = Math.ceil(totalSlides / slidesPerView);
        
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('div');
            dot.className = `pagination-dot ${i === 0 ? 'active' : ''}`;
            dot.onclick = () => goToSlide(i);
            pagination.appendChild(dot);
        }
        
        // Update navigation buttons state
        updateNavButtons();
    }

    function slideAddresses(direction) {
        const slider = document.getElementById('addressesSlider');
        const slides = document.querySelectorAll('.address-slide');
        const totalSlides = slides.length;
        const maxSlide = Math.ceil(totalSlides / slidesPerView) - 1;
        
        if (direction === 'next' && currentSlide < maxSlide) {
            currentSlide++;
        } else if (direction === 'prev' && currentSlide > 0) {
            currentSlide--;
        }
        
        const offset = currentSlide * (300 + 15); // card width + gap
        slider.style.transform = `translateX(-${offset}px)`;
        
        updateNavButtons();
        updatePagination();
    }

    function goToSlide(index) {
        currentSlide = index;
        const slider = document.getElementById('addressesSlider');
        const offset = currentSlide * (300 + 15); // card width + gap
        slider.style.transform = `translateX(-${offset}px)`;
        
        updateNavButtons();
        updatePagination();
    }

    function updateNavButtons() {
        const prevBtn = document.querySelector('.slider-nav.prev');
        const nextBtn = document.querySelector('.slider-nav.next');
        const slides = document.querySelectorAll('.address-slide');
        const maxSlide = Math.ceil(slides.length / slidesPerView) - 1;
        
        prevBtn.classList.toggle('disabled', currentSlide === 0);
        nextBtn.classList.toggle('disabled', currentSlide === maxSlide);
    }

    function updatePagination() {
        const dots = document.querySelectorAll('.pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    initAddressSlider();

    // Handle window resize
    window.addEventListener('resize', function() {
        const newSlidesPerView = window.innerWidth < 768 ? 1 : 3;
        if (newSlidesPerView !== slidesPerView) {
            slidesPerView = newSlidesPerView;
            currentSlide = 0;
            initAddressSlider();
            goToSlide(0);
        }
    });

    // Handle Add Address Form Submission
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const addressData = {};
            formData.forEach((value, key) => {
                addressData[key] = value;
            });
            
            fetch('/api/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addressData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addAddressModal'));
                    modal.hide();
                    window.location.reload();
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }
});
