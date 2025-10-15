// Admin Dashboard JavaScript
$(document).ready(function() {
    // Initialize dashboard
    initializeDashboard();
    
    // Sidebar functionality
    initializeSidebar();
    
    // Navigation functionality
    initializeNavigation();
    
    // Data loading
    loadDashboardData();
    
    // Modal functionality
    initializeModals();
    
    // Charts initialization
    initializeCharts();
    
    // Real-time updates
    initializeRealTimeUpdates();
    
    function initializeDashboard() {
        // Add loading states
        $('.dashboard-section').hide();
        $('#overview-section').show();
        
        // Initialize tooltips
        $('[data-bs-toggle="tooltip"]').tooltip();
        
        // Add smooth scrolling
        $('html').css('scroll-behavior', 'smooth');
    }
    
    function initializeSidebar() {
        // Sidebar toggle
        $('.sidebar-toggle').on('click', function() {
            $('.sidebar').toggleClass('collapsed');
        });
        
        // Mobile sidebar toggle
        if (window.innerWidth <= 768) {
            $('.sidebar').addClass('collapsed');
        }
        
        // Handle window resize
        $(window).on('resize', function() {
            if (window.innerWidth <= 768) {
                $('.sidebar').addClass('collapsed');
            } else {
                $('.sidebar').removeClass('collapsed');
            }
        });
        
        // Menu item active state
        $('.menu-item').on('click', function(e) {
            e.preventDefault();
            
            const section = $(this).data('section');
            
            // Update active menu item
            $('.menu-item').removeClass('active');
            $(this).addClass('active');
            
            // Show corresponding section
            $('.dashboard-section').removeClass('active').hide();
            $(`#${section}-section`).addClass('active').show();
            
            // Load section data
            loadSectionData(section);
        });
    }
    
    function initializeNavigation() {
        // Quick action buttons
        $('[data-action]').on('click', function() {
            const action = $(this).data('action');
            handleQuickAction(action);
        });
        
        // User dropdown
        $('.user-btn').on('click', function(e) {
            e.stopPropagation();
            $('.user-dropdown').toggle();
        });
        
        // Close dropdown when clicking outside
        $(document).on('click', function() {
            $('.user-dropdown').hide();
        });
        
        // Notification button
        $('.notification-btn').on('click', function() {
            // Show notifications modal or dropdown
            showNotifications();
        });
    }
    
    function loadDashboardData() {
        // Load overview data
        loadOverviewData();
        
        // Load users data
        loadUsersData();
        
        // Load services data
        loadServicesData();
        
        // Load parts data
        loadPartsData();
        
        // Load bookings data
        loadBookingsData();
        
        // Load orders data
        loadOrdersData();
        
        // Load discounts data
        loadDiscountsData();
    }
    
    function loadSectionData(section) {
        switch(section) {
            case 'overview':
                loadOverviewData();
                break;
            case 'users':
                loadUsersData();
                break;
            case 'services':
                loadServicesData();
                break;
            case 'parts':
                loadPartsData();
                break;
            case 'bookings':
                loadBookingsData();
                break;
            case 'orders':
                loadOrdersData();
                break;
            case 'discounts':
                loadDiscountsData();
                break;
            case 'analytics':
                loadAnalyticsData();
                break;
        }
    }
    
    function loadOverviewData() {
        // Overview data is already loaded from server
        // Add any additional client-side processing here
    }
    
    function loadUsersData() {
        $.ajax({
            url: '/api/admin/users',
            method: 'GET',
            success: function(data) {
                renderUsersTable(data.users);
            },
            error: function(xhr, status, error) {
                console.error('Error loading users:', error);
                showToast('Error loading users data', 'danger');
            }
        });
    }
    
    function loadServicesData() {
        $.ajax({
            url: '/api/admin/services',
            method: 'GET',
            success: function(data) {
                renderServicesGrid(data.services);
            },
            error: function(xhr, status, error) {
                console.error('Error loading services:', error);
                showToast('Error loading services data', 'danger');
            }
        });
    }
    
    function loadPartsData() {
        $.ajax({
            url: '/api/admin/car_parts',
            method: 'GET',
            success: function(data) {
                renderPartsTable(data.parts);
            },
            error: function(xhr, status, error) {
                console.error('Error loading parts:', error);
                showToast('Error loading parts data', 'danger');
            }
        });
    }
    
    function loadBookingsData() {
        $.ajax({
            url: '/api/admin/bookings',
            method: 'GET',
            success: function(data) {
                renderBookingsGrid(data.bookings);
            },
            error: function(xhr, status, error) {
                console.error('Error loading bookings:', error);
                showToast('Error loading bookings data', 'danger');
            }
        });
    }
    
    function loadOrdersData() {
        $.ajax({
            url: '/api/admin/orders',
            method: 'GET',
            success: function(data) {
                renderOrdersTable(data.orders);
            },
            error: function(xhr, status, error) {
                console.error('Error loading orders:', error);
                showToast('Error loading orders data', 'danger');
            }
        });
    }
    
    function loadDiscountsData() {
        $.ajax({
            url: '/api/admin/discounts',
            method: 'GET',
            success: function(data) {
                renderDiscountsGrid(data.discounts);
            },
            error: function(xhr, status, error) {
                console.error('Error loading discounts:', error);
                showToast('Error loading discounts data', 'danger');
            }
        });
    }
    
    function loadAnalyticsData() {
        const period = $('#analytics-period').val();
        
        $.ajax({
            url: '/api/admin/analytics',
            method: 'GET',
            data: { period: period },
            success: function(data) {
                updateCharts(data);
            },
            error: function(xhr, status, error) {
                console.error('Error loading analytics:', error);
                showToast('Error loading analytics data', 'danger');
            }
        });
    }
    
    function renderUsersTable(users) {
        const tbody = $('#users-table-body');
        tbody.empty();
        
        users.forEach(user => {
            const row = `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="status-badge ${user.role}">${user.role}</span></td>
                    <td><span class="status-badge ${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" onclick="editUser(${user.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteUser(${user.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }
    
    function renderServicesGrid(services) {
        const grid = $('#services-grid');
        grid.empty();
        
        services.forEach(service => {
            const card = `
                <div class="service-card">
                    <div class="service-header">
                        <h4>${service.name}</h4>
                        <span class="status-badge ${service.is_active ? 'active' : 'inactive'}">${service.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="service-body">
                        <p class="service-type">${service.service_type || 'General'}</p>
                        <p class="service-description">${service.description || 'No description available'}</p>
                        <div class="service-meta">
                            <span class="service-price">$${service.price}</span>
                            <span class="service-duration">${service.duration} min</span>
                        </div>
                    </div>
                    <div class="service-footer">
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" onclick="editService(${service.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteService(${service.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.append(card);
        });
    }
    
    function renderPartsTable(parts) {
        const tbody = $('#parts-table-body');
        tbody.empty();
        
        parts.forEach(part => {
            const stockStatus = part.stock > 10 ? 'in-stock' : part.stock > 0 ? 'low-stock' : 'out-of-stock';
            const stockText = part.stock > 10 ? 'In Stock' : part.stock > 0 ? 'Low Stock' : 'Out of Stock';
            
            const row = `
                <tr>
                    <td>${part.id}</td>
                    <td>${part.name}</td>
                    <td>${part.category || 'N/A'}</td>
                    <td>$${part.price}</td>
                    <td>${part.stock}</td>
                    <td><span class="status-badge ${stockStatus}">${stockText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" onclick="editPart(${part.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deletePart(${part.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }
    
    function renderBookingsGrid(bookings) {
        const grid = $('#bookings-grid');
        grid.empty();
        
        bookings.forEach(booking => {
            const card = `
                <div class="booking-card">
                    <div class="booking-header">
                        <h4>${booking.service_name}</h4>
                        <span class="status-badge ${booking.status}">${booking.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div class="booking-body">
                        <p><strong>Client:</strong> ${booking.client_name}</p>
                        <p><strong>Vehicle:</strong> ${booking.registration_no || 'N/A'} - ${booking.model || 'N/A'}</p>
                        <p><strong>Scheduled:</strong> ${new Date(booking.scheduled_date).toLocaleString()}</p>
                        <p><strong>Assigned to:</strong> ${booking.service_person || 'Unassigned'}</p>
                    </div>
                    <div class="booking-footer">
                        <div class="action-buttons">
                            <button class="btn-action btn-view" onclick="viewBooking(${booking.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action btn-edit" onclick="updateBookingStatus(${booking.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-view" onclick="generateReport(${booking.id})">
                                <i class="fas fa-file-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.append(card);
        });
    }
    
    function renderOrdersTable(orders) {
        const tbody = $('#orders-table-body');
        tbody.empty();
        
        orders.forEach(order => {
            const row = `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.username}</td>
                    <td>$${order.total_price}</td>
                    <td><span class="status-badge ${order.payment_status}">${order.payment_status.toUpperCase()}</span></td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-view" onclick="viewOrder(${order.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }
    
    function renderDiscountsGrid(discounts) {
        const grid = $('#discounts-grid');
        grid.empty();
        
        discounts.forEach(discount => {
            const card = `
                <div class="discount-card">
                    <div class="discount-header">
                        <h4>${discount.code}</h4>
                        <span class="status-badge ${discount.is_active ? 'active' : 'inactive'}">${discount.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="discount-body">
                        <p><strong>Type:</strong> ${discount.discount_type}</p>
                        <p><strong>Value:</strong> ${discount.discount_type === 'percentage' ? discount.value + '%' : '$' + discount.value}</p>
                        <p><strong>Usage:</strong> ${discount.used_count}/${discount.usage_limit || '∞'}</p>
                        <p><strong>Expires:</strong> ${discount.expiry_date ? new Date(discount.expiry_date).toLocaleDateString() : 'Never'}</p>
                    </div>
                    <div class="discount-footer">
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" onclick="editDiscount(${discount.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteDiscount(${discount.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.append(card);
        });
    }
    
    function initializeModals() {
        // Add User Modal
        $('#addUserForm').on('submit', function(e) {
            e.preventDefault();
            addUser();
        });
        
        // Add Service Modal
        $('#addServiceForm').on('submit', function(e) {
            e.preventDefault();
            addService();
        });
        
        // Add Part Modal
        $('#addPartForm').on('submit', function(e) {
            e.preventDefault();
            addPart();
        });
        
        // Create Discount Modal
        $('#createDiscountForm').on('submit', function(e) {
            e.preventDefault();
            createDiscount();
        });
    }
    
    function handleQuickAction(action) {
        switch(action) {
            case 'add-user':
                $('#addUserModal').modal('show');
                break;
            case 'add-service':
                $('#addServiceModal').modal('show');
                break;
            case 'add-part':
                $('#addPartModal').modal('show');
                break;
            case 'create-discount':
                $('#createDiscountModal').modal('show');
                break;
            case 'view-reports':
                $('.menu-item[data-section="reports"]').click();
                break;
        }
    }
    
    function addUser() {
        const formData = {
            username: $('input[name="username"]').val(),
            email: $('input[name="email"]').val(),
            password: $('input[name="password"]').val(),
            phone: $('input[name="phone"]').val(),
            role: $('select[name="role"]').val(),
            is_active: $('select[name="is_active"]').val()
        };
        
        $.ajax({
            url: '/api/admin/add_user',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    showToast('User added successfully!', 'success');
                    $('#addUserModal').modal('hide');
                    $('#addUserForm')[0].reset();
                    loadUsersData();
                } else {
                    showToast('Error adding user: ' + response.error, 'danger');
                }
            },
            error: function(xhr, status, error) {
                showToast('Error adding user', 'danger');
            }
        });
    }
    
    function addService() {
        const formData = {
            name: $('input[name="name"]').val(),
            description: $('textarea[name="description"]').val(),
            price: parseFloat($('input[name="price"]').val()),
            duration: parseInt($('input[name="duration"]').val()),
            service_type: $('select[name="service_type"]').val(),
            is_featured: $('select[name="is_featured"]').val() === '1'
        };
        
        $.ajax({
            url: '/api/add_service',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    showToast('Service added successfully!', 'success');
                    $('#addServiceModal').modal('hide');
                    $('#addServiceForm')[0].reset();
                    loadServicesData && loadServicesData();
                } else {
                    showToast('Error adding service: ' + response.error, 'danger');
                }
            },
            error: function(xhr, status, error) {
                showToast('Error adding service', 'danger');
            }
        });
    }
    
    function addPart() {
        const formData = {
            name: $('input[name="name"]').val(),
            description: $('textarea[name="description"]').val(),
            price: parseFloat($('input[name="price"]').val()),
            stock: parseInt($('input[name="stock"]').val()),
            category: $('select[name="category"]').val(),
            is_active: $('select[name="is_active"]').val() === '1'
        };
        
        $.ajax({
            url: '/api/add_car_part',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    showToast('Car part added successfully!', 'success');
                    $('#addPartModal').modal('hide');
                    $('#addPartForm')[0].reset();
                    loadPartsData && loadPartsData();
                } else {
                    showToast('Error adding car part: ' + response.error, 'danger');
                }
            },
            error: function(xhr, status, error) {
                showToast('Error adding car part', 'danger');
            }
        });
    }
    
    function createDiscount() {
        const formData = {
            code: $('input[name="code"]').val(),
            discount_type: $('select[name="discount_type"]').val(),
            value: parseFloat($('input[name="value"]').val()),
            min_order_value: parseFloat($('input[name="min_order_value"]').val()) || 0,
            expiry_date: $('input[name="expiry_date"]').val() || null,
            usage_limit: parseInt($('input[name="usage_limit"]').val()) || null
        };
        
        $.ajax({
            url: '/api/add_discount',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    showToast('Discount created successfully!', 'success');
                    $('#createDiscountModal').modal('hide');
                    $('#createDiscountForm')[0].reset();
                    loadDiscountsData();
                } else {
                    showToast('Error creating discount: ' + response.error, 'danger');
                }
            },
            error: function(xhr, status, error) {
                showToast('Error creating discount', 'danger');
            }
        });
    }
    
    function initializeCharts() {
        // Initialize Chart.js charts
        const ctx1 = document.getElementById('revenue-chart');
        const ctx2 = document.getElementById('booking-chart');
        const ctx3 = document.getElementById('services-chart');
        const ctx4 = document.getElementById('customers-chart');
        
        if (ctx1) {
            window.revenueChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Revenue',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        if (ctx2) {
            window.bookingChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            '#f59e0b',
                            '#3b82f6',
                            '#8b5cf6',
                            '#10b981',
                            '#ef4444'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        if (ctx3) {
            window.servicesChart = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Bookings',
                        data: [],
                        backgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        if (ctx4) {
            window.customersChart = new Chart(ctx4, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'New Customers',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }
    
    function updateCharts(data) {
        if (window.revenueChart && data.revenue) {
            window.revenueChart.data.labels = data.revenue.labels;
            window.revenueChart.data.datasets[0].data = data.revenue.data;
            window.revenueChart.update();
        }
        
        if (window.bookingChart && data.bookings) {
            window.bookingChart.data.datasets[0].data = data.bookings;
            window.bookingChart.update();
        }
        
        if (window.servicesChart && data.services) {
            window.servicesChart.data.labels = data.services.labels;
            window.servicesChart.data.datasets[0].data = data.services.data;
            window.servicesChart.update();
        }
        
        if (window.customersChart && data.customers) {
            window.customersChart.data.labels = data.customers.labels;
            window.customersChart.data.datasets[0].data = data.customers.data;
            window.customersChart.update();
        }
    }
    
    function initializeRealTimeUpdates() {
        // Update analytics when period changes
        $('#analytics-period').on('change', function() {
            loadAnalyticsData();
        });
        
        // Auto-refresh data every 5 minutes
        setInterval(function() {
            const activeSection = $('.menu-item.active').data('section');
            if (activeSection) {
                loadSectionData(activeSection);
            }
        }, 300000); // 5 minutes
    }
    
    function showNotifications() {
        // Implement notifications functionality
        showToast('Notifications feature coming soon!', 'info');
    }
    
    // Global functions for action buttons
    window.editUser = function(userId) {
        showToast('Edit user functionality coming soon!', 'info');
    };
    
    window.deleteUser = function(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            // Implement delete user functionality
            showToast('Delete user functionality coming soon!', 'info');
        }
    };
    
    window.editService = function(serviceId) {
        showToast('Edit service functionality coming soon!', 'info');
    };
    
    window.deleteService = function(serviceId) {
        if (confirm('Are you sure you want to delete this service?')) {
            // Implement delete service functionality
            showToast('Delete service functionality coming soon!', 'info');
        }
    };
    
    window.editPart = function(partId) {
        showToast('Edit part functionality coming soon!', 'info');
    };
    
    window.deletePart = function(partId) {
        if (confirm('Are you sure you want to delete this part?')) {
            // Implement delete part functionality
            showToast('Delete part functionality coming soon!', 'info');
        }
    };
    
    window.viewBooking = function(bookingId) {
        showToast('View booking functionality coming soon!', 'info');
    };
    
    window.updateBookingStatus = function(bookingId) {
        showToast('Update booking status functionality coming soon!', 'info');
    };
    
    window.generateReport = function(bookingId) {
        window.open(`/admin/generate_report/${bookingId}`, '_blank');
    };
    
    window.viewOrder = function(orderId) {
        showToast('View order functionality coming soon!', 'info');
    };
    
    window.editDiscount = function(discountId) {
        showToast('Edit discount functionality coming soon!', 'info');
    };
    
    window.deleteDiscount = function(discountId) {
        if (confirm('Are you sure you want to delete this discount?')) {
            // Implement delete discount functionality
            showToast('Delete discount functionality coming soon!', 'info');
        }
    };
});

// Toast notification function
function showToast(message, type = 'info', duration = 3000) {
    const toast = $(`
        <div class="toast-notification alert alert-${type} alert-dismissible fade show" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    
    $('body').append(toast);
    
    setTimeout(() => {
        toast.fadeOut(() => toast.remove());
    }, duration);
}





