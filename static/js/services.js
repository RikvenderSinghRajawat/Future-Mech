// Services Page JavaScript
$(document).ready(function() {
    // Initialize page functionality
    initializeSearchAndFilter();
    initializeBookingModal();
    initializeAnimations();
    
    function initializeSearchAndFilter() {
        const $searchInput = $('#serviceSearch');
        const $typeFilter = $('#serviceTypeFilter');
        const $clearBtn = $('#clearFilters');
        const $servicesGrid = $('#servicesGrid');
        const $noResults = $('#noResults');
        
        // Search functionality
        $searchInput.on('input', function() {
            filterServices();
        });
        
        // Type filter functionality
        $typeFilter.on('change', function() {
            filterServices();
        });
        
        // Clear filters functionality
        $clearBtn.on('click', function() {
            $searchInput.val('');
            $typeFilter.val('');
        filterServices();
    });
    
        function filterServices() {
            const searchTerm = $searchInput.val().toLowerCase();
            const selectedType = $typeFilter.val();
            let visibleCount = 0;
            
            $servicesGrid.find('.service-card-wrapper').each(function() {
                const $card = $(this);
                const serviceName = $card.find('.service-title').text().toLowerCase();
                const serviceDescription = $card.find('.service-description').text().toLowerCase();
                const serviceType = $card.data('service-type').toLowerCase();
                
                const matchesSearch = serviceName.includes(searchTerm) || 
                                    serviceDescription.includes(searchTerm);
                const matchesType = !selectedType || serviceType === selectedType.toLowerCase();
                
                if (matchesSearch && matchesType) {
                    $card.show().addClass('fade-in');
                    visibleCount++;
                } else {
                    $card.hide();
                }
            });
            
            // Show/hide no results message
            if (visibleCount === 0) {
                $noResults.show();
                $servicesGrid.hide();
            } else {
                $noResults.hide();
                $servicesGrid.show();
            }
        }
        
        // Show all services when no results
        $('#showAllServices').on('click', function() {
            $searchInput.val('');
            $typeFilter.val('');
            filterServices();
        });
    }
    
    function initializeBookingModal() {
        const $bookingModal = $('#bookingModal');
        const $bookingForm = $('#bookingForm');
        const $confirmBtn = $('#confirmBooking');
        const $serviceIdInput = $('#selectedServiceId');
        
        // Book service button click
        $('.book-service-btn').on('click', function() {
            const serviceId = $(this).data('service-id');
            const serviceName = $(this).closest('.service-card').find('.service-title').text();
            
            $serviceIdInput.val(serviceId);
            $bookingModal.find('.modal-title').text(`Book ${serviceName}`);
            
            // Load user vehicles
            loadUserVehicles();
            
            // Set minimum date to today
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const minDate = tomorrow.toISOString().slice(0, 16);
            $bookingForm.find('input[name="scheduled_date"]').attr('min', minDate);
            
            $bookingModal.modal('show');
        });
        
        // Confirm booking
        $confirmBtn.on('click', function() {
            const formData = new FormData($bookingForm[0]);
            
            // Validate form
            if (!validateBookingForm()) {
                return;
            }
            
            // Show loading state
            $confirmBtn.addClass('loading').prop('disabled', true);
            
            // Submit booking
            $.ajax({
                url: '/book_service/' + $serviceIdInput.val(),
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    showToast('Service booked successfully!', 'success');
                    $bookingModal.modal('hide');
                    $bookingForm[0].reset();
                },
                error: function(xhr) {
                    const errorMessage = xhr.responseJSON?.error || 'Failed to book service. Please try again.';
                    showToast(errorMessage, 'danger');
                },
                complete: function() {
                    $confirmBtn.removeClass('loading').prop('disabled', false);
                }
            });
        });
        
        function validateBookingForm() {
            let isValid = true;
            
            // Clear previous validation
            $bookingForm.find('.is-invalid').removeClass('is-invalid');
            $bookingForm.find('.invalid-feedback').remove();
            
            // Validate vehicle selection
            const vehicleId = $bookingForm.find('select[name="vehicle_id"]').val();
            if (!vehicleId) {
                showFieldError('select[name="vehicle_id"]', 'Please select a vehicle');
                isValid = false;
            }
            
            // Validate date
            const scheduledDate = $bookingForm.find('input[name="scheduled_date"]').val();
            if (!scheduledDate) {
                showFieldError('input[name="scheduled_date"]', 'Please select a date and time');
                isValid = false;
                } else {
                const selectedDate = new Date(scheduledDate);
                const now = new Date();
                if (selectedDate <= now) {
                    showFieldError('input[name="scheduled_date"]', 'Please select a future date and time');
                    isValid = false;
                }
            }
            
            return isValid;
        }
        
        function showFieldError(selector, message) {
            const $field = $bookingForm.find(selector);
            $field.addClass('is-invalid');
            $field.after(`<div class="invalid-feedback">${message}</div>`);
        }
        
        // Load user's vehicles when booking modal is shown
        $('#bookingModal').on('show.bs.modal', function() {
            loadUserVehicles();
        });
        
        function loadUserVehicles() {
            $.ajax({
                url: '/api/client/vehicles',
                method: 'GET',
                success: function(response) {
                    if (response.success) {
                        const vehicleSelect = $('select[name="vehicle_id"]');
                        vehicleSelect.empty();
                        vehicleSelect.append('<option value="">Choose your vehicle</option>');
                        
                        response.vehicles.forEach(vehicle => {
                            vehicleSelect.append(
                                `<option value="${vehicle.id}">
                                    ${vehicle.make} ${vehicle.model} (${vehicle.registration_no})
                                 </option>`
                            );
                        });
                    } else {
                        showNotification('Failed to load vehicles: ' + response.message, 'error');
                    }
                },
                error: function() {
                    showNotification('Error loading vehicles', 'error');
                }
            });
        }
        
        // Update booking form submission to include vehicle
        $('#confirmBooking').on('click', function() {
            const formData = {
                service_id: $('#selectedServiceId').val(),
                vehicle_id: $('select[name="vehicle_id"]').val(),
                scheduled_date: $('input[name="scheduled_date"]').val(),
                notes: $('textarea[name="notes"]').val()
            };
            
            // Validate form
            if (!validateBookingForm()) {
                return;
            }
            
            // Show loading state
            $confirmBtn.addClass('loading').prop('disabled', true);
            
            // Submit booking
            $.ajax({
                url: '/book_service/' + $serviceIdInput.val(),
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    showToast('Service booked successfully!', 'success');
                    $bookingModal.modal('hide');
                    $bookingForm[0].reset();
                },
                error: function(xhr) {
                    const errorMessage = xhr.responseJSON?.error || 'Failed to book service. Please try again.';
                    showToast(errorMessage, 'danger');
                },
                complete: function() {
                    $confirmBtn.removeClass('loading').prop('disabled', false);
                }
            });
        });
    }
    
    function initializeAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, observerOptions);
        
        // Observe service cards
        document.querySelectorAll('.service-card').forEach(function(card) {
            observer.observe(card);
        });
        
        // Stagger animation for service cards
        $('.service-card-wrapper').each(function(index) {
            $(this).css('animation-delay', (index * 0.1) + 's');
        });
    }
    
    // Service card hover effects
    $('.service-card').hover(
        function() {
            $(this).addClass('hover-lift');
        },
        function() {
            $(this).removeClass('hover-lift');
        }
    );
    
    // Smooth scroll for anchor links
    $('a[href*="#"]:not([href="#"])').click(function() {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html, body').animate({
                    scrollTop: target.offset().top - 100
                }, 1000);
                return false;
            }
        }
    });
    
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-bs-toggle="popover"]').popover();
});

// Utility function for toast notifications
function showToast(message, type = 'info', duration = 3000) {
    const toast = $(`
        <div class="toast-notification alert alert-${type} alert-dismissible fade show" 
             style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    
    $('body').append(toast);
    
    setTimeout(() => {
        toast.fadeOut(() => toast.remove());
    }, duration);
    }
    // Add this function to your services.html JavaScript
function validateSession() {
    return fetch('/api/validate_session')
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                // Session is invalid, redirect to login
                alert('Your session has expired. Please log in again.');
                window.location.href = '/login';
                return false;
            }
            return true;
        })
        .catch(error => {
            console.error('Session validation error:', error);
            return false;
        });
}

// Update the addVehicleAndBook function to validate session first
function addVehicleAndBook(serviceId, vehicleData, scheduledDate, notes) {
    // First validate session
    validateSession().then(isValid => {
        if (!isValid) return;
        
        const formData = new FormData();
        for (const key in vehicleData) {
            formData.append(key, vehicleData[key]);
        }
        
        fetch('/api/client/add_vehicle', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Now book the service with the new vehicle
                bookService(serviceId, data.vehicle_id, scheduledDate, notes);
            } else {
                alert('Error adding vehicle: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error adding vehicle:', error);
            alert('Error adding vehicle. Please try again.');
        });
    });
}