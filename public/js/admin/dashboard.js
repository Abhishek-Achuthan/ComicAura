// Function to show/hide loaders
function toggleLoader(elementId, show) {
    const loader = document.getElementById(elementId);
    if (loader) {
        loader.classList.toggle('d-none', !show);
    }
}

// Function to handle unauthorized access
function handleUnauthorized() {
    window.location.href = '/admin';
}

// Function to show error message
function showError(message) {
    // You can implement a toast or alert system here
    console.error(message);
}

// Function to fetch sales data based on time filter
async function fetchSalesData(timeframe) {
    toggleLoader('salesChartLoader', true);
    try {
        const response = await fetch(`/admin/dashboard/sales-data?timeFrame=${timeframe}`);
        
        if (response.redirected) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();

        if (data.success) {
            
            salesChart.data.labels = data.labels;
            salesChart.data.datasets[0].data = data.values;

            // Adjust point radius based on number of data points
            const pointRadius = data.labels.length > 30 ? 0 : 4;
            salesChart.data.datasets[0].pointRadius = pointRadius;
            salesChart.data.datasets[0].pointHoverRadius = pointRadius + 2;

            // Calculate total revenue
            const totalRevenue = data.values.reduce((sum, val) => sum + val, 0);
            const totalRevenueElement = document.getElementById('totalRevenue');
            if (totalRevenueElement) {
                totalRevenueElement.textContent = `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            } else {
                console.warn('Total revenue element not found');
            }

            salesChart.update();
        } else {
            console.error('Failed to load sales data:', data.message);
            showError(data.message || 'Failed to load sales data');
        }
    } catch (error) {
        console.error('Error fetching sales data:', error);
        showError('Failed to load sales data');
    } finally {
        toggleLoader('salesChartLoader', false);
    }
}

// Function to fetch category data
async function fetchCategoryData() {
    toggleLoader('categoriesChartLoader', true);
    try {
        const response = await fetch('/admin/dashboard/top-categories');
        if (response.redirected) {
            handleUnauthorized();
            return;
        }
        if (!response.ok) throw new Error('Failed to fetch category data');
        
        const data = await response.json();

        if (data.success && data.categories && data.categories.length > 0) {
            // Update chart data
            categoriesChart.data.labels = data.categories.map(cat => cat.name);
            categoriesChart.data.datasets[0].data = data.categories.map(cat => cat.sales);

            // Update chart options
            categoriesChart.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return `${label}: ₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            };

            categoriesChart.update();
        } else {
            const ctx = categoriesChart.ctx;
            const width = categoriesChart.width;
            const height = categoriesChart.height;
            
            categoriesChart.clear();
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '16px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('No category data available', width / 2, height / 2);
            ctx.restore();
        }
    } catch (error) {
        console.error('Error fetching category data:', error);
        showError('Failed to load category data');
    } finally {
        toggleLoader('categoriesChartLoader', false);
    }
}

// Function to update top products table
async function updateTopProducts() {
    toggleLoader('productsLoader', true);
    try {
        const response = await fetch('/admin/dashboard/top-products');
        if (response.redirected) {
            handleUnauthorized();
            return;
        }
        if (!response.ok) throw new Error('Failed to fetch product data');
        
        const data = await response.json();
        if (data.success) {
            const tbody = document.getElementById('topProductsList');
            tbody.innerHTML = data.products.map(product => `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.unitsSold.toLocaleString()}</td>
                    <td>₹${product.revenue.toLocaleString()}</td>
                </tr>
            `).join('');
        } else {
            showError(data.message || 'Failed to load product data');
        }
    } catch (error) {
        console.error('Error fetching top products:', error);
        showError('Failed to load product data');
    } finally {
        toggleLoader('productsLoader', false);
    }
}

const salesChartCtx = document.getElementById('salesChart');
if (!salesChartCtx) {
    console.error('Sales chart canvas element not found!');
} 


const salesChart = new Chart(salesChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Sales Revenue',
            data: [],
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        label += '₹' + context.parsed.y.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    }
});

// Initialize categories chart
const categoriesChartCtx = document.getElementById('categoriesChart').getContext('2d');
const categoriesChart = new Chart(categoriesChartCtx, {
    type: 'doughnut',
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',  
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)', 
                'rgba(255, 159, 64, 0.8)',  
                'rgba(76, 175, 80, 0.8)',  
                'rgba(233, 30, 99, 0.8)', 
                'rgba(121, 85, 72, 0.8)',  
                'rgba(96, 125, 139, 0.8)'    
            ],
            borderColor: '#fff',
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 15,
                    padding: 15,
                    font: {
                        size: 12
                    },
                    generateLabels: function(chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return {
                                    text: `${label} (${percentage}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].borderColor,
                                    lineWidth: data.datasets[0].borderWidth,
                                    hidden: isNaN(data.datasets[0].data[i]) || data.datasets[0].data[i] === 0,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${percentage}%)`;
                    }
                }
            }
        }
    }
});

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    
    const timeFilter = document.getElementById('timeFilter');
    if (!timeFilter) {
        console.error('Time filter element not found!');
    } else {
        timeFilter.addEventListener('change', function(e) {
            fetchSalesData(e.target.value);
        });
        
        fetchSalesData('monthly');
    }

    // Load category data
    fetchCategoryData();
});