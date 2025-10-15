// Home Page JavaScript
$(document).ready(function() {
    // Smooth scrolling for hero scroll indicator
    $('.scroll-indicator').click(function() {
        $('html, body').animate({
            scrollTop: $('.features-section').offset().top - 70
        }, 1000);
    });
    
    // Counter animation for stats
    function animateCounter() {
        $('.stat-number').each(function() {
            const $this = $(this);
            const countTo = $this.data('count');
            const duration = 2000; // 2 seconds
            
            $({ countNum: 0 }).animate({
                countNum: countTo
            }, {
                duration: duration,
                easing: 'swing',
                step: function() {
                    $this.text(Math.floor(this.countNum).toLocaleString());
                },
                complete: function() {
                    $this.text(countTo.toLocaleString());
                }
            });
        });
    }
    
    // Enhanced Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Add staggered animation for feature cards
                if (element.classList.contains('feature-card')) {
                    const cards = document.querySelectorAll('.feature-card');
                    const index = Array.from(cards).indexOf(element);
                    element.style.animationDelay = (index * 0.1) + 's';
                    element.classList.add('fade-in');
                }
                
                // Trigger counter animation for stats section
                if (element.classList.contains('stats-section')) {
                    setTimeout(animateCounter, 500);
                }
                
                // Add advanced scroll animations
                if (element.classList.contains('animate-on-scroll')) {
                    element.classList.add('animated');
                }
                
                // Add section reveal animations
                if (element.classList.contains('section-reveal')) {
                    element.classList.add('revealed');
                }
                
                observer.unobserve(element);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    $('.feature-card').each(function() {
        observer.observe(this);
    });
    
    $('.stats-section').each(function() {
        observer.observe(this);
    });
    
    $('.animate-on-scroll').each(function() {
        observer.observe(this);
    });
    
    // Enhanced parallax effects
    $(window).scroll(function() {
        const scrolled = $(window).scrollTop();
        const windowHeight = $(window).height();
        
        // Hero section parallax
        const heroSection = $('.hero-section');
        const heroSpeed = 0.3;
        heroSection.css('transform', 'translateY(' + (scrolled * heroSpeed) + 'px)');
        
        // Parallax layers
        $('.parallax-layer-1').css('transform', 'translateY(' + (scrolled * 0.1) + 'px)');
        $('.parallax-layer-2').css('transform', 'translateY(' + (scrolled * -0.05) + 'px)');
        
        // Floating elements parallax
        $('.floating-element').each(function(index) {
            const speed = 0.1 + (index * 0.05);
            $(this).css('transform', 'translateY(' + (scrolled * speed) + 'px)');
        });
        
        // Feature cards reveal on scroll
        $('.feature-card').each(function() {
            const cardTop = $(this).offset().top;
            const cardHeight = $(this).outerHeight();
            const windowTop = $(window).scrollTop();
            const windowBottom = windowTop + windowHeight;
            
            if (cardTop < windowBottom && cardTop + cardHeight > windowTop) {
                $(this).addClass('in-view');
            }
        });
    });
    
    // Mouse tracking for interactive elements
    $(document).mousemove(function(e) {
        const mouseX = e.clientX / $(window).width();
        const mouseY = e.clientY / $(window).height();
        
        // Hero section mouse parallax
        $('.hero-section').css('background-position', 
            (50 + mouseX * 10) + '% ' + (50 + mouseY * 10) + '%'
        );
        
        // Floating elements follow mouse
        $('.floating-element').each(function(index) {
            const speed = 0.02 + (index * 0.01);
            const x = (mouseX - 0.5) * speed * 100;
            const y = (mouseY - 0.5) * speed * 100;
            $(this).css('transform', `translate(${x}px, ${y}px)`);
        });
    });
    
    // Typing animation for hero title
    function typeWriter(element, text, speed = 100) {
        let i = 0;
        element.innerHTML = '';
        
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        
        type();
    }
    
    // Initialize typing animation after a delay
    setTimeout(function() {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            const originalText = heroTitle.textContent;
            typeWriter(heroTitle, originalText, 50);
        }
    }, 1000);
    
    // Floating animation for feature icons
    $('.feature-icon').hover(
        function() {
            $(this).addClass('animate__animated animate__pulse');
        },
        function() {
            $(this).removeClass('animate__animated animate__pulse');
        }
    );
    
    // Dynamic background colors for feature cards
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    ];
    
    $('.feature-card').each(function(index) {
        const card = $(this);
        const colorIndex = index % colors.length;
        
        card.hover(
            function() {
                $(this).find('.feature-icon').css('background', colors[colorIndex]);
            },
            function() {
                $(this).find('.feature-icon').css('background', '');
            }
        );
    });
    
    // Smooth reveal animation for sections
    function revealSection() {
        $('.section-reveal').each(function() {
            const elementTop = $(this).offset().top;
            const elementBottom = elementTop + $(this).outerHeight();
            const viewportTop = $(window).scrollTop();
            const viewportBottom = viewportTop + $(window).height();
            
            if (elementBottom > viewportTop && elementTop < viewportBottom) {
                $(this).addClass('revealed');
            }
        });
    }
    
    $(window).on('scroll', revealSection);
    revealSection(); // Initial check
    
    // Add hover effects to CTA buttons
    $('.cta-buttons .btn').hover(
        function() {
            $(this).addClass('animate__animated animate__pulse');
        },
        function() {
            $(this).removeClass('animate__animated animate__pulse');
        }
    );
    
    // Particle system for hero section (optional enhancement)
    function createParticles() {
        const particleContainer = $('<div class="particles"></div>');
        $('.hero-section').append(particleContainer);
        
        for (let i = 0; i < 50; i++) {
            const particle = $('<div class="particle"></div>');
            particle.css({
                position: 'absolute',
                width: Math.random() * 4 + 'px',
                height: Math.random() * 4 + 'px',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '50%',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animation: `float ${Math.random() * 3 + 2}s infinite ease-in-out`
            });
            
            particleContainer.append(particle);
        }
    }
    
    // Add particle animation CSS
    const particleCSS = `
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 1;
        }
    `;
    
    $('<style>').text(particleCSS).appendTo('head');
    
    // Initialize particles (uncomment if desired)
    // createParticles();
    
    // Service card quick book functionality
    $(document).on('click', '.quick-book-btn', function(e) {
        e.preventDefault();
        const serviceId = $(this).data('service-id');
        const serviceName = $(this).data('service-name');
        
        if (typeof user_logged_in !== 'undefined' && !user_logged_in) {
            window.location.href = '/login?next=' + encodeURIComponent('/services#book-' + serviceId);
            return;
        }
        
        showToast(`Redirecting to book ${serviceName}...`, 'info');
        setTimeout(() => {
            window.location.href = `/services#book-${serviceId}`;
        }, 1000);
    });
    
    // Newsletter signup functionality
    $('#newsletter-form').on('submit', function(e) {
        e.preventDefault();
        const email = $(this).find('input[type="email"]').val();
        
        if (futureMech.validateEmail(email)) {
            // Simulate newsletter signup
            showToast('Thank you for subscribing to our newsletter!', 'success');
            $(this).find('input[type="email"]').val('');
        } else {
            showToast('Please enter a valid email address.', 'danger');
        }
    });
    
    // Social media sharing
    $('.social-share').on('click', function(e) {
        e.preventDefault();
        const platform = $(this).data('platform');
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        
        let shareUrl = '';
        
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                break;
        }
        
        if (shareUrl) {
            window.open(shareUrl, 'share', 'width=600,height=400');
        }
    });
    
    // Preload images for better performance
    function preloadImages() {
        const images = [
            '/static/images/hero-car.jpg',
            '/static/images/workshop.jpg',
            '/static/images/service-1.jpg',
            '/static/images/service-2.jpg'
        ];
        
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
    
    preloadImages();
    
    // Add loading states to service cards
    $('.feature-card .btn').on('click', function() {
        const btn = $(this);
        const originalText = btn.text();
        
        btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Loading...');
        btn.prop('disabled', true);
        
        // Simulate loading (remove in production)
        setTimeout(() => {
            btn.html(originalText);
            btn.prop('disabled', false);
        }, 2000);
    });
});

// Custom cursor effect (optional enhancement)
$(document).mousemove(function(e) {
    $('.custom-cursor').css({
        left: e.clientX,
        top: e.clientY
    });
});

// Add custom cursor HTML and CSS (uncomment if desired)
/*
$('body').append('<div class="custom-cursor"></div>');

const cursorCSS = `
    .custom-cursor {
        position: fixed;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(30,64,175,0.8) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        transition: transform 0.1s ease;
    }
    
    body:hover .custom-cursor {
        transform: scale(1.5);
    }
`;

$('<style>').text(cursorCSS).appendTo('head');
*/