// Main JavaScript for Future Mech
$(document).ready(function() {
    // Initialize tooltips and popovers
    $('[data-bs-toggle="tooltip"]').tooltip();
    $('[data-bs-toggle="popover"]').popover();
    
    // Smooth scrolling for anchor links
    $('a[href*="#"]:not([href="#"])').click(function() {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html, body').animate({
                    scrollTop: target.offset().top - 70
                }, 1000);
                return false;
            }
        }
    });
    
    // Scroll to top button
    $(window).scroll(function() {
        if ($(this).scrollTop() > 100) {
            $('.scroll-top').fadeIn();
        } else {
            $('.scroll-top').fadeOut();
        }
    });
    
    $('.scroll-top').click(function() {
        $('html, body').animate({scrollTop: 0}, 800);
        return false;
    });
    
    // Add scroll-to-top button if not exists
    if ($('.scroll-top').length === 0) {
        $('body').append('<button class="scroll-top btn btn-primary"><i class="fas fa-chevron-up"></i></button>');
    }
    
    // Form validation enhancement
    $('form').each(function() {
        const form = this;
        
        // Add Bootstrap validation classes
        $(form).find('input, select, textarea').on('blur change', function() {
            if (this.checkValidity()) {
                $(this).removeClass('is-invalid').addClass('is-valid');
            } else {
                $(this).removeClass('is-valid').addClass('is-invalid');
            }
        });
        
        // Handle form submission
        $(form).on('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            $(form).addClass('was-validated');
        });
    });
    
    // Auto-hide alerts after 5 seconds
    $('.alert:not(.alert-permanent)').each(function() {
        const alert = this;
        setTimeout(function() {
            $(alert).fadeOut();
        }, 5000);
    });
    
    // Confirmation dialogs for dangerous actions
    $('[data-confirm]').click(function(e) {
        const message = $(this).data('confirm');
        if (!confirm(message)) {
            e.preventDefault();
            return false;
        }
    });
    
    // Loading states for buttons
    $('[data-loading-text]').click(function() {
        const btn = $(this);
        const loadingText = btn.data('loading-text');
        const originalText = btn.html();
        
        btn.html('<span class="loading me-2"></span>' + loadingText);
        btn.prop('disabled', true);
        
        // Re-enable after form submission or 10 seconds (whichever comes first)
        setTimeout(function() {
            btn.html(originalText);
            btn.prop('disabled', false);
        }, 10000);
    });
    
    // Dynamic search functionality
    $('[data-search]').each(function() {
        const searchInput = this;
        const target = $(searchInput).data('search');
        
        $(searchInput).on('keyup', function() {
            const searchTerm = $(this).val().toLowerCase();
            
            $(target).each(function() {
                const text = $(this).text().toLowerCase();
                if (text.includes(searchTerm) || searchTerm === '') {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });
    });
    
    // Auto-resize textareas
    $('textarea').each(function() {
        this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
    }).on('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Number input validation
    $('input[type="number"]').on('keypress', function(e) {
        // Allow: backspace, delete, tab, escape, enter, decimal point, and minus sign
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190, 109, 189]) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
    
    // Format currency inputs
    $('input[data-currency]').on('blur', function() {
        const value = parseFloat($(this).val());
        if (!isNaN(value)) {
            $(this).val(value.toFixed(2));
        }
    });
    
    // Phone number formatting
    $('input[type="tel"]').on('input', function() {
        let value = $(this).val().replace(/\D/g, '');
        if (value.length >= 6) {
            value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        } else if (value.length >= 3) {
            value = value.replace(/(\d{3})(\d{0,3})/, '($1) $2');
        }
        $(this).val(value);
    });
    
    // Image preview functionality
    $('input[type="file"][accept*="image"]').change(function() {
        const input = this;
        const preview = $(input).siblings('.image-preview');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                if (preview.length) {
                    preview.attr('src', e.target.result).show();
                } else {
                    $(input).after('<img class="image-preview mt-2" src="' + e.target.result + '" style="max-width: 200px; max-height: 200px;">');
                }
            };
            
            reader.readAsDataURL(input.files[0]);
        }
    });
    
    // Table row click functionality
    $('table[data-click-row] tbody tr').click(function() {
        const url = $(this).data('url');
        if (url) {
            window.location = url;
        }
    });
    
    // Copy to clipboard functionality
    $('[data-clipboard]').click(function(e) {
        e.preventDefault();
        const text = $(this).data('clipboard');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Copied to clipboard!', 'success');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Copied to clipboard!', 'success');
        }
    });
    
    // Toast notification system
    window.showToast = function(message, type = 'info', duration = 3000) {
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
    };
}

// Dark mode functions
function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        $('body').addClass('dark-mode');
        $('#darkModeIcon').removeClass('fa-moon').addClass('fa-sun');
    }
}

function toggleDarkMode() {
    const isDarkMode = $('body').hasClass('dark-mode');
    
    if (isDarkMode) {
        $('body').removeClass('dark-mode');
        $('#darkModeIcon').removeClass('fa-sun').addClass('fa-moon');
        localStorage.setItem('darkMode', 'false');
    } else {
        $('body').addClass('dark-mode');
        $('#darkModeIcon').removeClass('fa-moon').addClass('fa-sun');
        localStorage.setItem('darkMode', 'true');
    }
}
    
    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        $('body').addClass('dark-mode');
    }
    
    // Add dark mode toggle button
    $('.navbar-nav').append(`
        <li class="nav-item">
            <button class="nav-link btn btn-link p-0 border-0" id="darkModeToggle" title="Toggle Dark Mode">
                <i class="fas fa-moon" id="darkModeIcon"></i>
            </button>
        </li>
    `);
    
    // Dark mode functionality
    initializeDarkMode();
    
    $('#darkModeToggle').click(toggleDarkMode);
    
    // Update navbar on scroll
    $(window).scroll(function() {
        const navbar = $('.navbar');
        if ($(window).scrollTop() > 50) {
            navbar.addClass('navbar-scrolled');
        } else {
            navbar.removeClass('navbar-scrolled');
        }
    });
    
    // Initialize data tables if plugin is available
    if ($.fn.DataTable) {
        $('table.data-table').DataTable({
            responsive: true,
            pageLength: 25,
            order: [[0, 'desc']]
        });
    }
    
    // Lazy loading for images
    $('img[data-src]').each(function() {
        const img = this;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    $(img).attr('src', $(img).data('src')).removeAttr('data-src');
                    observer.unobserve(img);
                }
            });
        });
        observer.observe(img);
    });
});

// Utility functions
window.futureMech = {
    // Format currency
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },
    
    // Format date
    formatDate: function(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    // Validate email
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Validate phone
    validatePhone: function(phone) {
        const re = /^\(\d{3}\) \d{3}-\d{4}$/;
        return re.test(phone);
    },
    
    // Show loading overlay
    showLoading: function() {
        if ($('.loading-overlay').length === 0) {
            $('body').append(`
                <div class="loading-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `);
        }
    },
    
    // Hide loading overlay
    hideLoading: function() {
        $('.loading-overlay').fadeOut(() => $('.loading-overlay').remove());
    },
    
    // AJAX form handler
    submitForm: function(form, callback) {
        const formData = new FormData(form);
        const url = $(form).attr('action') || window.location.href;
        const method = $(form).attr('method') || 'POST';
        
        futureMech.showLoading();
        
        $.ajax({
            url: url,
            method: method,
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                futureMech.hideLoading();
                if (callback) callback(response);
            },
            error: function(xhr) {
                futureMech.hideLoading();
                showToast('An error occurred. Please try again.', 'danger');
                console.error('Form submission error:', xhr);
            }
        });
    }
};

// Add this to your main.js file
function setupNotifications() {
    // Check for new notifications every 30 seconds
    setInterval(checkNotifications, 30000);
    // Initial check
    checkNotifications();
}

function checkNotifications() {
    if (userRole === 'admin' || userRole === 'service') {
        $.ajax({
            url: '/api/check_notifications',
            method: 'GET',
            success: function(response) {
                if (response.notifications && response.notifications.length > 0) {
                    showNotifications(response.notifications);
                }
            }
        });
    }
}

function showNotifications(notifications) {
    const container = $('#notificationContainer');
    if (!container.length) {
        $('body').append('<div id="notificationContainer" class="notification-container"></div>');
    }
    
    notifications.forEach(notification => {
        const notifEl = $(`
            <div class="notification-item ${notification.type}">
                <div class="notification-icon">
                    <i class="fas ${getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h5>${notification.title}</h5>
                    <p>${notification.message}</p>
                    <small>${notification.time}</small>
                </div>
                <button class="btn-close" data-id="${notification.id}"></button>
            </div>
        `);
        
        $('#notificationContainer').append(notifEl);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            notifEl.addClass('fade-out');
            setTimeout(() => notifEl.remove(), 500);
        }, 10000);
        
        // Close button
        notifEl.find('.btn-close').on('click', function() {
            const id = $(this).data('id');
            markNotificationRead(id);
            notifEl.addClass('fade-out');
            setTimeout(() => notifEl.remove(), 500);
        });
    });
}

function getNotificationIcon(type) {
    switch(type) {
        case 'booking': return 'fa-calendar-check';
        case 'contact': return 'fa-envelope';
        case 'order': return 'fa-shopping-cart';
        default: return 'fa-bell';
    }
}

function markNotificationRead(id) {
    $.ajax({
        url: '/api/mark_notification_read',
        method: 'POST',
        data: JSON.stringify({ notification_id: id }),
        contentType: 'application/json',
        success: function() {}
    });
}

// Initialize notifications when document is ready
$(document).ready(function() {
    if (typeof userRole !== 'undefined') {
        setupNotifications();
    }
});