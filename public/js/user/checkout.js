// Global variable to store selected address ID
let selectedAddressId = null;

// Global variable to track order processing state
let isProcessingOrder = false;

// Make selectAddress function global
window.selectAddress = function() {
    const selectedOption = document.querySelector('.address-option.selected');
    if (selectedOption) {
        const addressId = selectedOption.dataset.addressId;
        const addressDetails = selectedOption.querySelector('.address-details').innerHTML;
        
        // Update the preview
        document.querySelector('.selected-address-details').innerHTML = addressDetails;
        
        // Update the hidden input
        document.querySelector('input[name="selectedAddress"]').value = addressId;
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addressListModal'));
        modal.hide();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Address selection in modal
    const addressOptions = document.querySelectorAll('.address-option');
    addressOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            addressOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            this.classList.add('selected');
        });
    });

    // Place order button click handler
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }

    const editAddressForm = document.getElementById('editAddressForm');
    if (editAddressForm) {
        editAddressForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateAddress(event);
        });
    }
});

async function placeOrder() {
    // Prevent multiple submissions
    if (isProcessingOrder) {
        showToast('Order is already being processed', 'info');
        return;
    }

    const selectedAddress = document.querySelector('input[name="selectedAddress"]').value;
    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked').value;

    if (!selectedAddress) {
        showToast('Please select a delivery address', 'error');
        return;
    }

    // Check wallet balance if wallet payment is selected
    if (selectedPayment === 'wallet') {
        const walletBalanceText = document.querySelector('label[for="wallet"]').textContent.match(/₹([\d.]+)/);
        const orderTotalText = document.querySelector('.total-amount').textContent.match(/₹([\d.]+)/);
        
        if (walletBalanceText && orderTotalText) {
            const walletBalance = parseFloat(walletBalanceText[1]);
            const orderTotal = parseFloat(orderTotalText[1]);
            
            if (walletBalance < orderTotal) {
                showToast('Insufficient wallet balance', 'error');
                return;
            }
        }
    }

    try {
        isProcessingOrder = true;
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

        const response = await fetch('/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                addressId: selectedAddress,
                paymentMethod: selectedPayment
            })
        });

        const data = await response.json();

        if (!data.success) {
            showToast(data.message || 'Failed to place order', 'error');
            isProcessingOrder = false;
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Place Order';
            return;
        }

        if (selectedPayment === 'razorpay') {
            // Handle Razorpay payment
            const options = {
                key: data.razorpayOrder.key,
                amount: data.razorpayOrder.amount,
                currency: data.razorpayOrder.currency,
                name: 'ComicAura',
                description: 'Purchase Payment',
                order_id: data.razorpayOrder.id,
                handler: async function (response) {
                    try {
                        const verifyResponse = await fetch('/verify-razorpay-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyResponse.json();

                        if (verifyData.success) {
                            window.location.href = `/order-success/${data.orderId}`;
                        } else {
                            showToast('Payment verification failed', 'error');
                            isProcessingOrder = false;
                            placeOrderBtn.disabled = false;
                            placeOrderBtn.innerHTML = 'Place Order';
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        showToast('Payment verification failed', 'error');
                        isProcessingOrder = false;
                        placeOrderBtn.disabled = false;
                        placeOrderBtn.innerHTML = 'Place Order';
                    }
                },
                modal: {
                    ondismiss: function() {
                        isProcessingOrder = false;
                        placeOrderBtn.disabled = false;
                        placeOrderBtn.innerHTML = 'Place Order';
                    }
                },
                prefill: {
                    name: document.querySelector('.address-details h5').textContent,
                    contact: document.querySelector('.address-details p:last-child').textContent.replace(/[^0-9]/g, '')
                },
                theme: {
                    color: '#2874f0'
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();
        } else {
            // For COD and wallet payments
            window.location.href = `/order-success/${data.orderId}`;
        }
    } catch (error) {
        console.error('Order placement error:', error);
        showToast('Failed to place order', 'error');
        isProcessingOrder = false;
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = 'Place Order';
    }
}

function showToast(message, type = 'success') {
    // Implement your toast notification here
    alert(message);
}

async function addAddress(event) {
    if(event) event.preventDefault();

    try {
        const addAddressForm = document.getElementById('addAddressForm');
        const formData = new FormData(addAddressForm);

        // Log form data for debugging
        console.log('Add Address Form Data:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        const errors = validateAddressForm(formData);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        const data = {};
        formData.forEach((value, key) => {
            if (key === 'fullName') {
                data.name = value.trim();
            } else if (key === 'phone') {
                data.phoneNumber = value.trim();
            } else {
                data[key] = value.trim();
            }
        });

        const isDefaultCb = document.getElementById('defaultAddress');
        data.isDefault = isDefaultCb.checked;

        console.log('Data being sent:', data);

        const response = await fetch("/addAddress", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to add address");
        }

        const result = await response.json();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addAddressModal'));
        modal.hide();
        
        window.location.reload();
        
    } catch (error) {
        console.error("Error:", error.message);
        showErrorToast("Failed to add address: " + error.message);
    }
}

async function editModal(addressId) {
    try {
        // Get the address from the addresses array in the page
        const address = addresses.find(addr => addr._id === addressId);
        
        if (!address) {
            throw new Error('Address not found');
        }

        // Set the hidden address ID field
        document.getElementById('editAddressId').value = addressId;

        // Populate the edit form
        document.getElementById('editFullName').value = address.name;
        document.getElementById('editPhone').value = address.phoneNumber;
        document.getElementById('editStreet').value = address.street;
        document.getElementById('editCity').value = address.city;
        document.getElementById('editState').value = address.state;
        document.getElementById('editCountry').value = address.country;
        document.getElementById('editPinCode').value = address.pinCode;
        document.getElementById('editAddressType').value = address.addressType;
        document.getElementById('editDefaultAddress').checked = address.isDefault;

        // Close the address list modal and show edit modal
        const addressListModal = bootstrap.Modal.getInstance(document.getElementById('addressListModal'));
        if (addressListModal) {
            addressListModal.hide();
        }
        
        const editModal = new bootstrap.Modal(document.getElementById('editAddressModal'));
        editModal.show();
    } catch (error) {
        console.error('Error in editModal:', error);
        showErrorToast(error.message);
    }
}

async function updateAddress(event) {
    try {
        const editAddressForm = document.getElementById('editAddressForm');
        const formData = new FormData(editAddressForm);
        const addressId = document.getElementById('editAddressId').value;

        // Log form data for debugging
        console.log('Edit Address Form Data:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        const errors = validateAddressForm(formData);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        const data = {};
        formData.forEach((value, key) => {
            if (key === 'fullName') {
                data.name = value.trim();
            } else if (key === 'phone') {
                data.phoneNumber = value.trim();
            } else if (key !== '_id') { // Exclude _id from the request body
                data[key] = value.trim();
            }
        });

        const isDefaultCb = document.getElementById('editDefaultAddress');
        data.isDefault = isDefaultCb.checked;

        if (!addressId) {
            throw new Error("Address ID is missing");
        }

        console.log('Update data being sent:', data);
        console.log('Address ID:', addressId);

        const response = await fetch(`/profile/${addressId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update address");
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('editAddressModal'));
        modal.hide();
        
        window.location.reload();
        
    } catch (error) {
        console.error("Error:", error.message);
        showErrorToast("Failed to update address: " + error.message);
    }
}

async function deleteAddress(addressId) {
    try {
        const confirmed = await Swal.fire({
            title: 'Delete Address?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (confirmed.isConfirmed) {
            const response = await fetch(`/address/${addressId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete address');
            }

            window.location.reload();
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        showErrorToast(error.message);
    }
}

function validateAddressForm(formData) {
    const errors = [];
    
    // Log validation input
    console.log('Validating form data:');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }
    
    const name = formData.get('fullName');
    if (!name || name.trim().length < 3) {
        errors.push('Name must be at least 3 characters long');
    }

    const phone = formData.get('phone');
    console.log('Phone number being validated:', phone);
    
    if (!phone) {
        errors.push('Phone number is required');
    } else if (!/^\d+$/.test(phone)) {
        errors.push('Phone number must contain only digits');
    } else if (phone.length !== 10) {
        errors.push('Phone number must be exactly 10 digits');
    }

    if (!formData.get('street') || formData.get('street').trim().length < 5) {
        errors.push('Street address must be at least 5 characters long');
    }

    if (!formData.get('city') || formData.get('city').trim().length < 2) {
        errors.push('City name must be at least 2 characters long');
    }

    if (!formData.get('state') || formData.get('state').trim().length < 2) {
        errors.push('State name must be at least 2 characters long');
    }

    if (!formData.get('country') || formData.get('country').trim().length < 2) {
        errors.push('Country name must be at least 2 characters long');
    }

    const pinCode = formData.get('pinCode');
    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
        errors.push('Pin code must be 6 digits');
    }

    if (!formData.get('addressType')) {
        errors.push('Please select an address type');
    }

    console.log('Validation errors:', errors);
    return errors;
}

async function showValidationErrors(errors) {
    const errorHtml = errors.map(error => `<li>${error}</li>`).join('');
    await Swal.fire({
        title: 'Validation Error',
        html: `<ul class="text-start">${errorHtml}</ul>`,
        icon: 'error'
    });
}

function showErrorToast(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}

async function getAddresses() {
    try {
        const response = await fetch('/addresses');
        if (!response.ok) {
            throw new Error('Failed to fetch addresses');
        }
        const data = await response.json();
        return data.addresses;
    } catch (error) {
        console.error('Error fetching addresses:', error);
        return [];
    }
}
