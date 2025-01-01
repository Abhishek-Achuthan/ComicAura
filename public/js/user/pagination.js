function initializePagination(totalItems, itemsPerPage, containerID, paginationID) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const container = document.getElementById(containerID);
    const paginationContainer = document.getElementById(paginationID);
    const items = container.getElementsByClassName('cart-item');
    let currentPage = 1;

    function showPage(page) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        
        Array.from(items).forEach((item, index) => {
            item.style.display = (index >= start && index < end) ? '' : 'none';
        });
        
        renderPagination();
    }

    function renderPagination() {
        let html = '<div class="pagination-wrapper">';
        
        html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                 onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                 <i class="bi bi-chevron-left"></i>
                </button>`;

        html += `<span class="page-info">${currentPage} / ${totalPages}</span>`;

        html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                 onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                 <i class="bi bi-chevron-right"></i>
                </button>`;

        html += '</div>';
        paginationContainer.innerHTML = html;
    }

    window.changePage = function(page) {
        if (page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        showPage(currentPage);
    }

    showPage(1);
}
