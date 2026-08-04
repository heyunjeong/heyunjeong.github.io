document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initScrollAnimations();
    initActiveNav();
    initContentDiet();
});

// Mobile nav toggle
function initNav() {
    var toggle = document.getElementById('nav-toggle');
    var links  = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', function () {
        var isOpen = links.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close nav when a link is clicked
    links.querySelectorAll('.nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
            links.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Close nav on ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && links.classList.contains('open')) {
            links.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.focus();
        }
    });
}

// Fade-in on scroll using IntersectionObserver
function initScrollAnimations() {
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px'
    });

    document.querySelectorAll('.fade-in').forEach(function (el) {
        observer.observe(el);
    });
}

// Fetch and render the auto-refreshed content diet signal
function initContentDiet() {
    var container = document.getElementById('diet-signal');
    if (!container) return;

    fetch('/content-diet.json', { cache: 'no-cache' })
        .then(function (res) {
            if (!res.ok) throw new Error('content-diet.json fetch failed');
            return res.json();
        })
        .then(function (data) {
            if (data.reading) {
                var readingEl = container.querySelector('[data-diet="reading"]');
                if (readingEl) readingEl.textContent = data.reading;
            }
            if (data.listening) {
                var listeningEl = container.querySelector('[data-diet="listening"]');
                if (listeningEl) listeningEl.textContent = data.listening;
            }
            if (data.updated) {
                var updatedEl = container.querySelector('[data-diet="updated"]');
                if (updatedEl) updatedEl.textContent = formatDietDate(data.updated);
            }
        })
        .catch(function () {
            // Silently hide the block if fetch fails so the page still reads clean
            container.style.display = 'none';
        });
}

function formatDietDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Highlight active nav link based on scroll position
function initActiveNav() {
    var sectionIds = ['hero', 'work', 'about', 'contact'];
    var navLinks   = document.querySelectorAll('.nav-link');

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var id = entry.target.getAttribute('id');
                navLinks.forEach(function (link) {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
            }
        });
    }, {
        threshold: 0.35
    });

    sectionIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) observer.observe(el);
    });
}
