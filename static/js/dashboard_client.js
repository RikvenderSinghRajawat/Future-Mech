$(document).ready(function() {
    // Initialize tooltips and popovers
        $('[data-bs-toggle="tooltip"]').tooltip();
    $('[data-bs-toggle="popover"]').popover();
    
    // Add vehicle form submission
    $('#addVehicleForm').on('submit', function(e) {
        e.preventDefault();
        
        const $submitBtn = $(this).find('button[type="submit"]');
        $submitBtn.prop('disabled', true).html('Adding Vehicle...');
        
        $.ajax({
            url: '/api/client/add_vehicle',
            method: 'POST',
            data: $(this).serialize(),
            success: function() {
                alert('Vehicle added successfully!');
                $('#addVehicleModal').modal('hide');
                location.reload();
            },
            error: function() {
                alert('Failed to add vehicle. Please try again.');
            },
            complete: function() {
                $submitBtn.prop('disabled', false).html('Add Vehicle');
            }
        });
    });
    
    // Add click effects
    $('.booking-item, .vehicle-item, .quick-action-btn').on('click', function() {
        $(this).addClass('micro-bounce');
        setTimeout(() => $(this).removeClass('micro-bounce'), 600);
    });
});

// Add CSS for animations
$('<style>').text(`
    .micro-bounce {
        animation: microBounce 0.6s ease;
    }
    @keyframes microBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`).appendTo('head');