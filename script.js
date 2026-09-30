document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initScrollAnimations();
    initActiveNav();
    initContentDiet();
    initConversionTracking();
});

// ---------------------------------------------------------------
// Conversion tracking (GA4 custom events)
// Mark these as key events in GA4: email_click, linkedin_click,
// work_sample_click, work_sample_embed_play, deep_read
// ---------------------------------------------------------------
function track(eventName, params) {
    if (typeof window.gtag !== 'function') return;
    params = params || {};
    params.page_path = location.pathname;
    window.gtag('event', eventName, params);
}

function initConversionTracking() {
    // 1 + 2 + 4: link clicks (delegated so it covers every page)
    document.addEventListener('click', function (e) {
        var link = e.target.closest ? e.target.closest('a[href]') : null;
        if (!link) return;
        var href = link.getAttribute('href') || '';
        var label = (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 100);

        if (href.indexOf('mailto:') === 0) {
            track('email_click', { link_text: label });
        } else if (href.indexOf('linkedin.com') !== -1) {
            track('linkedin_click', { link_url: href });
        } else if (link.matches('.case-link, .writing-title, .tinker-link')) {
            var type = link.classList.contains('writing-title') ? 'byline'
                     : link.classList.contains('tinker-link') ? 'side_project'
                     : 'case_study';
            track('work_sample_click', { link_url: href, link_text: label, sample_type: type });
        }
    }, true);

    // 4: plays/clicks inside embedded work samples (YouTube, TikTok, Instagram).
    // Cross-origin iframes don't expose clicks, so detect focus moving into one.
    var embedsFired = {};
    window.addEventListener('blur', function () {
        setTimeout(function () {
            var el = document.activeElement;
            if (!el || el.tagName !== 'IFRAME') return;
            var src = el.getAttribute('src') || '';
            if (!/youtube|tiktok|instagram/.test(src) || embedsFired[src]) return;
            embedsFired[src] = true;
            track('work_sample_embed_play', { embed_url: src, embed_title: el.getAttribute('title') || '' });
        }, 0);
    });

    // 5: deep read = scrolled 75% of the page OR 60s of visible time on page
    var deepReadFired = false;
    function fireDeepRead(reason) {
        if (deepReadFired) return;
        deepReadFired = true;
        track('deep_read', { trigger: reason });
    }

    window.addEventListener('scroll', function () {
        var doc = document.documentElement;
        var scrollable = doc.scrollHeight - window.innerHeight;
        if (scrollable <= 0) return;
        if ((window.scrollY / scrollable) >= 0.75) fireDeepRead('scroll_75');
    }, { passive: true });

    var visibleSeconds = 0;
    var timer = setInterval(function () {
        if (document.visibilityState !== 'visible') return;
        visibleSeconds += 1;
        if (visibleSeconds >= 60) {
            clearInterval(timer);
            fireDeepRead('time_60s');
        }
    }, 1000);
}

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
