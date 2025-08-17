// DOM Content Loaded
document.addEventListener("DOMContentLoaded", function() {
    // Initialize all functionality
    initScrollAnimations();
    initToggleButtons();
    initSmoothScrolling();
    initPerformanceOptimizations();
});

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                // Unobserve after animation to improve performance
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all fade-in elements
    const fadeElements = document.querySelectorAll(".fade-in");
    fadeElements.forEach((element, index) => {
        // Add staggered delay for multiple elements
        element.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(element);
    });
}

// Toggle Button Functionality
function initToggleButtons() {
    const toggleButtons = document.querySelectorAll(".toggle-btn");
    
    toggleButtons.forEach(button => {
        button.addEventListener("click", function() {
            const targetId = this.getAttribute("data-target");
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Toggle active state
                const isActive = targetElement.classList.contains("active");
                
                if (isActive) {
                    // Close
                    targetElement.classList.remove("active");
                    this.classList.remove("active");
                    this.setAttribute("aria-expanded", "false");
                    
                    // Scroll to the accomplishment item for better UX
                    this.closest(".accomplishment-item").scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                } else {
                    // Close all other open accomplishments first
                    closeAllAccomplishments();
                    
                    // Open this one
                    targetElement.classList.add("active");
                    this.classList.add("active");
                    this.setAttribute("aria-expanded", "true");
                    
                    // Scroll to show the expanded content
                    setTimeout(() => {
                        targetElement.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest"
                        });
                    }, 300);
                }
            }
        });
        
        // Add keyboard support
        button.addEventListener("keydown", function(e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// Close all accomplishments
function closeAllAccomplishments() {
    const allDetails = document.querySelectorAll(".accomplishment-details");
    const allButtons = document.querySelectorAll(".toggle-btn");
    
    allDetails.forEach(detail => {
        detail.classList.remove("active");
    });
    
    allButtons.forEach(button => {
        button.classList.remove("active");
        button.setAttribute("aria-expanded", "false");
    });
}

// Smooth Scrolling for Internal Links
function initSmoothScrolling() {
    // Handle scroll indicator click
    const scrollIndicator = document.querySelector(".scroll-indicator");
    if (scrollIndicator) {
        scrollIndicator.addEventListener("click", function() {
            const accomplishmentsSection = document.getElementById("accomplishments");
            if (accomplishmentsSection) {
                accomplishmentsSection.scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    }
    
    // Handle any other internal links
    const internalLinks = document.querySelectorAll("a[href^=\"#\"]");
    internalLinks.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    });
}

// Performance Optimizations
function initPerformanceOptimizations() {
    // Debounce scroll events for better performance
    let scrollTimeout;
    window.addEventListener("scroll", function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(handleScroll, 10);
    });
    
    // Preload critical resources
    preloadCriticalResources();
    
    // Lazy load non-critical elements
    lazyLoadElements();
}

// Handle scroll events (debounced)
function handleScroll() {
    // Add any scroll-based functionality here
    // Currently handled by Intersection Observer for better performance
}

// Preload critical resources
function preloadCriticalResources() {
    // Preload Google Fonts
    const fontLink = document.createElement("link");
    fontLink.rel = "preload";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap";
    fontLink.as = "style";
    fontLink.onload = function() {
        this.onload = null;
        this.rel = "stylesheet";
    };
    document.head.appendChild(fontLink);
}

// Lazy load non-critical elements
function lazyLoadElements() {
    // Add lazy loading for any images or heavy content
    // Currently not needed as we don't have images, but ready for future use
    const lazyElements = document.querySelectorAll("[data-lazy]");
    
    if (lazyElements.length > 0) {
        const lazyObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    // Load the lazy content
                    if (element.dataset.lazy) {
                        element.src = element.dataset.lazy;
                        element.removeAttribute("data-lazy");
                        lazyObserver.unobserve(element);
                    }
                }
            });
        });
        
        lazyElements.forEach(element => {
            lazyObserver.observe(element);
        });
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error Handling
window.addEventListener("error", function(e) {
    console.error("JavaScript error:", e.error);
    // In production, you might want to send this to an error tracking service
});

// Accessibility Enhancements
document.addEventListener("keydown", function(e) {
    // ESC key closes all open accomplishments
    if (e.key === "Escape") {
        closeAllAccomplishments();
    }
});

// Reduced Motion Support
function respectReducedMotion() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    
    if (prefersReducedMotion.matches) {
        // Disable animations for users who prefer reduced motion
        document.documentElement.style.setProperty("--animation-duration", "0.01ms");
        document.documentElement.style.setProperty("--transition-duration", "0.01ms");
    }
}

// Initialize reduced motion support
respectReducedMotion();

// Listen for changes in motion preference
if (window.matchMedia) {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addListener(respectReducedMotion);
}