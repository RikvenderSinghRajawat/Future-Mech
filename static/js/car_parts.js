$(document).ready(function() {
    // Search and filter functionality
    $('#partsSearch').on('input', function() {
        filterParts();
    });
    
    $('#categoryFilter').on('change', function() {
        filterParts();
    });
    
    $('#clearFilters').on('click', function() {
        $('#partsSearch').val('');
        $('#categoryFilter').val('');
        filterParts();
    });
    
    function filterParts() {
        const searchTerm = $('#partsSearch').val().toLowerCase();
        const selectedCategory = $('#categoryFilter').val();
        let visibleCount = 0;
        
        $('.part-card-wrapper').each(function() {
            const $card = $(this);
            const partName = $card.find('.part-title').text().toLowerCase();
            const partDescription = $card.find('.part-description').text().toLowerCase();
            const partCategory = $card.data('category').toLowerCase();
            
            const matchesSearch = partName.includes(searchTerm) || partDescription.includes(searchTerm);
            const matchesCategory = !selectedCategory || partCategory === selectedCategory.toLowerCase();
            
            if (matchesSearch && matchesCategory) {
                $card.show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });
        
        if (visibleCount === 0) {
            $('#noResults').show();
            $('#partsGrid').hide();
        } else {
            $('#noResults').hide();
            $('#partsGrid').show();
        }
    }
    
    // Add to cart functionality
    $('.add-to-cart-btn').on('click', function() {
        const partId = $(this).data('part-id');
        const quantity = $(this).closest('.part-actions').find('.quantity-input').val();
        
        $.ajax({
            url: '/add_to_cart/' + partId,
            method: 'POST',
            data: { quantity: quantity },
            success: function() {
                alert('Item added to cart!');
            },
            error: function() {
                alert('Failed to add item to cart');
            }
        });
    });
});