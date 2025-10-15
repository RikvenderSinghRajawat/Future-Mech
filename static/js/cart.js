// Cart JavaScript
$(document).ready(function() {
    // Initialize cart functionality
    initializeCart();
    
    // Quantity controls
    initializeQuantityControls();
    
    // Discount functionality
    initializeDiscountSystem();
    
    // Checkout functionality
    initializeCheckout();
    
    function initializeCart() {
        // Add loading states and animations
        $('.cart-item').addClass('fade-in');
        
        // Initialize tooltips
        $('[data-bs-toggle="tooltip"]').tooltip();
        
        // Add smooth scrolling
        $('html').css('scroll-behavior', 'smooth');
    }
    
    function initializeQuantityControls() {
        // Quantity input validation
        $('.quantity-input').on('input', function() {
            const value = parseInt($(this).val());
            const max = parseInt($(this).attr('max'));
            const min = parseInt($(this).attr('min'));
            
            if (value > max) {
                $(this).val(max);
                showToast(`Maximum quantity is ${max}`, 'warning');
            } else if (value < min) {
                $(this).val(min);
            }
        });
        
        // Quantity input change
        $('.quantity-input').on('change', function() {
            const itemId = $(this).closest('.cart-item').data('item-id');
            const quantity = parseInt($(this).val());
            
            if (quantity > 0) {
                updateCartItem(itemId, quantity);
            }
        });
    }
    
    function initializeDiscountSystem() {
        // Discount code input
        $('#discount-code').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                applyDiscount();
            }
        });
        
        // Auto-format discount code
        $('#discount-code').on('input', function() {
            $(this).val($(this).val().toUpperCase());
        });
    }
    
    function initializeCheckout() {
        // Checkout button click
        $('.checkout-actions .btn-primary').on('click', function() {
            if (!$(this).hasClass('loading')) {
                proceedToCheckout();
            }
        });
    }
    
    // Global functions
    window.updateQuantity = function(itemId, quantity) {
        if (quantity < 1) {
            removeItem(itemId);
            return;
        }
        
        // Update UI immediately
        const cartItem = $(`.cart-item[data-item-id="${itemId}"]`);
        const quantityInput = cartItem.find('.quantity-input');
        const stock = parseInt(quantityInput.attr('max'));
        
        if (quantity > stock) {
            showToast(`Only ${stock} items available in stock`, 'warning');
            quantity = stock;
        }
        
        quantityInput.val(quantity);
        
        // Update cart via AJAX
        updateCartItem(itemId, quantity);
    };
    
    window.removeItem = function(itemId) {
        if (confirm('Are you sure you want to remove this item from your cart?')) {
            const cartItem = $(`.cart-item[data-item-id="${itemId}"]`);
            
            // Add loading state
            cartItem.addClass('loading');
            
            // Remove from cart
            $.ajax({
                url: '/update_cart/' + itemId,
                method: 'POST',
                data: {
                    quantity: 0
                },
                success: function(response) {
                    // Animate removal
                    cartItem.fadeOut(300, function() {
                        $(this).remove();
                        updateCartSummary();
                        
                        // Check if cart is empty
                        if ($('.cart-item').length === 0) {
                            location.reload();
                        }
                    });
                    
                    showToast('Item removed from cart', 'success');
                },
                error: function() {
                    cartItem.removeClass('loading');
                    showToast('Error removing item from cart', 'danger');
                }
            });
        }
    };
    
    window.clearCart = function() {
        if (confirm('Are you sure you want to clear your entire cart?')) {
            // Add loading state to all items
            $('.cart-item').addClass('loading');
            
            // Clear cart via AJAX
            $.ajax({
                url: '/clear_cart',
                method: 'POST',
                success: function(response) {
                    showToast('Cart cleared successfully', 'success');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                },
                error: function() {
                    $('.cart-item').removeClass('loading');
                    showToast('Error clearing cart', 'danger');
                }
            });
        }
    };
    
    window.applyDiscount = function() {
        const discountCode = $('#discount-code').val().trim();
        const messageDiv = $('#discount-message');
        
        if (!discountCode) {
            showToast('Please enter a discount code', 'warning');
            return;
        }
        
        // Add loading state
        messageDiv.html('<span class="spinner"></span> Validating discount code...');
        
        // Validate discount code
        $.ajax({
            url: '/api/validate_discount',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                code: discountCode,
                total: {{ total }}
            }),
            success: function(response) {
                if (response.valid) {
                    messageDiv.html(`<span class="success">Discount applied! You saved $${response.discount_amount.toFixed(2)}</span>`);
                    updateCartSummary(response.discount_amount);
                    showToast('Discount code applied successfully!', 'success');
                } else {
                    messageDiv.html(`<span class="error">${response.message}</span>`);
                    showToast(response.message, 'danger');
                }
            },
            error: function() {
                messageDiv.html('<span class="error">Error validating discount code</span>');
                showToast('Error validating discount code', 'danger');
            }
        });
    };
    
    window.proceedToCheckout = function() {
        // Validate cart
        if ($('.cart-item').length === 0) {
            showToast('Your cart is empty', 'warning');
            return;
        }
        
        // Check stock availability
        let hasStockIssues = false;
        $('.cart-item').each(function() {
            const quantity = parseInt($(this).find('.quantity-input').val());
            const stock = parseInt($(this).find('.quantity-input').attr('max'));
            
            if (quantity > stock) {
                hasStockIssues = true;
                return false;
            }
        });
        
        if (hasStockIssues) {
            showToast('Some items in your cart are out of stock. Please update quantities.', 'warning');
            return;
        }
        
        // Add loading state
        const checkoutBtn = $('.checkout-actions .btn-primary');
        checkoutBtn.addClass('loading').prop('disabled', true);
        checkoutBtn.html('<span class="spinner"></span> Processing...');
        
        // Proceed to checkout
        setTimeout(() => {
            window.location.href = '/checkout';
        }, 1000);
    };
    
    function updateCartItem(itemId, quantity) {
        $.ajax({
            url: '/update_cart/' + itemId,
            method: 'POST',
            data: {
                quantity: quantity
            },
            success: function(response) {
                updateCartSummary();
                showToast('Cart updated successfully', 'success');
            },
            error: function() {
                showToast('Error updating cart', 'danger');
                // Revert quantity input
                location.reload();
            }
        });
    }
    
    function updateCartSummary(discountAmount = 0) {
        // Recalculate totals
        let subtotal = 0;
        
        $('.cart-item').each(function() {
            const price = parseFloat($(this).find('.current-price').text().replace('$', ''));
            const quantity = parseInt($(this).find('.quantity-input').val());
            const itemTotal = price * quantity;
            
            // Update item total
            $(this).find('.total-value').text('$' + itemTotal.toFixed(2));
            
            subtotal += itemTotal;
        });
        
        // Update summary
        $('.summary-item .value').first().text('$' + subtotal.toFixed(2));
        
        const total = subtotal - discountAmount;
        $('.summary-total .value').text('$' + total.toFixed(2));
        
        // Update checkout button
        $('.checkout-actions .btn-primary').html(`<i class="fas fa-credit-card"></i> Proceed to Checkout - $${total.toFixed(2)}`);
    }
    
    // Utility functions
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
    
    // Initialize cart summary on page load
    updateCartSummary();
    
    // Add hover effects
    $('.cart-item').hover(
        function() {
            $(this).addClass('hover-lift');
        },
        function() {
            $(this).removeClass('hover-lift');
        }
    );
    
    // Add click effects to buttons
    $('.btn').on('click', function() {
        $(this).addClass('btn-clicked');
        setTimeout(() => {
            $(this).removeClass('btn-clicked');
        }, 200);
    });
    
    // Auto-save cart changes
    let saveTimeout;
    $('.quantity-input').on('input', function() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const itemId = $(this).closest('.cart-item').data('item-id');
            const quantity = parseInt($(this).val());
            
            if (quantity > 0) {
                updateCartItem(itemId, quantity);
            }
        }, 1000); // Auto-save after 1 second of inactivity
    });
    
    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
        // Ctrl/Cmd + Enter to proceed to checkout
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            proceedToCheckout();
        }
        
        // Escape to clear discount code
        if (e.key === 'Escape') {
            $('#discount-code').val('');
            $('#discount-message').empty();
        }
    });
    
    // Add loading states to buttons
    $('.btn').on('click', function() {
        if (!$(this).hasClass('loading')) {
            $(this).addClass('loading');
            setTimeout(() => {
                $(this).removeClass('loading');
            }, 2000);
        }
    });
    
    // Initialize cart animations
    $('.cart-item').each(function(index) {
        $(this).css('animation-delay', (index * 0.1) + 's');
    });
    
    // Add cart item count to page title
    const itemCount = $('.cart-item').length;
    if (itemCount > 0) {
        document.title = `Cart (${itemCount} items) - Future Mech`;
    }
    
    // Add cart persistence warning
    if (localStorage.getItem('cart-warning-shown') !== 'true') {
        showToast('Your cart is automatically saved. Items will persist between sessions.', 'info', 5000);
        localStorage.setItem('cart-warning-shown', 'true');
    }
});

// CSS for additional effects
const additionalStyles = `
    .hover-lift {
        transform: translateY(-4px) !important;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
    }
    
    .btn-clicked {
        transform: scale(0.95);
    }
    
    .cart-item {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .quantity-controls .btn {
        transition: all 0.2s ease;
    }
    
    .quantity-controls .btn:hover {
        transform: scale(1.1);
    }
    
    .item-actions .btn {
        transition: all 0.2s ease;
    }
    
    .item-actions .btn:hover {
        transform: scale(1.1);
    }
    
    .discount-input .btn {
        transition: all 0.2s ease;
    }
    
    .discount-input .btn:hover {
        transform: translateY(-1px);
    }
    
    .checkout-actions .btn {
        transition: all 0.3s ease;
    }
    
    .checkout-actions .btn:hover {
        transform: translateY(-2px);
    }
    
    .loading {
        opacity: 0.6;
        pointer-events: none;
    }
    
    .loading .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .fade-in {
        animation: fadeIn 0.5s ease forwards;
    }
    
    @keyframes fadeIn {
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

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);





