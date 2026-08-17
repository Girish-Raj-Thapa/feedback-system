(function () {
  'use strict';

  try {
  // ─── Metadata helpers ────────────────────────────────────────────────────────

  function getBrowser(ua) {
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\/|Opera/.test(ua)) return 'Opera';
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
    if (/MSIE|Trident/.test(ua)) return 'Internet Explorer';
    return 'Unknown';
  }

  function getOS(ua) {
    if (/Windows NT/.test(ua)) return 'Windows';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad/.test(ua)) return 'iOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  }

  function getDeviceType() {
    return screen.width < 768 ? 'mobile' : 'desktop';
  }

  // ─── Contrast computation (WCAG relative luminance) ──────────────────────────
  // Returns '#0f0f0f' or '#ffffff' — whichever contrasts better with `hex`.

  function getLuminance(hex) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    var r = parseInt(c.slice(0,2),16)/255;
    var g = parseInt(c.slice(2,4),16)/255;
    var b = parseInt(c.slice(4,6),16)/255;
    var lin = function(v){ return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
  }

  function contrastOn(hex) {
    try { return getLuminance(hex) > 0.179 ? '#0f0f0f' : '#ffffff'; }
    catch(e) { return '#ffffff'; }
  }

  // ─── Theme token maps ────────────────────────────────────────────────────────

  var LIGHT = {
    surface:         '#ffffff',
    surfaceRaised:   '#f7f7f8',
    borderSubtle:    '#ebebeb',
    textPrimary:     '#0f0f0f',
    textSecondary:   '#6b6b6b',
    textPlaceholder: '#b8b8b8',
    overlay:         'rgba(0,0,0,0.22)',
    danger:          '#dc2626',
    shadow:          '0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)',
    shadowBtn:       '0 4px 16px rgba(0,0,0,0.16)',
  };

  var DARK = {
    surface:         '#1c1c1e',
    surfaceRaised:   '#2c2c2e',
    borderSubtle:    '#3a3a3c',
    textPrimary:     '#f5f5f7',
    textSecondary:   '#8e8e93',
    textPlaceholder: '#555558',
    overlay:         'rgba(0,0,0,0.55)',
    danger:          '#ff453a',
    shadow:          '0 24px 64px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.30)',
    shadowBtn:       '0 4px 16px rgba(0,0,0,0.40)',
  };

  // ─── Init ────────────────────────────────────────────────────────────────────

  var isLoadingConfig = false;
  var isSubmitting = false;

  function init() {
    var scripts = document.querySelectorAll('script[data-project]');
    var scriptEl = scripts[scripts.length - 1];
    
    // For live preview
    if (window.FeedbackFlowConfigOverride) {
      var src = scriptEl ? scriptEl.getAttribute('src') || '' : '';
      var baseUrl = src.replace(/\/widget\.js.*$/, '');
      if (!baseUrl && window.location.origin) baseUrl = window.location.origin;
      renderWidget(baseUrl, 'preview_key', window.FeedbackFlowConfigOverride);
      return;
    }

    if (!scriptEl) return;
    var publicKey = scriptEl.getAttribute('data-project');
    if (!publicKey) return;

    var src = scriptEl.getAttribute('src') || '';
    var baseUrl = src.replace(/\/widget\.js.*$/, '');

    if (isLoadingConfig) return;
    isLoadingConfig = true;

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = null;

    if (controller) {
      timeoutId = setTimeout(function() { controller.abort(); }, 10000);
    }

    var fetchOpts = {};
    if (controller) fetchOpts.signal = controller.signal;

    fetch(baseUrl + '/api/widget/config?key=' + encodeURIComponent(publicKey), fetchOpts)
      .then(function(res) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Config not found');
        return res.json();
      })
      .then(function(config) {
        renderWidget(baseUrl, publicKey, config);
      })
      .catch(function(err) {
        console.warn('[FeedbackFlow] Could not load widget:', err.message);
      });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  function renderWidget(baseUrl, publicKey, config) {
    var position = config.position || 'bottom-right';
    var accent   = (config.color || '#000000').trim();
    var label    = config.text  || 'Feedback';
    var theme    = config.theme || 'light';
    var radius   = config.border_radius || '16px';
    var iconName = config.icon || 'chat';
    var title    = config.title || 'Send Feedback';

    var isDark  = theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var T       = isDark ? DARK : LIGHT;
    var onAccent = contrastOn(accent);
    var isRight = position !== 'bottom-left';
    var side    = isRight ? 'right:24px' : 'left:24px';

    // ── CSS ──────────────────────────────────────────────────────────────────

    var css = [
      /* keyframes */
      '@keyframes ff-in{from{opacity:0;transform:translateY(10px) scale(0.975)}to{opacity:1;transform:none}}',
      '@keyframes ff-spin{to{transform:rotate(360deg)}}',

      /* floating trigger button */
      '#ff-btn{',
        'position:fixed;bottom:24px;' + side + ';',
        'background:' + accent + ';',
        'color:' + onAccent + ';',
        'border:none;border-radius:' + radius + ';',
        'padding:14px 26px;',
        'font-size:16px;font-weight:700;letter-spacing:-0.02em;',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;',
        'cursor:pointer;user-select:none;',
        'z-index:2147483644;',
        'box-shadow:' + T.shadowBtn + ';',
        'transition:opacity .15s ease,transform .12s ease;',
        'display:flex;align-items:center;gap:7px;line-height:1;',
      '}',
      '#ff-btn:hover{opacity:0.86;transform:translateY(-1px)}',
      '#ff-btn:active{transform:scale(0.97)}',

      /* modal panel */
      '#ff-panel{',
        'display:none;',
        'position:fixed;bottom:84px;' + side + ';',
        'width:400px;max-width:calc(100vw - 48px);',
        'background:' + T.surface + ';',
        'border:1px solid ' + T.borderSubtle + ';',
        'border-radius:' + radius + ';',
        'box-shadow:' + T.shadow + ';',
        'z-index:2147483645;overflow:hidden;',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;',
      '}',
      '#ff-panel.ff-open{display:block;animation:ff-in .22s cubic-bezier(.34,1.15,.64,1) both}',

      /* header */
      '#ff-hd{',
        'display:flex;align-items:center;justify-content:space-between;',
        'padding:20px 24px 16px;',
        'border-bottom:1px solid ' + T.borderSubtle + ';',
      '}',
      '#ff-hd-l{display:flex;align-items:center;gap:11px}',
      '#ff-icon{',
        'width:36px;height:36px;border-radius:' + (parseInt(radius) > 8 ? '10px' : radius) + ';flex-shrink:0;',
        'background:' + accent + ';',
        'display:flex;align-items:center;justify-content:center;',
      '}',
      '#ff-hd h3{',
        'margin:0;font-size:15px;font-weight:700;letter-spacing:-0.02em;',
        'color:' + T.textPrimary + ';line-height:1.2;',
      '}',
      '#ff-hd p{',
        'margin:2px 0 0;font-size:12px;',
        'color:' + T.textSecondary + ';line-height:1;',
      '}',

      /* close button */
      '#ff-close{',
        'background:' + T.surfaceRaised + ';border:none;',
        'border-radius:50%;width:28px;height:28px;',
        'cursor:pointer;padding:0;flex-shrink:0;',
        'color:' + T.textSecondary + ';',
        'display:flex;align-items:center;justify-content:center;',
        'transition:background .12s,color .12s;',
      '}',
      '#ff-close:hover{background:' + T.borderSubtle + ';color:' + T.textPrimary + '}',

      /* body */
      '#ff-body{padding:18px 24px 24px}',

      /* textarea */
      '#ff-msg{',
        'width:100%;box-sizing:border-box;display:block;',
        'border:1.5px solid ' + T.borderSubtle + ';border-radius:' + (parseInt(radius) > 8 ? '10px' : radius) + ';',
        'padding:12px 14px;',
        'font-size:14px;line-height:1.55;font-family:inherit;',
        'resize:none;height:140px;',
        'color:' + T.textPrimary + ';',
        'background:' + T.surfaceRaised + ';',
        'outline:none;',
        'transition:border-color .15s,box-shadow .15s,background .15s;',
      '}',
      '#ff-msg::placeholder{color:' + T.textPlaceholder + '}',
      '#ff-msg:focus{',
        'border-color:' + accent + ';',
        'background:' + T.surface + ';',
        'box-shadow:0 0 0 3px ' + hexAlpha(accent, 0.15) + ';',
      '}',
      '#ff-msg.ff-field-err{',
        'border-color:' + T.danger + '!important;',
        'box-shadow:0 0 0 3px ' + hexAlpha(T.danger, 0.14) + '!important;',
      '}',

      /* character counter */
      '#ff-cc{',
        'text-align:right;font-size:11px;margin-top:5px;',
        'color:' + T.textPlaceholder + ';transition:color .15s;',
        'font-variant-numeric:tabular-nums;',
      '}',
      '#ff-cc.ff-near{color:' + T.danger + '}',

      /* email input */
      '#ff-email{',
        'width:100%;box-sizing:border-box;display:block;',
        'border:1.5px solid ' + T.borderSubtle + ';border-radius:' + (parseInt(radius) > 8 ? '10px' : radius) + ';',
        'padding:12px 14px;margin-top:12px;',
        'font-size:14px;font-family:inherit;',
        'color:' + T.textPrimary + ';',
        'background:' + T.surfaceRaised + ';',
        'outline:none;',
        'transition:border-color .15s,box-shadow .15s,background .15s;',
      '}',
      '#ff-email::placeholder{color:' + T.textPlaceholder + '}',
      '#ff-email:focus{',
        'border-color:' + accent + ';',
        'background:' + T.surface + ';',
        'box-shadow:0 0 0 3px ' + hexAlpha(accent, 0.15) + ';',
      '}',

      /* submit button */
      '#ff-sub{',
        'width:100%;margin-top:16px;',
        'background:' + accent + ';color:' + onAccent + ';',
        'border:none;border-radius:' + (parseInt(radius) > 8 ? '10px' : radius) + ';',
        'padding:13px;',
        'font-size:14px;font-weight:600;letter-spacing:-0.01em;font-family:inherit;',
        'cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;gap:8px;',
        'transition:opacity .15s,transform .1s;',
      '}',
      '#ff-sub:hover:not(:disabled){opacity:0.86}',
      '#ff-sub:active:not(:disabled){transform:scale(0.98)}',
      '#ff-sub:disabled{opacity:0.42;cursor:not-allowed}',

      /* spinner inside button */
      '.ff-spin{',
        'width:14px;height:14px;border-radius:50%;flex-shrink:0;',
        'border:2px solid ' + onAccent + ';border-top-color:transparent;',
        'animation:ff-spin .6s linear infinite;',
      '}',

      /* inline error */
      '#ff-err{',
        'font-size:12px;color:' + T.danger + ';',
        'margin-top:9px;line-height:1.45;display:none;',
      '}',

      /* footer / powered by */
      '#ff-foot{',
        'padding:12px 24px 14px;text-align:center;',
        'font-size:11px;color:' + T.textPlaceholder + ';',
        'border-top:1px solid ' + T.borderSubtle + ';',
        'letter-spacing:0.01em;',
      '}',

      /* success state */
      '#ff-ok{',
        'display:none;',
        'flex-direction:column;align-items:center;justify-content:center;',
        'padding:48px 28px 52px;text-align:center;',
        'background:' + T.surface + ';',
      '}',
      '#ff-ok.ff-show{display:flex;animation:ff-in .25s ease both}',
      '#ff-ok-ring{',
        'width:64px;height:64px;border-radius:50%;margin-bottom:20px;',
        'background:' + hexAlpha(accent, 0.1) + ';',
        'display:flex;align-items:center;justify-content:center;',
      '}',
      '#ff-ok h4{',
        'margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.03em;',
        'color:' + T.textPrimary + ';',
      '}',
      '#ff-ok p{margin:0;font-size:13px;color:' + T.textSecondary + ';line-height:1.55}',
    ].join('');

    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── DOM ──────────────────────────────────────────────────────────────────

    // Trigger button
    var btn = document.createElement('button');
    btn.id = 'ff-btn';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = icon(iconName, 15, onAccent) + label;

    // Panel
    var panel = document.createElement('div');
    panel.id = 'ff-panel';
    if (config.open) panel.className = 'ff-open';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Feedback panel');
    panel.innerHTML = [
      '<div id="ff-hd">',
        '<div id="ff-hd-l">',
          '<div id="ff-icon">' + icon(iconName, 16, onAccent) + '</div>',
          '<div>',
            '<h3>' + title + '</h3>',
            '<p>We read every message</p>',
          '</div>',
        '</div>',
        '<button id="ff-close" aria-label="Close panel">' + icon('x', 14, T.textSecondary) + '</button>',
      '</div>',

      '<div id="ff-form-wrap">',
        '<div id="ff-body">',
          '<textarea id="ff-msg" placeholder="What\'s on your mind?" maxlength="5000" aria-label="Feedback message"></textarea>',
          '<div id="ff-cc">0 / 5000</div>',
          '<input id="ff-email" type="email" placeholder="Your email (optional)" autocomplete="email" aria-label="Email address" />',
          '<input id="ff-website" type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />',
          '<button id="ff-sub" type="button">Submit</button>',
          '<div id="ff-err" role="alert"></div>',
        '</div>',
        '<div id="ff-foot">Powered by FeedbackFlow</div>',
      '</div>',

      '<div id="ff-ok" role="status">',
        '<div id="ff-ok-ring">' + icon('check', 26, accent) + '</div>',
        '<h4>Thank you!</h4>',
        '<p>Your feedback has been received.<br>We truly appreciate it.</p>',
      '</div>',
    ].join('');

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // ── Refs ─────────────────────────────────────────────────────────────────

    var msgEl      = document.getElementById('ff-msg');
    var emailEl    = document.getElementById('ff-email');
    var websiteEl  = document.getElementById('ff-website');
    var subEl      = document.getElementById('ff-sub');
    var errEl      = document.getElementById('ff-err');
    var ccEl       = document.getElementById('ff-cc');
    var formWrap   = document.getElementById('ff-form-wrap');
    var successEl  = document.getElementById('ff-ok');

    // ── Events ───────────────────────────────────────────────────────────────

    btn.addEventListener('click', openPanel);
    document.getElementById('ff-close').addEventListener('click', closePanel);
    subEl.addEventListener('click', submitFeedback);

    // Character counter + clear error highlight
    msgEl.addEventListener('input', function() {
      var n = msgEl.value.length;
      ccEl.textContent = n + ' / 5000';
      ccEl.className = n >= 4800 ? 'ff-near' : '';
      if (n > 0) msgEl.classList.remove('ff-field-err');
      showError('');
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target) && e.target !== btn) closePanel();
    }, true);

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closePanel();
    });

    function openPanel() {
      panel.classList.add('ff-open');
      // Force re-animation if already played
      panel.style.animation = 'none';
      panel.offsetHeight; // reflow
      panel.style.animation = '';
      msgEl.focus();
    }

    function closePanel() {
      panel.classList.remove('ff-open');
    }

    function showError(msg) {
      errEl.textContent = msg;
      errEl.style.display = msg ? 'block' : 'none';
    }

    function showSuccess() {
      formWrap.style.display = 'none';
      successEl.classList.add('ff-show');
      setTimeout(function() {
        closePanel();
        setTimeout(function() {
          formWrap.style.display = '';
          successEl.classList.remove('ff-show');
          msgEl.value = '';
          emailEl.value = '';
          ccEl.textContent = '0 / 5000';
          subEl.disabled = false;
          subEl.innerHTML = 'Submit';
          subEl.style.opacity = '1';
          subEl.style.cursor = 'pointer';
          msgEl.disabled = false;
          emailEl.disabled = false;
        }, 300);
      }, 2400);
    }

    function submitFeedback() {
      if (isSubmitting) return;

      var message = msgEl.value.trim();
      var email   = emailEl.value.trim();

      if (!message) {
        showError('Please enter a message');
        msgEl.focus();
        return;
      }

      isSubmitting = true;
      errEl.style.display = 'none';
      subEl.innerHTML = '<span class="ff-spin"></span> Sending...';
      subEl.style.opacity = '0.7';
      subEl.style.cursor = 'not-allowed';
      msgEl.disabled = true;
      emailEl.disabled = true;

      var ua = navigator.userAgent;
      var payload = {
        public_key:    publicKey,
        message:       message,
        email:         email || undefined,
        page_url:      window.location.origin + window.location.pathname,
        page_title:    document.title,
        browser:       getBrowser(ua),
        os:            getOS(ua),
        device_type:   getDeviceType(),
        screen_width:  screen.width,
        screen_height: screen.height,
        ff_website:    (websiteEl && websiteEl.value) ? websiteEl.value : undefined,
      };

      var submitPromise = null;
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timeoutId = null;

      if (publicKey === 'preview_key') {
        submitPromise = new Promise(function(resolve) {
          setTimeout(resolve, 800);
        });
      } else {
        if (controller) {
          timeoutId = setTimeout(function() { controller.abort(); }, 10000);
        }
        var fetchOpts = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        };
        if (controller) fetchOpts.signal = controller.signal;

        submitPromise = fetch(baseUrl + '/api/widget/feedback', fetchOpts).then(function(res) {
          if (timeoutId) clearTimeout(timeoutId);
          if (!res.ok) return res.json().then(function(d){ throw new Error(d.error || 'Submission failed'); });
          return res.json();
        });
      }

      submitPromise
        .then(function() {
          showSuccess();
        })
        .catch(function(err) {
          var errorMsg = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Something went wrong. Please try again.');
          showError(errorMsg);
          subEl.innerHTML = 'Submit';
          subEl.style.opacity = '1';
          subEl.style.cursor = 'pointer';
          msgEl.disabled = false;
          emailEl.disabled = false;
        })
        .finally(function() {
          isSubmitting = false;
        });
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function hexAlpha(hex, alpha) {
    try {
      var c = hex.replace('#','');
      if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
      var r = parseInt(c.slice(0,2),16);
      var g = parseInt(c.slice(2,4),16);
      var b = parseInt(c.slice(4,6),16);
      return 'rgba('+r+','+g+','+b+','+alpha+')';
    } catch(e) { return 'transparent'; }
  }

  function icon(name, size, color) {
    var s = size || 16;
    var c = color || 'currentColor';
    var paths = {
      chat:  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      bug:   '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
      question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
      feedback: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
      x:     '<path d="M18 6 6 18M6 6l12 12"/>',
      check: '<polyline points="20 6 9 17 4 12"/>',
    };
    return [
      '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"',
        ' fill="none" stroke="'+c+'" stroke-width="2.5"',
        ' stroke-linecap="round" stroke-linejoin="round"',
        ' aria-hidden="true">',
        paths[name] || paths.chat,
      '</svg>',
    ].join('');
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  } catch (error) {
    console.error('[FeedbackFlow] Failed to initialize widget safely. Host site unharmed.', error);
  }
})();
