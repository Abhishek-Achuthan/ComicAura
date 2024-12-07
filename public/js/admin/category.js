
document.getElementById('addCategoryForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    
    const name = document.getElementById('categorieName').value.trim();
    const description = document.getElementById('descriptionId').value.trim();

    if (!name || !description) {
        Swal.fire('Error', 'Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch('/admin/addCategory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });

        const result = await response.json();

        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message,
                showConfirmButton: false,
                timer: 1500
            });


            const tbody = document.querySelector('table tbody');
            const newRow = `
                <tr data-category-id="${result.category._id}">
                    <td></td>
                    <td>${result.category.name}</td>
                    <td>${result.category.description || 'N/A'}</td>
                    <td>
                        <span class="badge rounded-pill alert-success">
                            Listed
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-danger mb-2" onclick="toggleCategory('${result.category._id}', false)">
                            <i class="fas fa-ban"></i> Unlist
                        </button>
                    </td>
                    <td>
                        <a href="/admin/editCategory/${result.category._id}" class="btn btn-info">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                    </td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteCategory('${result.category._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', newRow);
            document.getElementById('addCategoryForm').reset();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: result.message || 'Failed to add category'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Something went wrong while adding the category'
        });
    }
});

async function toggleCategory(categoryId, isList) {
    try {
        const response = await fetch(`/admin/category/${categoryId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: isList })
        });

        const result = await response.json();

        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message,
                showConfirmButton: false,
                timer: 1500
            });

          
            const row = document.querySelector(`tr[data-category-id="${categoryId}"]`);
            const statusBadge = row.querySelector('.badge');
            const toggleButton = row.querySelector('.btn-danger, .btn-success');

            statusBadge.className = `badge rounded-pill alert-${isList ? 'success' : 'danger'}`;
            statusBadge.textContent = isList ? 'Listed' : 'Unlisted';

            if (isList) {
                toggleButton.className = 'btn btn-danger mb-2';
                toggleButton.innerHTML = '<i class="fas fa-ban"></i> Unlist';
                toggleButton.onclick = () => toggleCategory(categoryId, false);
            } else {
                toggleButton.className = 'btn btn-success';
                toggleButton.innerHTML = '<i class="fas fa-check"></i> List';
                toggleButton.onclick = () => toggleCategory(categoryId, true);
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: result.message || 'Failed to update category status'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Something went wrong while updating the category'
        });
    }
}

async function deleteCategory(categoryId) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This category will be deleted!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            const response = await fetch(`/admin/category/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const row = document.querySelector(`tr[data-category-id="${categoryId}"]`);
                row.style.animation = 'fadeOut 0.5s ease forwards';
                setTimeout(() => {
                    row.remove();
                }, 500);

                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: data.message,
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                Swal.fire('Error!', data.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error!', 'Failed to delete category', 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {

    const rows = document.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        row.style.setProperty('--row-index', index);
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    document.querySelectorAll('.btn').forEach(button => {
        button.removeEventListener('click', addRippleEffect);
    });

    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', addRippleEffect);
    });
});

function addRippleEffect(e) {
    this.querySelectorAll('.ripple').forEach(ripple => ripple.remove());
    
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    this.appendChild(ripple);
    
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = e.clientX - rect.left - size/2 + 'px';
    ripple.style.top = e.clientY - rect.top - size/2 + 'px';
    
    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}
