async function addAddress(event) {
    if(event) event.preventDefault();

    try {
        const saveAddress = document.getElementById('addressForm');
        const formData = new FormData(saveAddress);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
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
            throw new Error("Failed to add address");
        }

        const result = await response.json();
        console.log("Server response:", result);

        const modal = bootstrap.Modal.getInstance(document.getElementById('addAddressModal'));
        modal.hide();
        
        window.location.reload();
        
    } catch (error) {
        console.error("Error:", error.message);
        showErrorToast("Failed to add address: " + error.message);
    }
}

function editModal(addressId) {
    const address = window.addresses.address.find(addr => addr._id === addressId);
    if (!address) return;

    const form = document.getElementById('editAddressForm');
    Object.entries(address).forEach(([key, value]) => {
        const input = form.elements[key];
        if (input) {
            input.type === 'checkbox' ? input.checked = value : input.value = value;
        }
    });

    // Open modal
    const modal = new bootstrap.Modal(document.getElementById('editAddressModal'));
    modal.show();
}

async function updateAddress(event) {
    if(event) event.preventDefault();

    try {
        const editAddressForm = document.getElementById('editAddressForm');
        const formData = new FormData(editAddressForm);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });

        const isDefaultCb = document.getElementById('editDefaultAddress');
        data.isDefault = isDefaultCb.checked;

        const response = await fetch(`/profile/${data._id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if(!response.ok) {
            throw new Error("Failed to update address");
        }

        const result = await response.json();
        console.log("Server response:", result);

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
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (!result.isConfirmed) {
            return;
        }

        const response = await fetch(`/address/${addressId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete address');
        }

        await Swal.fire(
            'Deleted!',
            'Your address has been deleted.',
            'success'
        );

        window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire(
            'Error!',
            'Failed to delete address',
            'error'
        );
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Profile Navigation
    const navItems = document.querySelectorAll('.profile-nav .nav-item');
    const sections = document.querySelectorAll('.profile-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items and sections
            navItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show corresponding section
            const sectionId = item.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });
});
