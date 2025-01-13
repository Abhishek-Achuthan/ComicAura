let isProcessingOrder = false;

window.selectAddress = function(addressId) {
    const address = addresses.find(addr => addr._id === addressId);
    if (address) {
        const selectedAddressHtml = `
            <h5>${address.name}</h5>
            <p>${address.street}</p>
            <p>${address.city}, ${address.state} ${address.pinCode}</p>
            <p class="mb-0"><i class="fas fa-phone"></i> ${address.phoneNumber}</p>
        `;
        
        document.querySelector('.selected-address-details').innerHTML = selectedAddressHtml;
        document.querySelector('input[name="selectedAddress"]').value = addressId;

        const addressListModal = document.getElementById('addressListModal');
        const modal = bootstrap.Modal.getInstance(addressListModal);
        if (modal) {
            modal.hide();
        }
    }
};

window.editAddress = function(addressId) {
    const address = addresses.find(addr => addr._id === addressId);
    if (address) {
        const addressListModal = bootstrap.Modal.getInstance(document.getElementById('addressListModal'));
        if (addressListModal) {
            addressListModal.hide();
        }

        document.getElementById('editAddressId').value = address._id;
        document.getElementById('editFullName').value = address.name;
        document.getElementById('editPhone').value = address.phoneNumber;
        document.getElementById('editStreet').value = address.street;
        document.getElementById('editCity').value = address.city;
        document.getElementById('editState').value = address.state;
        document.getElementById('editCountry').value = address.country;
        document.getElementById('editPinCode').value = address.pinCode;
        document.getElementById('editAddressType').value = address.addressType;
        
        const editModal = new bootstrap.Modal(document.getElementById('editAddressModal'));
        editModal.show();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const modals = ['addressListModal', 'addAddressModal', 'editAddressModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('hidden.bs.modal', function () {
                if (!document.querySelector('.modal.show')) {
                    document.body.classList.remove('modal-open');
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                        backdrop.remove();
                    }
                }
            });
        }
    });

    const addressOptions = document.querySelectorAll('.address-option');
    addressOptions.forEach(option => {
        option.addEventListener('click', function() {
            addressOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

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

        if (!selectedPayment) {
            showToast('Please select a payment method', 'error');
            return;
        }

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
                            await updatePaymentStatus(data.orderId, 'Failed');
                            window.location.href = `/payment-failed/${data.orderId}`;
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        await updatePaymentStatus(data.orderId, 'Failed');
                        window.location.href = `/payment-failed/${data.orderId}`;
                    }
                },
                modal: {
                    ondismiss: async function() {
                        await updatePaymentStatus(data.orderId, 'Failed');
                        window.location.href = `/payment-failed/${data.orderId}`;
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
            
            rzp.on('payment.failed', async function(response) {
                console.log('Payment failed:', response.error);
                await updatePaymentStatus(data.orderId, 'Failed', response.error);
                window.location.href = `/payment-failed/${data.orderId}`;
            });

            rzp.open();
        } else {
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

async function updatePaymentStatus(orderId, status, error = null) {
    try {
        const response = await fetch(`/update-payment-status/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, error })
        });
        
        if (!response.ok) {
            console.error('Failed to update payment status');
        }
    } catch (err) {
        console.error('Error updating payment status:', err);
    }
}

function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "center",
        backgroundColor: type === 'error' ? "#ff0000" : "#4CAF50",
        stopOnFocus: true
    }).showToast();
}

async function addAddress(event) {
    if(event) event.preventDefault();

    try {
        const addAddressForm = document.getElementById('addAddressForm');
        const formData = new FormData(addAddressForm);

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
        const address = addresses.find(addr => addr._id === addressId);
        
        if (!address) {
            throw new Error('Address not found');
        }

        document.getElementById('editAddressId').value = addressId;

        document.getElementById('editFullName').value = address.name;
        document.getElementById('editPhone').value = address.phoneNumber;
        document.getElementById('editStreet').value = address.street;
        document.getElementById('editCity').value = address.city;
        document.getElementById('editState').value = address.state;
        document.getElementById('editCountry').value = address.country;
        document.getElementById('editPinCode').value = address.pinCode;
        document.getElementById('editAddressType').value = address.addressType;
        document.getElementById('editDefaultAddress').checked = address.isDefault;

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
            } else if (key !== '_id') { 
                data[key] = value.trim();
            }
        });

        const isDefaultCb = document.getElementById('editDefaultAddress');
        data.isDefault = isDefaultCb.checked;

        if (!addressId) {
            throw new Error("Address ID is missing");
        }


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
    
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }
    
    const name = formData.get('fullName');
    if (!name || name.trim().length < 3) {
        errors.push('Name must be at least 3 characters long');
    }

    const phone = formData.get('phone');
    
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

async function applyCoupon(couponCode) {
    try {
        const response = await fetch('/apply-coupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ code: couponCode })
        });

        const result = await response.json();
        
        const couponMessage = document.getElementById('couponMessage');
        const couponInput = document.getElementById('couponCode');
        const applyButton = document.getElementById('applyCouponBtn');
        
        if (!couponMessage || !couponInput || !applyButton) {
            console.error('Required elements not found');
            return;
        }

        if (result.success) {
            const data = result.data;
            
            const subtotalElement = document.getElementById('subtotal');
            if (subtotalElement) {
                subtotalElement.textContent = `₹${data.subtotal.toFixed(2)}`;
            }
            
            let discountRow = document.querySelector('.discount-row');
            if (!discountRow) {
                discountRow = document.createElement('div');
                discountRow.classList.add('summary-item', 'discount-row');
                const subtotalElement = document.querySelector('.summary-item');
                if (subtotalElement && subtotalElement.parentNode) {
                    subtotalElement.parentNode.insertBefore(discountRow, subtotalElement.nextSibling);
                }
            }

            if (data.discountAmount > 0) {
                discountRow.innerHTML = `
                    <span class="summary-label">
                        Discount${data.coupon ? ` (${data.coupon.code})` : ''}
                        <button onclick="removeCoupon()" class="btn btn-link btn-sm text-danger p-0 ms-2">
                            <i class="fas fa-times"></i>
                        </button>
                    </span>
                    <span class="summary-value text-success">-₹${data.discountAmount.toFixed(2)}</span>
                `;
                discountRow.style.display = 'flex';
            } else {
                discountRow.style.display = 'none';
            }
            
            const taxElement = document.getElementById('tax');
            if (taxElement) {
                taxElement.textContent = `₹${data.tax.toFixed(2)}`;
            }
            
            const totalElement = document.getElementById('total');
            if (totalElement) {
                totalElement.textContent = `₹${data.total.toFixed(2)}`;
            }

            couponMessage.textContent = result.message;
            couponMessage.className = 'mt-2 small text-success';

            couponInput.value = data.coupon ? data.coupon.code : couponCode.toUpperCase();
            couponInput.disabled = true;

            applyButton.disabled = true;

            const modal = bootstrap.Modal.getInstance(document.getElementById('couponsModal'));
            if (modal) {
                modal.hide();
            }

            if (window.razorpayOptions) {
                window.razorpayOptions.amount = Math.round(data.total * 100);
            }

        } else {
            couponMessage.textContent = result.message;
            couponMessage.className = 'mt-2 small text-danger';
            
            couponInput.value = '';
            couponInput.disabled = false;
            applyButton.disabled = false;
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        const couponMessage = document.getElementById('couponMessage');
        const couponInput = document.getElementById('couponCode');
        const applyButton = document.getElementById('applyCouponBtn');
        
        if (couponMessage) {
            couponMessage.textContent = 'Failed to apply coupon. Please try again.';
            couponMessage.className = 'mt-2 small text-danger';
        }
        
        if (couponInput && applyButton) {
            couponInput.value = '';
            couponInput.disabled = false;
            applyButton.disabled = false;
        }
    }
}

async function removeCoupon() {
    try {
        const response = await fetch('/remove-coupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const result = await response.json();
        if (result.success) {
            location.reload();
        } else {
            console.error('Failed to remove coupon:', result.message);
        }
    } catch (error) {
        console.error('Error removing coupon:', error);
    }
}

function updateOrderSummary(data) {
    document.querySelector('.summary-item:nth-child(1) .summary-value').textContent = 
        `₹${data.subtotal.toFixed(2)}`;
    
    document.querySelector('.summary-item:nth-child(2) .summary-value').textContent = 
        `₹${data.tax.toFixed(2)}`;
    
    const discountElement = document.querySelector('.summary-item.discount');
    if (data.discount > 0) {
        if (!discountElement) {
            const discountHtml = `
                <div class="summary-item discount">
                    <span class="summary-label">Discount</span>
                    <span class="summary-value text-success">-₹${data.discount.toFixed(2)}</span>
                </div>
            `;
            document.querySelector('.summary-item:nth-child(2)').insertAdjacentHTML('afterend', discountHtml);
        } else {
            discountElement.querySelector('.summary-value').textContent = `-₹${data.discount.toFixed(2)}`;
        }
    }
    
    document.querySelector('.summary-item:last-child .summary-value').textContent = 
        `₹${data.total.toFixed(2)}`;
}
