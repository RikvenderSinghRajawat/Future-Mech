// Contact Page JavaScript
$(document).ready(function() {
    // Initialize page animations
    initializePageAnimations();
    
    // Initialize intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                if (element.classList.contains('animate-on-scroll')) {
                    element.classList.add('animated');
                }
                
                observer.unobserve(element);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.animate-on-scroll').forEach(element => {
        observer.observe(element);
    });
    
    function initializePageAnimations() {
        // Add hover effects to contact cards
        $('.contact-card').hover(
            function() {
                $(this).addClass('hover-lift');
            },
            function() {
                $(this).removeClass('hover-lift');
            }
        );
        
        // Add micro-interactions to form elements
        $('.form-control, .form-select').on('focus', function() {
            $(this).addClass('micro-bounce');
            setTimeout(() => {
                $(this).removeClass('micro-bounce');
            }, 600);
        });
        
        // Add ripple effect to buttons
        $('.btn').on('click', function(e) {
            const button = $(this);
            const ripple = $('<span class="ripple"></span>');
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.css({
                width: size,
                height: size,
                left: x,
                top: y
            });
            
            button.append(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    }
    
    // Contact form handling
    $('#contactForm').on('submit', function(e) {
        e.preventDefault();
        
        const form = this;
        const submitBtn = $(form).find('button[type="submit"]');
        const originalText = submitBtn.html();
        
        // Show loading state
        submitBtn.html('<span class="spinner-border spinner-border-sm me-2"></span>Sending...');
        submitBtn.prop('disabled', true);
        
        // Simulate form submission (replace with actual AJAX call)
        setTimeout(() => {
            // Show success message
            showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
            
            // Reset form
            form.reset();
            
            // Reset button
            submitBtn.html(originalText);
            submitBtn.prop('disabled', false);
            
            // Add success animation
            submitBtn.addClass('micro-bounce');
            setTimeout(() => {
                submitBtn.removeClass('micro-bounce');
            }, 600);
        }, 2000);
    });
    
    // Form validation enhancement
    $('input, select, textarea').on('blur', function() {
        validateField(this);
    });
    
    function validateField(field) {
        const $field = $(field);
        const value = $field.val().trim();
        const fieldName = $field.attr('name');
        
        // Remove existing validation classes
        $field.removeClass('is-valid is-invalid');
        
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if ($field.prop('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Email validation
        if (fieldName === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }
        
        // Phone validation
        if (fieldName === 'phone' && value) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(value.replace(/\D/g, ''))) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
        }
        
        // Apply validation classes
        if (isValid) {
            $field.addClass('is-valid');
        } else {
            $field.addClass('is-invalid');
            showFieldError($field, errorMessage);
        }
    }
    
    function showFieldError($field, message) {
        // Remove existing error message
        $field.siblings('.invalid-feedback').remove();
        
        // Add new error message
        $field.after(`<div class="invalid-feedback">${message}</div>`);
    }
    
    // Accordion enhancement
    $('.accordion-button').on('click', function() {
        const button = $(this);
        const target = $(button.data('bs-target'));
        
        // Add animation delay
        setTimeout(() => {
            target.addClass('animate-entrance');
        }, 100);
    });
    
    // Smooth scrolling for anchor links
    $('a[href^="#"]').on('click', function(e) {
        e.preventDefault();
        
        const target = $(this.getAttribute('href'));
        if (target.length) {
            $('html, body').animate({
                scrollTop: target.offset().top - 100
            }, 800, 'easeInOutCubic');
        }
    });
    
    // Add custom easing function
    $.easing.easeInOutCubic = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    };
    
    // Map placeholder interaction
    $('.map-placeholder').on('click', function() {
        $(this).addClass('micro-bounce');
        showToast('Interactive map would open here', 'info');
        setTimeout(() => {
            $(this).removeClass('micro-bounce');
        }, 600);
    });
    
    // Business hours hover effects
    $('.hours-item').hover(
        function() {
            $(this).addClass('hover-lift');
        },
        function() {
            $(this).removeClass('hover-lift');
        }
    );
    
    // Contact card click effects
    $('.contact-card .btn').on('click', function(e) {
        e.preventDefault();
        const card = $(this).closest('.contact-card');
        const action = $(this).text().trim();
        
        card.addClass('micro-bounce');
        showToast(`${action} action would be triggered here`, 'info');
        
        setTimeout(() => {
            card.removeClass('micro-bounce');
        }, 600);
    });
    
    // Add CSS for ripple effect
    const rippleCSS = `
        .btn {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .animate-entrance {
            animation: entrance 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes entrance {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    $('<style>').text(rippleCSS).appendTo('head');
});

// Toast notification function (if not already defined)
if (typeof showToast === 'undefined') {
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

