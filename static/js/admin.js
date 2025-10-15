// Admin Dashboard Form Handling - Fixed and Optimized
$(document).ready(function() {
    console.log('Initializing admin form handlers...');
    
    // Image preview functionality
    $('#serviceImage').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showNotification('Please select a valid image file', 'error');
                this.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#serviceImagePreview').attr('src', e.target.result).show();
            }
            reader.readAsDataURL(file);
        }
    });

    $('#partImage').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showNotification('Please select a valid image file', 'error');
                this.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#partImagePreview').attr('src', e.target.result).show();
            }
            reader.readAsDataURL(file);
        }
    });

    // Add Service Form Submission
$('#addServiceForm').off('submit').on('submit', function(e) {
    e.preventDefault();
    if ($(this).data('submitting')) return;
    $(this).data('submitting', true);
    handleServiceFormSubmission(this);
});

// Edit Service Form Submission
$('#editServiceForm').off('submit').on('submit', function(e) {
    e.preventDefault();
    if ($(this).data('submitting')) return;
    $(this).data('submitting', true);
    handleEditServiceFormSubmission(this);
});

// Add Car Part Form Submission
$('#addCarPartForm').off('submit').on('submit', function(e) {
    e.preventDefault();
    if ($(this).data('submitting')) return;
    $(this).data('submitting', true);
    handlePartFormSubmission(this);
});

// Edit Part Form Submission
$('#editPartForm').off('submit').on('submit', function(e) {
    e.preventDefault();
    if ($(this).data('submitting')) return;
    $(this).data('submitting', true);
    handleEditPartFormSubmission(this);
});

    // Restock Part Form Submission
    $('#restockForm').on('submit', function(e) {
        e.preventDefault();
        handleRestockFormSubmission(this);
    });

    // Reset forms when modals are closed
    $('#addServiceModal').on('hidden.bs.modal', function() {
        $('#addServiceForm')[0].reset();
        $('#serviceImagePreview').hide();
        $('.is-invalid').removeClass('is-invalid');
    });

    $('#addPartModal').on('hidden.bs.modal', function() {
        $('#addCarPartForm')[0].reset();
        $('#partImagePreview').hide();
        $('.is-invalid').removeClass('is-invalid');
    });

    $('#editServiceModal').on('hidden.bs.modal', function() {
        $('.is-invalid').removeClass('is-invalid');
    });

    $('#editPartModal').on('hidden.bs.modal', function() {
        $('.is-invalid').removeClass('is-invalid');
    });
});

// Add Service Form Handler
function handleServiceFormSubmission(form) {
    const $form = $(form);
    const submitBtn = $form.find('button[type="submit"]');
    const originalText = submitBtn.html();
    
    // Validate form
    if (!validateServiceForm(form)) {
        showNotification('Please fill in all required fields correctly', 'warning');
        $form.data('submitting', false);
        return;
    }
    
    // Show loading state
    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
    showLoadingOverlay();
    
    const formData = new FormData(form);
    
    // Convert boolean values to integers (1/0) for MySQL
    formData.set('is_active', $('#serviceStatus').is(':checked') ? '1' : '0');
    formData.set('is_featured', $('#serviceFeatured').is(':checked') ? '1' : '0');
    
    // Ensure numeric values are properly formatted
    const price = parseFloat($('#servicePrice').val() || 0);
    const duration = parseInt($('#serviceDuration').val() || 60);
    
    if (price < 0 || duration < 0) {
        showNotification('Price and duration must be positive numbers', 'error');
        submitBtn.prop('disabled', false).html(originalText);
        hideLoadingOverlay();
        $form.data('submitting', false);
        return;
    }
    
    formData.set('price', price);
    formData.set('duration', duration);
    
    console.log('Submitting service form...');
    
    $.ajax({
        url: '/api/add_service',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            console.log('Service submission response:', response);
            if (response.success) {
                showNotification('Service added successfully!', 'success');
                $('#addServiceModal').modal('hide');
                form.reset();
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification('Error: ' + (response.error || 'Unknown error'), 'error');
                $form.data('submitting', false);
            }
        },
        error: function(xhr, status, error) {
            console.error('Service submission error:', xhr, status, error);
            let errorMessage = 'An error occurred while adding the service.';
            
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMessage = xhr.responseJSON.error;
            } else if (xhr.status === 0) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (xhr.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (xhr.status === 413) {
                errorMessage = 'File too large. Please use a smaller image.';
            } else {
                errorMessage = `Error ${xhr.status}: ${xhr.statusText}`;
            }
            
            showNotification(errorMessage, 'error');
            $form.data('submitting', false);
        },
        complete: function() {
            submitBtn.prop('disabled', false).html(originalText);
            hideLoadingOverlay();
        }
    });
}

// Edit Service Form Handler
function handleEditServiceFormSubmission(form) {
    const $form = $(form);
    const submitBtn = $form.find('button[type="submit"]');
    const originalText = submitBtn.html();
    
    if (!validateServiceForm(form)) {
        showNotification('Please fill in all required fields correctly', 'warning');
        $form.data('submitting', false);
        return;
    }
    
    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Updating...');
    showLoadingOverlay();
    
    const formData = new FormData(form);
    const serviceId = $('#editServiceId').val();
    
    formData.set('is_active', $('#editServiceStatus').is(':checked') ? '1' : '0');
    formData.set('is_featured', $('#editServiceFeatured').is(':checked') ? '1' : '0');
    
    $.ajax({
        url: `/api/edit_service/${serviceId}`,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.success) {
                showNotification('Service updated successfully!', 'success');
                $('#editServiceModal').modal('hide');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification('Error: ' + (response.error || 'Unknown error'), 'error');
                $form.data('submitting', false);
            }
        },
        error: function(xhr) {
            handleAjaxError(xhr, 'updating the service');
            $form.data('submitting', false);
        },
        complete: function() {
            submitBtn.prop('disabled', false).html(originalText);
            hideLoadingOverlay();
        }
    });
}

// Add Car Part Form Handler
function handlePartFormSubmission(form) {
    const $form = $(form);
    const submitBtn = $form.find('button[type="submit"]');
    const originalText = submitBtn.html();
    
    // Validate form
    if (!validatePartForm(form)) {
        showNotification('Please fill in all required fields correctly', 'warning');
        $form.data('submitting', false);
        return;
    }
    
    // Show loading state
    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
    showLoadingOverlay();
    
    const formData = new FormData(form);
    
    // Convert boolean values to integers (1/0) for MySQL
    formData.set('is_active', $('#partStatus').is(':checked') ? '1' : '0');
    
    // Ensure numeric values are properly formatted
    const price = parseFloat($('#partPrice').val() || 0);
    const stock = parseInt($('#partStock').val() || 0);
    
    if (price < 0 || stock < 0) {
        showNotification('Price and stock must be positive numbers', 'error');
        submitBtn.prop('disabled', false).html(originalText);
        hideLoadingOverlay();
        $form.data('submitting', false);
        return;
    }
    
    formData.set('price', price);
    formData.set('stock', stock);
    
    console.log('Submitting part form...');
    
    $.ajax({
        url: '/api/add_car_part',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            console.log('Part submission response:', response);
            if (response.success) {
                showNotification('Car part added successfully!', 'success');
                $('#addPartModal').modal('hide');
                form.reset();
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification('Error: ' + (response.error || 'Unknown error'), 'error');
                $form.data('submitting', false);
            }
        },
        error: function(xhr, status, error) {
            console.error('Part submission error:', xhr, status, error);
            handleAjaxError(xhr, 'adding the car part');
            $form.data('submitting', false);
        },
        complete: function() {
            submitBtn.prop('disabled', false).html(originalText);
            hideLoadingOverlay();
        }
    });
}

// Edit Part Form Handler
function handleEditPartFormSubmission(form) {
    const submitBtn = $(form).find('button[type="submit"]');
    const originalText = submitBtn.html();
    
    if (!validatePartForm(form)) {
        showNotification('Please fill in all required fields correctly', 'warning');
        return;
    }
    
    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Updating...');
    showLoadingOverlay();
    
    const formData = new FormData(form);
    const partId = $('#editPartId').val();
    
    formData.set('is_active', $('#editPartStatus').is(':checked') ? '1' : '0');
    
    $.ajax({
        url: `/api/edit_car_part/${partId}`,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.success) {
                showNotification('Car part updated successfully!', 'success');
                $('#editPartModal').modal('hide');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification('Error: ' + (response.error || 'Unknown error'), 'error');
            }
        },
        error: function(xhr) {
            handleAjaxError(xhr, 'updating the car part');
        },
        complete: function() {
            submitBtn.prop('disabled', false).html(originalText);
            hideLoadingOverlay();
        }
    });
}

// Restock Form Handler
function handleRestockFormSubmission(form) {
    const submitBtn = $(form).find('button[type="submit"]');
    const originalText = submitBtn.html();
    const partId = $('#restockPartId').val();
    const quantity = parseInt($('#restockQuantity').val());
    
    if (!quantity || quantity <= 0) {
        showNotification('Please enter a valid quantity', 'warning');
        return;
    }
    
    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Restocking...');
    showLoadingOverlay();
    
    $.ajax({
        url: `/api/restock_part/${partId}`,
        type: 'POST',
        data: JSON.stringify({ quantity: quantity }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                showNotification('Part restocked successfully!', 'success');
                $('#restockModal').modal('hide');
                form.reset();
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification('Error: ' + (response.error || 'Unknown error'), 'error');
            }
        },
        error: function(xhr) {
            handleAjaxError(xhr, 'restocking the part');
        },
        complete: function() {
            submitBtn.prop('disabled', false).html(originalText);
            hideLoadingOverlay();
        }
    });
}

// Form Validation Functions
function validateServiceForm(form) {
    let isValid = true;
    const $form = $(form);
    
    // Clear previous validation states
    $form.find('.is-invalid').removeClass('is-invalid');
    
    // Validate service name
    const name = $form.find('[name="name"]').val().trim();
    if (!name || name.length < 3) {
        $form.find('[name="name"]').addClass('is-invalid');
        isValid = false;
    }
    
    // Validate price
    const price = parseFloat($form.find('[name="price"]').val());
    if (!price || price <= 0) {
        $form.find('[name="price"]').addClass('is-invalid');
        isValid = false;
    }
    
    // Validate duration
    const duration = parseInt($form.find('[name="duration"]').val());
    if (!duration || duration <= 0) {
        $form.find('[name="duration"]').addClass('is-invalid');
        isValid = false;
    }
    
    // Validate type
    const type = $form.find('[name="type"]').val();
    if (!type) {
        $form.find('[name="type"]').addClass('is-invalid');
        isValid = false;
    }
    
    return isValid;
}

function validatePartForm(form) {
    let isValid = true;
    const $form = $(form);
    
    // Clear previous validation states
    $form.find('.is-invalid').removeClass('is-invalid');
    
    // Validate part name
    const name = $form.find('[name="name"]').val().trim();
    if (!name || name.length < 3) {
        $form.find('[name="name"]').addClass('is-invalid');
        isValid = false;
    }
    
    // Validate price
    const price = parseFloat($form.find('[name="price"]').val());
    if (!price || price <= 0) {
        $form.find('[name="price"]').addClass('is-invalid');
        isValid = false;
    }
    
    // Validate stock
    const stock = parseInt($form.find('[name="stock"]').val());
    if (stock === null || stock === undefined || stock < 0) {
        $form.find('[name="stock"]').addClass('is-invalid');
        isValid = false;
    }
    
    // Validate category
    const category = $form.find('[name="category"]').val();
    if (!category) {
        $form.find('[name="category"]').addClass('is-invalid');
        isValid = false;
    }
    
    return isValid;
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    $('.custom-notification').remove();
    
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const icon = type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    const notification = $(`
        <div class="alert ${alertClass} alert-dismissible fade show custom-notification position-fixed" 
             role="alert" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 500px;">
            <i class="fas ${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    
    $('body').append(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.fadeOut(400, function() {
            $(this).remove();
        });
    }, 5000);
}

function showLoadingOverlay() {
    if ($('#loadingOverlay').length === 0) {
        const overlay = $(`
            <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; 
                 width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9998; 
                 justify-content: center; align-items: center;">
                <div class="spinner-border text-light" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `);
        $('body').append(overlay);
    }
    $('#loadingOverlay').css('display', 'flex').fadeIn(200);
}

function hideLoadingOverlay() {
    $('#loadingOverlay').fadeOut(200);
}

function handleAjaxError(xhr, action) {
    console.error('AJAX Error:', xhr);
    let errorMessage = `An error occurred while ${action}.`;
    
    if (xhr.responseJSON && xhr.responseJSON.error) {
        errorMessage = xhr.responseJSON.error;
    } else if (xhr.status === 0) {
        errorMessage = 'Network error. Please check your connection.';
    } else if (xhr.status === 413) {
        errorMessage = 'File too large. Please use a smaller image.';
    } else if (xhr.status === 500) {
        errorMessage = 'Server error. Please try again later.';
    } else if (xhr.status === 403) {
        errorMessage = 'Access denied. Please check your permissions.';
    } else if (xhr.status === 404) {
        errorMessage = 'Resource not found. Please refresh the page.';
    } else {
        errorMessage = `Error ${xhr.status}: ${xhr.statusText}`;
    }
    
    showNotification(errorMessage, 'error');
}

// Add CSS for invalid form fields
if (!document.getElementById('admin-form-styles')) {
    const style = document.createElement('style');
    style.id = 'admin-form-styles';
    style.textContent = `
        .is-invalid {
            border-color: #dc3545 !important;
            padding-right: calc(1.5em + 0.75rem);
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right calc(0.375em + 0.1875rem) center;
            background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
        }
        .is-invalid:focus {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25) !important;
        }
    `;
    document.head.appendChild(style);
}

console.log('Admin form handlers loaded successfully');