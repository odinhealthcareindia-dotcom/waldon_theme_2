(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function fmt(cents) {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'USD' });
  }

  // ── Product data ──────────────────────────────────────────────────────────
  var productDataEl = qs('#pdp-product-json');
  if (!productDataEl) return;
  var product;
  try { product = JSON.parse(productDataEl.textContent); } catch (e) { return; }
  var variants = product.variants || [];

  // ── Gallery ───────────────────────────────────────────────────────────────
  (function initGallery() {
    var main = qs('#pdp-gallery-main');
    var dotsWrap = qs('#pdp-gallery-dots');
    var thumbsWrap = qs('#pdp-gallery-thumbs');
    if (!main) return;

    var slides = qsa('.pdp-gallery-slide', main);
    if (!slides.length) return;
    var current = 0;

    function goTo(n) {
      slides[current].classList.remove('active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('active');
      updateDots();
      updateThumbs();
    }

    function updateDots() {
      if (!dotsWrap) return;
      qsa('.pdp-gallery-dot', dotsWrap).forEach(function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }

    function updateThumbs() {
      if (!thumbsWrap) return;
      qsa('.pdp-gallery-thumb', thumbsWrap).forEach(function (t, i) {
        t.classList.toggle('active', i === current);
        if (i === current) t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    }

    // Build dots
    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var d = document.createElement('button');
        d.className = 'pdp-gallery-dot' + (i === 0 ? ' active' : '');
        d.setAttribute('aria-label', 'Go to image ' + (i + 1));
        d.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(d);
      });
    }

    // Thumb clicks
    if (thumbsWrap) {
      qsa('.pdp-gallery-thumb', thumbsWrap).forEach(function (t, i) {
        t.addEventListener('click', function () { goTo(i); });
      });
    }

    // Prev/next buttons
    var prevBtn = qs('#pdp-gallery-prev');
    var nextBtn = qs('#pdp-gallery-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

    // Touch swipe
    var touchStartX = 0;
    var touchStartY = 0;
    main.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    main.addEventListener('touchmove', function (e) {
      var dx = Math.abs(e.touches[0].clientX - touchStartX);
      var dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > dy) e.preventDefault();
    }, { passive: false });
    main.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goTo(dx < 0 ? current + 1 : current - 1);
    }, { passive: true });

    // Init first slide
    slides.forEach(function (s, i) { s.classList.toggle('active', i === 0); });
    updateDots();
    updateThumbs();
  })();

  // ── Variant selection ─────────────────────────────────────────────────────
  (function initVariants() {
    var variantInput = qs('#pdp-variant-id');
    if (!variantInput) return;

    var selectedOptions = {};
    var priceEl = qs('#pdp-price');
    var strikeEl = qs('#pdp-strike');
    var saveEl = qs('#pdp-save');
    var addPriceEl = qs('#pdp-add-price');
    var stickyPriceEl = qs('#pdp-sticky-price');
    var addBtn = qs('#pdp-add-btn');
    var sizeLabelEl = qs('#pdp-size-label');
    var colorLabelEl = qs('#pdp-color-label');

    function findVariant() {
      return variants.find(function (v) {
        return v.options.every(function (opt, idx) {
          var key = product.options[idx];
          return !selectedOptions[key] || selectedOptions[key] === opt;
        });
      });
    }

    function updatePriceDisplay(variant) {
      if (!variant) return;
      var price = fmt(variant.price);
      if (priceEl) priceEl.textContent = price;
      if (addPriceEl) addPriceEl.textContent = price;
      if (stickyPriceEl) stickyPriceEl.textContent = price;
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        if (strikeEl) { strikeEl.textContent = fmt(variant.compare_at_price); strikeEl.style.display = ''; }
        if (saveEl) {
          var pct = Math.round((1 - variant.price / variant.compare_at_price) * 100);
          saveEl.textContent = 'Save ' + pct + '%';
          saveEl.style.display = '';
        }
      } else {
        if (strikeEl) strikeEl.style.display = 'none';
        if (saveEl) saveEl.style.display = 'none';
      }
    }

    function updateAvailability(variant) {
      if (!addBtn) return;
      if (!variant || !variant.available) {
        addBtn.disabled = true;
        addBtn.textContent = addBtn.getAttribute('data-sold-out') || 'Sold Out';
      } else {
        addBtn.disabled = false;
        addBtn.textContent = addBtn.getAttribute('data-add-text') || 'Add to Bag';
      }
    }

    function goToMediaId(mediaId) {
      var targetSlide = document.querySelector('.pdp-gallery-slide[data-media-id="' + mediaId + '"]');
      if (!targetSlide) return;
      var index = parseInt(targetSlide.dataset.index, 10);
      var allSlides = document.querySelectorAll('.pdp-gallery-slide');
      var dots   = document.querySelectorAll('.pdp-gallery-dot');
      var thumbs = document.querySelectorAll('.pdp-gallery-thumb');
      allSlides.forEach(function (s) { s.classList.remove('active'); });
      dots.forEach(function (d) { d.classList.remove('active'); });
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      targetSlide.classList.add('active');
      var targetDot   = dotsWrap && dotsWrap.querySelectorAll('.pdp-gallery-dot')[index];
      var targetThumb = document.querySelector('.pdp-gallery-thumb[data-index="' + index + '"]');
      if (targetDot)   targetDot.classList.add('active');
      if (targetThumb) {
        targetThumb.classList.add('active');
        targetThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      current = index;
    }

    function selectVariant(variant) {
      if (!variant) return;
      variantInput.value = variant.id;
      updatePriceDisplay(variant);
      updateAvailability(variant);
      if (variant.featured_media) goToMediaId(variant.featured_media.id);
    }

    // Option buttons (size, color, etc.)
    qsa('[data-option-name]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-option-name');
        var val = btn.getAttribute('data-option-value');
        selectedOptions[name] = val;

        // Update active state within this option group
        qsa('[data-option-name="' + name + '"]').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-option-value') === val);
        });

        // Update label
        var lower = name.toLowerCase();
        if (lower.indexOf('size') !== -1 && sizeLabelEl) sizeLabelEl.textContent = val;
        if (lower.indexOf('color') !== -1 && colorLabelEl) colorLabelEl.textContent = val;

        var variant = findVariant();
        if (variant) selectVariant(variant);
      });
    });

    // Pre-select first options
    product.options.forEach(function (optName) {
      var first = qs('[data-option-name="' + optName + '"]');
      if (first) first.click();
    });
  })();

  // ── Bundle selection ──────────────────────────────────────────────────────
  (function initBundles() {
    var qtyInput = qs('#pdp-quantity');
    var addPriceEl = qs('#pdp-add-price');
    var stickyPriceEl = qs('#pdp-sticky-price');

    qsa('[data-qty]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qty = parseInt(btn.getAttribute('data-qty'), 10) || 1;
        var price = btn.getAttribute('data-price');

        qsa('[data-qty]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        if (qtyInput) qtyInput.value = qty;
        if (price) {
          var priceFormatted = fmt(parseInt(price, 10));
          if (addPriceEl) addPriceEl.textContent = priceFormatted;
          if (stickyPriceEl) stickyPriceEl.textContent = priceFormatted;
        }
      });
    });

    // Pre-select first bundle
    var firstBundle = qs('[data-qty]');
    if (firstBundle) firstBundle.click();
  })();

  // ── Countdown timer ───────────────────────────────────────────────────────
  (function initCountdown() {
    var hEl = qs('#pdp-cd-h');
    var mEl = qs('#pdp-cd-m');
    var sEl = qs('#pdp-cd-s');
    if (!hEl || !mEl || !sEl) return;

    var end = Date.now() + ((4 * 3600 + 23 * 60 + 47) * 1000);

    function tick() {
      var diff = Math.max(0, end - Date.now());
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      hEl.textContent = String(h).padStart(2, '0');
      mEl.textContent = String(m).padStart(2, '0');
      sEl.textContent = String(s).padStart(2, '0');
      if (diff > 0) setTimeout(tick, 1000);
    }
    tick();
  })();

  // ── FAQ accordion ─────────────────────────────────────────────────────────
  (function initFaq() {
    var faqEl = qs('#pdp-faq');
    if (!faqEl) return;
    qsa('.pdp-faq-item', faqEl).forEach(function (item) {
      var trigger = qs('.pdp-faq-q', item);
      var body = qs('.pdp-faq-a', item);
      if (!trigger) return;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', function () {
        var open = item.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(open));
        if (body) body.style.display = open ? '' : 'none';
      });
      if (body) body.style.display = 'none';
    });
  })();

  // ── Sticky bar ────────────────────────────────────────────────────────────
  (function initSticky() {
    var stickyEl = qs('#pdp-sticky');
    var addBtn = qs('#pdp-add-btn');
    if (!stickyEl || !addBtn) return;

    var stickyAddBtn = qs('#pdp-sticky-btn', stickyEl);

    var observer = new IntersectionObserver(function (entries) {
      var hidden = !entries[0].isIntersecting;
      stickyEl.classList.toggle('visible', hidden);
    }, { threshold: 0 });
    observer.observe(addBtn);

    if (stickyAddBtn) {
      stickyAddBtn.addEventListener('click', function () {
        addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () { addBtn.click(); }, 400);
      });
    }
  })();

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg) {
    var toast = qs('#pdp-toast');
    var textEl = qs('#pdp-toast-text');
    if (!toast) return;
    if (textEl) textEl.textContent = msg || 'Added to bag!';
    toast.classList.add('visible');
    setTimeout(function () { toast.classList.remove('visible'); }, 3000);
  }

  // ── AJAX add to cart ──────────────────────────────────────────────────────
  (function initCart() {
    var form = qs('#pdp-form');
    var addBtn = qs('#pdp-add-btn');
    if (!form || !addBtn) return;

    var originalText = addBtn.textContent;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (addBtn.disabled) return;

      addBtn.disabled = true;
      addBtn.textContent = 'Adding…';

      var data = new FormData(form);
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: data
      })
        .then(function (res) {
          if (!res.ok) throw new Error('cart error');
          return res.json();
        })
        .then(function () {
          showToast('Added to bag!');
          addBtn.textContent = '✓ Added';
          // Update cart count if present
          var countEls = qsa('.cart-count, [data-cart-count]');
          if (countEls.length) {
            fetch('/cart.js')
              .then(function (r) { return r.json(); })
              .then(function (cart) {
                countEls.forEach(function (el) { el.textContent = cart.item_count; });
              });
          }
          setTimeout(function () {
            addBtn.disabled = false;
            addBtn.textContent = originalText;
          }, 2000);
        })
        .catch(function () {
          addBtn.disabled = false;
          addBtn.textContent = originalText;
          showToast('Something went wrong. Please try again.');
        });
    });
  })();

  // ── Live social proof ─────────────────────────────────────────────────────
  (function initLiveProof() {
    var liveEl = qs('#pdp-live');
    if (!liveEl) return;

    var names = ['Sarah M.', 'James T.', 'Linda K.', 'Robert A.', 'Patricia S.', 'Michael B.', 'Barbara W.', 'David H.'];
    var locations = ['Austin, TX', 'Portland, OR', 'Denver, CO', 'Nashville, TN', 'Phoenix, AZ', 'Charlotte, NC', 'Atlanta, GA', 'Seattle, WA'];
    var messages = ['just ordered!', 'just purchased 2-pack', 'added to their cart', 'just ordered a 3-pack'];
    var nameEl = qs('#pdp-live-name', liveEl);
    var timeEl = qs('#pdp-live-time', liveEl);
    var times = ['just now', '1 min ago', '2 min ago', '3 min ago', '5 min ago'];

    function next() {
      var name = names[Math.floor(Math.random() * names.length)];
      var loc = locations[Math.floor(Math.random() * locations.length)];
      var msg = messages[Math.floor(Math.random() * messages.length)];
      var time = times[Math.floor(Math.random() * times.length)];
      liveEl.classList.remove('visible');
      setTimeout(function () {
        if (nameEl) nameEl.textContent = name + ' from ' + loc;
        if (timeEl) timeEl.textContent = time;
        liveEl.classList.add('visible');
      }, 300);
      setTimeout(function () { liveEl.classList.remove('visible'); }, 5000);
    }

    // Start after a short delay, then repeat
    setTimeout(function () {
      next();
      setInterval(next, 12000);
    }, 4000);
  })();

})();
