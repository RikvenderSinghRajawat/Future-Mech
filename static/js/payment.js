// Payment System JavaScript
$(document).ready(function() {
    // Initialize Stripe
    const stripe = Stripe('{{ config.STRIPE_PUBLIC_KEY }}');
    let elements;
    let cardElement;
    
    // Initialize payment system
    initializePaymentSystem();
    
    // Payment method selection
    initializePaymentMethodSelection();
    
    // Form validation
    initializeFormValidation();
    
    // Payment processing
    initializePaymentProcessing();
    
    function initializePaymentSystem() {
        // Initialize Stripe Elements for card payments
        initializeStripeElements();
        
        // Add smooth animations
        $('.payment-option').addClass('fade-in');
        
        // Set up form formatting
        setupFormFormatting();
    }
    
    function initializeStripeElements() {
        // Create Stripe Elements
        elements = stripe.elements({
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#3b82f6',
                    colorBackground: '#ffffff',
                    colorText: '#374151',
                    colorDanger: '#ef4444',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px',
                }
            }
        });
        
        // Create card element
        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#374151',
                    '::placeholder': {
                        color: '#9ca3af',
                    },
                },
                invalid: {
                    color: '#ef4444',
                },
            },
        });
        
        // Mount card element
        cardElement.mount('#card-number');
        
        // Handle real-time validation errors from the card Element
        cardElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
    }
    
    function initializePaymentMethodSelection() {
        // Payment method selection
        $('.payment-option').on('click', function() {
            const method = $(this).data('method');
            
            // Update active state
            $('.payment-option').removeClass('active');
            $(this).addClass('active');
            
            // Update radio button
            $(this).find('input[type="radio"]').prop('checked', true);
            
            // Show/hide forms
            showPaymentForm(method);
            
            // Update pay button
            updatePayButton(method);
        });
        
        // Handle radio button changes
        $('input[name="payment_method"]').on('change', function() {
            const method = $(this).val();
            $('.payment-option').removeClass('active');
            $(`.payment-option[data-method="${method}"]`).addClass('active');
            showPaymentForm(method);
            updatePayButton(method);
        });
    }
    
    function initializeFormValidation() {
        // Card number formatting
        $('#card-number').on('input', function() {
            let value = $(this).val().replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            $(this).val(formattedValue);
        });
        
        // Expiry date formatting
        $('#card-expiry').on('input', function() {
            let value = $(this).val().replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            $(this).val(value);
        });
        
        // CVV formatting
        $('#card-cvv').on('input', function() {
            $(this).val($(this).val().replace(/[^0-9]/g, ''));
        });
        
        // Card name formatting
        $('#card-name').on('input', function() {
            $(this).val($(this).val().replace(/[^a-zA-Z\s]/g, ''));
        });
    }
    
    function initializePaymentProcessing() {
        // Set up payment processing handlers
        setupPaymentHandlers();
    }
    
    function showPaymentForm(method) {
        // Hide all forms
        $('.payment-form').hide();
        
        // Show appropriate form
        switch(method) {
            case 'card':
                $('#card-form').show();
                break;
            case 'upi':
                $('#upi-form').show();
                break;
            default:
                $('#other-forms').show();
                updateOtherPaymentInfo(method);
                break;
        }
    }
    
    function updateOtherPaymentInfo(method) {
        const instructions = {
            'paypal': 'You will be redirected to PayPal to complete your payment.',
            'apple_pay': 'Use Apple Pay on your device to complete the payment.',
            'bank_transfer': 'Transfer the amount to our bank account. Details will be provided after order confirmation.',
            'wallet': 'Select your preferred digital wallet to complete the payment.',
            'cod': 'You can pay in cash when the service is completed.',
            'crypto': 'You will receive cryptocurrency payment details after order confirmation.'
        };
        
        $('#payment-instructions').text(instructions[method] || 'Please follow the instructions for your selected payment method.');
        $('#other-form-title').text(method.replace('_', ' ').toUpperCase() + ' Payment');
    }
    
    function updatePayButton(method) {
        const button = $('#pay-now-btn');
        const amount = '{{ "%.2f"|format(amount) }}';
        
        switch(method) {
            case 'card':
                button.html('<i class="fas fa-credit-card"></i> Pay $' + amount);
                break;
            case 'paypal':
                button.html('<i class="fab fa-paypal"></i> Pay with PayPal');
                break;
            case 'upi':
                button.html('<i class="fas fa-mobile-alt"></i> Pay with UPI');
                break;
            case 'apple_pay':
                button.html('<i class="fab fa-apple-pay"></i> Pay with Apple Pay');
                break;
            case 'bank_transfer':
                button.html('<i class="fas fa-university"></i> Bank Transfer');
                break;
            case 'wallet':
                button.html('<i class="fas fa-wallet"></i> Pay with Wallet');
                break;
            case 'cod':
                button.html('<i class="fas fa-money-bill-wave"></i> Cash on Delivery');
                break;
            case 'crypto':
                button.html('<i class="fab fa-bitcoin"></i> Pay with Crypto');
                break;
            default:
                button.html('<i class="fas fa-lock"></i> Pay $' + amount);
        }
    }
    
    function setupFormFormatting() {
        // Add input formatting and validation
        $('.form-control').on('focus', function() {
            $(this).parent().addClass('focused');
        }).on('blur', function() {
            $(this).parent().removeClass('focused');
        });
    }
    
    function setupPaymentHandlers() {
        // Set up various payment method handlers
        setupUPIHandlers();
        setupOtherPaymentHandlers();
    }
    
    function setupUPIHandlers() {
        // UPI payment handlers are set up in global functions
    }
    
    function setupOtherPaymentHandlers() {
        // Other payment method handlers
    }
    
    // Global payment processing function
    window.processPayment = function() {
        const selectedMethod = $('input[name="payment_method"]:checked').val();
        
        // Validate form based on payment method
        if (!validatePaymentForm(selectedMethod)) {
            return;
        }
        
        // Show loading modal
        $('#loadingModal').modal('show');
        
        // Process payment based on method
        switch(selectedMethod) {
            case 'card':
                processCardPayment();
                break;
            case 'paypal':
                processPayPalPayment();
                break;
            case 'upi':
                processUPIPayment();
                break;
            case 'apple_pay':
                processApplePayPayment();
                break;
            case 'bank_transfer':
                processBankTransferPayment();
                break;
            case 'wallet':
                processWalletPayment();
                break;
            case 'cod':
                processCODPayment();
                break;
            case 'crypto':
                processCryptoPayment();
                break;
            default:
                showError('Invalid payment method selected');
        }
    };
    
    function validatePaymentForm(method) {
        switch(method) {
            case 'card':
                return validateCardForm();
            case 'upi':
                return true; // UPI validation handled in individual methods
            default:
                return true; // Other methods don't require form validation
        }
    }
    
    function validateCardForm() {
        const cardNumber = $('#card-number').val().replace(/\s/g, '');
        const expiry = $('#card-expiry').val();
        const cvv = $('#card-cvv').val();
        const name = $('#card-name').val();
        
        if (!cardNumber || cardNumber.length < 13) {
            showError('Please enter a valid card number');
            return false;
        }
        
        if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
            showError('Please enter a valid expiry date (MM/YY)');
            return false;
        }
        
        if (!cvv || cvv.length < 3) {
            showError('Please enter a valid CVV');
            return false;
        }
        
        if (!name || name.length < 2) {
            showError('Please enter the cardholder name');
            return false;
        }
        
        return true;
    }
    
    function processCardPayment() {
        // Create payment intent
        $.ajax({
            url: '/create-payment-intent',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                amount: {{ amount }},
                type: '{{ type }}',
                id: {{ id }}
            }),
            success: function(response) {
                if (response.clientSecret) {
                    // Confirm payment with Stripe
                    stripe.confirmCardPayment(response.clientSecret, {
                        payment_method: {
                            card: cardElement,
                            billing_details: {
                                name: $('#card-name').val(),
                            },
                        }
                    }).then(function(result) {
                        $('#loadingModal').modal('hide');
                        
                        if (result.error) {
                            showError(result.error.message);
                        } else {
                            // Payment succeeded
                            handlePaymentSuccess(result.paymentIntent);
                        }
                    });
                } else {
                    $('#loadingModal').modal('hide');
                    showError('Failed to create payment intent');
                }
            },
            error: function(xhr, status, error) {
                $('#loadingModal').modal('hide');
                showError('Payment processing failed. Please try again.');
            }
        });
    }
    
    function processPayPalPayment() {
        // Redirect to PayPal payment
        window.location.href = `/payment/paypal/{{ type }}/{{ id }}`;
    }
    
    function processUPIPayment() {
        // Show UPI options or redirect to UPI payment
        showToast('UPI payment integration coming soon!', 'info');
        $('#loadingModal').modal('hide');
    }
    
    function processApplePayPayment() {
        // Handle Apple Pay payment
        if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
            // Implement Apple Pay
            showToast('Apple Pay integration coming soon!', 'info');
        } else {
            showError('Apple Pay is not available on this device');
        }
        $('#loadingModal').modal('hide');
    }
    
    function processBankTransferPayment() {
        // Process bank transfer payment
        $.ajax({
            url: '/api/process_bank_transfer',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                type: '{{ type }}',
                id: {{ id }},
                amount: {{ amount }}
            }),
            success: function(response) {
                $('#loadingModal').modal('hide');
                if (response.success) {
                    showSuccess('Bank transfer details sent to your email');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                } else {
                    showError(response.error || 'Bank transfer setup failed');
                }
            },
            error: function() {
                $('#loadingModal').modal('hide');
                showError('Bank transfer setup failed');
            }
        });
    }
    
    function processWalletPayment() {
        // Process digital wallet payment
        showToast('Digital wallet integration coming soon!', 'info');
        $('#loadingModal').modal('hide');
    }
    
    function processCODPayment() {
        // Process cash on delivery
        $.ajax({
            url: '/api/process_cod',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                type: '{{ type }}',
                id: {{ id }},
                amount: {{ amount }}
            }),
            success: function(response) {
                $('#loadingModal').modal('hide');
                if (response.success) {
                    showSuccess('Cash on Delivery order confirmed!');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                } else {
                    showError(response.error || 'COD setup failed');
                }
            },
            error: function() {
                $('#loadingModal').modal('hide');
                showError('COD setup failed');
            }
        });
    }
    
    function processCryptoPayment() {
        // Process cryptocurrency payment
        $.ajax({
            url: '/api/process_crypto',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                type: '{{ type }}',
                id: {{ id }},
                amount: {{ amount }}
            }),
            success: function(response) {
                $('#loadingModal').modal('hide');
                if (response.success) {
                    showSuccess('Cryptocurrency payment details sent to your email');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                } else {
                    showError(response.error || 'Crypto payment setup failed');
                }
            },
            error: function() {
                $('#loadingModal').modal('hide');
                showError('Crypto payment setup failed');
            }
        });
    }
    
    function handlePaymentSuccess(paymentIntent) {
        // Redirect to success page
        const params = new URLSearchParams({
            payment_intent: paymentIntent.id,
            payment_intent_client_secret: paymentIntent.client_secret,
            type: '{{ type }}',
            id: {{ id }}
        });
        
        window.location.href = `/payment/success?${params.toString()}`;
    }
    
    // UPI Payment Functions
    window.initiateUPIPayment = function(app) {
        $('#loadingModal').modal('show');
        
        // Simulate UPI payment initiation
        setTimeout(() => {
            $('#loadingModal').modal('hide');
            showToast(`${app} payment integration coming soon!`, 'info');
        }, 2000);
    };
    
    window.showQRCode = function() {
        // Generate and show QR code
        $('#qr-code').html('<i class="fas fa-qrcode"></i>');
        $('#qrCodeModal').modal('show');
        
        // In a real implementation, you would generate an actual QR code
        // with payment details using a QR code library
    };
    
    // Utility Functions
    window.goBack = function() {
        window.history.back();
    };
    
    function showError(message) {
        showToast(message, 'danger');
    }
    
    function showSuccess(message) {
        showToast(message, 'success');
    }
    
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
    
    // Add this to your payment.js file
    $(document).ready(function() {
    // Add call now button to the payment page
    const callNowBtn = $(`
    <div class="call-now-container mt-4 mb-3">
    <button id="callNowBtn" class="btn btn-outline-primary btn-lg w-100">
    <i class="fas fa-phone-alt me-2"></i> Need Help? Call Us Now
    </button>
    </div>
    `);
    
    $('#paymentForm').before(callNowBtn);
    
    // Handle click event
    $('#callNowBtn').on('click', function() {
    // Check if it's a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
    window.location.href = 'tel:8094713733';
    } else {
    // For desktop, show a modal with the number
    const modalHtml = `
    <div class="modal fade" id="callModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
    <div class="modal-header">
    <h5 class="modal-title">Call Us</h5>
    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>
    <div class="modal-body text-center">
    <i class="fas fa-phone-alt fa-3x text-primary mb-3"></i>
    <h3>8094713733</h3>
    <p class="text-muted">Our customer service is available 24/7</p>
    </div>
    <div class="modal-footer">
    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
    </div>
    </div>
    </div>
    </div>
    `;
    
    // Add modal to body if it doesn't exist
    if (!$('#callModal').length) {
    $('body').append(modalHtml);
    }
    
    // Show the modal
    new bootstrap.Modal(document.getElementById('callModal')).show();
    }
    });
    });
    
    // Initialize payment method selection on page load
    const initialMethod = $('input[name="payment_method"]:checked').val();
    if (initialMethod) {
        showPaymentForm(initialMethod);
        updatePayButton(initialMethod);
    }
});





