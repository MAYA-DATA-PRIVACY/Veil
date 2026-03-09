(function () {
  'use strict';

  /* ─────────────────────────────────
     Mobile nav toggle
  ───────────────────────────────── */
  var navToggle = document.querySelector('.nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ─────────────────────────────────
     Browser demo animation
  ───────────────────────────────── */
  var bw = document.getElementById('browser-demo');
  if (!bw) return;

  // ── PII colours exactly matching the extension's getTypeColor() ──
  var PII_COLORS = {
    PERSON:       '#D32F2F',
    EMAIL:        '#0288D1',
    PHONE:        '#00796B',
    ADDRESS:      '#EF6C00',
    SSN:          '#C2185B',
    DOB:          '#8E24AA',
    LOCATION:     '#2E7D32',
    ORGANIZATION: '#3949AB'
  };

  // ── Scene definitions ──────────────────────────────────────────
  var SCENES = [
    {
      platform:   'chatgpt',
      tabTitle:   'ChatGPT',
      url:        'chatgpt.com',
      favicon:    faviconChatGPT(),
      aiElId:     'chatgpt-ai',
      typingElId: 'chatgpt-typing',
      composeId:  'chatgpt-compose',
      aiMsg:      'Of course — what changes need to be made to the contract?',
      segments: [
        { t: 'Please review the contract for ' },
        { t: 'Dr. Sarah Chen',        label: 'PERSON',  color: PII_COLORS.PERSON  },
        { t: ', date of birth ' },
        { t: '03/15/1984',            label: 'DOB',     color: PII_COLORS.DOB     },
        { t: '. Her email is ' },
        { t: 'sarah.chen@lawfirm.io', label: 'EMAIL',   color: PII_COLORS.EMAIL   },
        { t: '.' }
      ]
    },
    {
      platform:   'gemini',
      tabTitle:   'Gemini',
      url:        'gemini.google.com',
      favicon:    faviconGemini(),
      aiElId:     'gemini-ai',
      typingElId: 'gemini-typing',
      composeId:  'gemini-compose',
      aiMsg:      'I can help with that summary. What format works best for you?',
      segments: [
        { t: 'Summarise the records for patient ' },
        { t: 'James Morrison',          label: 'PERSON',  color: PII_COLORS.PERSON  },
        { t: ', SSN ' },
        { t: '442-71-9023',             label: 'SSN',     color: PII_COLORS.SSN     },
        { t: ', residing at ' },
        { t: '847 Oak Street, Portland',label: 'ADDRESS', color: PII_COLORS.ADDRESS },
        { t: '.' }
      ]
    },
    {
      platform:   'claude',
      tabTitle:   'Claude',
      url:        'claude.ai',
      favicon:    faviconClaude(),
      aiElId:     'claude-ai',
      typingElId: 'claude-typing',
      composeId:  'claude-compose',
      aiMsg:      'Happy to draft that. Should I keep the tone formal, matching your previous thread?',
      segments: [
        { t: 'Write an email to ' },
        { t: 'Michael Torres',   label: 'PERSON', color: PII_COLORS.PERSON },
        { t: ' at ' },
        { t: 'm.torres@acme.com',label: 'EMAIL',  color: PII_COLORS.EMAIL  },
        { t: ', cc his manager at ' },
        { t: '(212) 555-0147',   label: 'PHONE',  color: PII_COLORS.PHONE  },
        { t: '.' }
      ]
    }
  ];

  // ── DOM handles ───────────────────────────────────────────────
  var bwFav       = document.getElementById('bw-fav');
  var bwTabTitle  = document.getElementById('bw-tab-title');
  var bwUrl       = document.getElementById('bw-url');
  var bwExtBadge  = document.getElementById('bw-ext-badge');
  var veilPill    = document.getElementById('veil-scanning');
  var veilBar     = document.getElementById('veil-action-bar');
  var vabCount    = document.getElementById('vab-count');
  var vabTimer    = document.getElementById('vab-timer');

  // Animation cancellation token
  var animToken = 0;

  function wait(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  // ── Platform view switching ────────────────────────────────────
  function switchPlatform(nextIdx) {
    return new Promise(function (resolve) {
      var platforms = bw.querySelectorAll('.bw-platform');
      var nextEl    = document.getElementById('plat-' + SCENES[nextIdx].platform);

      // Fade in next
      nextEl.style.opacity = '0';
      nextEl.style.display = 'flex';

      // Short rAF to let display:flex paint
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          // Fade out current
          platforms.forEach(function (p) {
            if (p.classList.contains('active')) {
              p.style.transition = 'opacity 0.3s ease';
              p.style.opacity = '0';
              setTimeout(function () {
                p.classList.remove('active');
                p.style.display = '';
                p.style.opacity = '';
                p.style.transition = '';
              }, 320);
            }
          });

          // Fade in next
          nextEl.classList.add('active');
          nextEl.style.transition = 'opacity 0.35s ease';
          nextEl.style.opacity = '1';
          setTimeout(function () {
            nextEl.style.transition = '';
            resolve();
          }, 360);
        });
      });
    });
  }

  // ── Position Veil overlays above the active compose area ──────
  function positionVeilUI(composeId) {
    var compose = document.getElementById(composeId);
    if (!compose) return;
    var rect    = compose.getBoundingClientRect();
    var vp      = bw.querySelector('.bw-viewport').getBoundingClientRect();

    var relTop   = rect.top  - vp.top;
    var relLeft  = rect.left - vp.left;
    var relRight = vp.right  - rect.right;

    // Scanning pill: top-left of compose area
    veilPill.style.top  = (relTop - 36) + 'px';
    veilPill.style.left = relLeft + 12 + 'px';

    // Action bar: above the input, full width minus padding
    veilBar.style.top   = (relTop - 40) + 'px';
    veilBar.style.left  = relLeft + 12 + 'px';
    veilBar.style.right = relRight + 12 + 'px';
    veilBar.style.width = '';
  }

  // ── Main scene runner ─────────────────────────────────────────
  async function runScene(idx) {
    var token = ++animToken;
    var scene = SCENES[idx];

    // 1 ── Switch platform view
    await switchPlatform(idx);
    if (animToken !== token) return;

    // 2 ── Update browser chrome
    if (bwFav) bwFav.innerHTML = scene.favicon;
    if (bwTabTitle) bwTabTitle.textContent = scene.tabTitle;

    // Animate URL bar change
    if (bwUrl) {
      bwUrl.style.opacity = '0';
      await wait(100);
      if (animToken !== token) return;
      bwUrl.textContent = scene.url;
      bwUrl.style.opacity = '1';
    }

    // 3 ── Update AI message
    var aiEl = document.getElementById(scene.aiElId);
    if (aiEl) {
      aiEl.style.opacity = '0';
      await wait(150);
      if (animToken !== token) return;
      aiEl.textContent = scene.aiMsg;
      aiEl.style.transition = 'opacity 0.3s ease';
      aiEl.style.opacity    = '1';
      setTimeout(function () { if (aiEl) aiEl.style.transition = ''; }, 350);
    }

    // 4 ── Reset input
    var typingEl = document.getElementById(scene.typingElId);
    if (!typingEl) return;
    typingEl.innerHTML = '';
    typingEl.style.opacity = '1';

    // Reset Veil UI
    veilPill.classList.remove('visible');
    veilBar.classList.remove('visible');
    if (bwExtBadge) bwExtBadge.classList.remove('active');

    // Position overlays
    positionVeilUI(scene.composeId);

    await wait(600);
    if (animToken !== token) return;

    // 5 ── Typewriter: build each segment
    var piiSpans = [];

    for (var i = 0; i < scene.segments.length; i++) {
      if (animToken !== token) return;
      var seg = scene.segments[i];

      if (seg.label) {
        // PII segment — create a live span
        var span = document.createElement('span');
        span.className = 'pii-span-live';
        span.style.setProperty('--pii-c', seg.color);
        span.dataset.label = seg.label;
        span.dataset.color = seg.color;
        typingEl.appendChild(span);

        for (var c = 0; c < seg.t.length; c++) {
          if (animToken !== token) return;
          span.textContent += seg.t[c];
          await wait(44);
        }
        piiSpans.push(span);

      } else {
        // Plain text
        var node = document.createTextNode('');
        typingEl.appendChild(node);
        for (var c = 0; c < seg.t.length; c++) {
          if (animToken !== token) return;
          node.textContent += seg.t[c];
          await wait(28);
        }
      }
    }

    // 6 ── Typing done — show scanning pill
    await wait(350);
    if (animToken !== token) return;

    positionVeilUI(scene.composeId);
    veilPill.classList.add('visible');

    // 7 ── Scanning animation runs for ~1.2s
    await wait(1200);
    if (animToken !== token) return;

    // 8 ── Detections appear — staggered wavy underlines
    veilPill.classList.remove('visible');

    for (var s = 0; s < piiSpans.length; s++) {
      if (animToken !== token) return;
      piiSpans[s].classList.add('detected');
      await wait(160);
    }

    // Veil extension icon in toolbar lights up
    if (bwExtBadge) bwExtBadge.classList.add('active');

    // 9 ── Show action bar with detection count
    await wait(200);
    if (animToken !== token) return;

    var n = piiSpans.length;
    vabCount.textContent = n + ' item' + (n !== 1 ? 's' : '') + ' detected';
    vabTimer.textContent = 'Auto-redacting…';
    veilBar.classList.add('visible');

    // 10 ── Brief hold (simulate the 1.2s auto-redact delay from the real extension)
    await wait(1400);
    if (animToken !== token) return;

    vabTimer.textContent = '';

    // 11 ── Auto-redact: each span transforms into a badge
    for (var s = 0; s < piiSpans.length; s++) {
      if (animToken !== token) return;
      var sp = piiSpans[s];

      // Flash
      sp.classList.add('redacting');
      await wait(75);
      if (animToken !== token) return;

      // Replace text + apply badge style
      sp.textContent = '[' + sp.dataset.label + ' REDACTED]';
      sp.classList.remove('detected', 'redacting');
      sp.classList.add('redacted');

      await wait(220);
    }

    // 12 ── Update action bar to "done" state
    if (animToken !== token) return;
    vabCount.textContent = '✓  ' + n + ' item' + (n !== 1 ? 's' : '') + ' redacted';
    vabTimer.textContent = '';

    // 13 ── Hold the finished state
    await wait(2400);
    if (animToken !== token) return;

    // 14 ── Fade out input text + hide bars
    typingEl.style.transition = 'opacity 0.3s ease';
    typingEl.style.opacity    = '0';
    veilBar.classList.remove('visible');
    if (bwExtBadge) bwExtBadge.classList.remove('active');

    await wait(380);
    if (animToken !== token) return;

    typingEl.style.opacity    = '1';
    typingEl.style.transition = '';

    // 15 ── Next platform
    runScene((idx + 1) % SCENES.length);
  }

  // ── Kick off ──────────────────────────────────────────────────
  runScene(0);

  // ── Favicon helpers ───────────────────────────────────────────
  function faviconChatGPT() {
    return '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="16" height="16" rx="4" fill="#000"/>'
      + '<circle cx="8" cy="8" r="4.5" stroke="rgba(255,255,255,0.85)" stroke-width="1.2" fill="none"/>'
      + '<circle cx="8" cy="8" r="1.6" fill="rgba(255,255,255,0.9)"/>'
      + '</svg>';
  }

  function faviconGemini() {
    return '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="16" height="16" rx="4" fill="#1B1B1B"/>'
      + '<path d="M8 2C8 5.31 8 8 8 8C8 8 10.69 8 14 8C10.69 8 8 8 8 8C8 8 8 10.69 8 14C8 10.69 8 8 8 8C8 8 5.31 8 2 8C5.31 8 8 8 8 8C8 8 8 5.31 8 2Z" fill="url(#fg)"/>'
      + '<defs><linearGradient id="fg" x1="2" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse"><stop stop-color="#4285F4"/><stop offset="1" stop-color="#DB4437"/></linearGradient></defs>'
      + '</svg>';
  }

  function faviconClaude() {
    return '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="16" height="16" rx="4" fill="#D97757"/>'
      + '<path d="M8 3L12 13H4L8 3Z" fill="rgba(255,255,255,0.9)"/>'
      + '<path d="M8 7.5L10 13H6L8 7.5Z" fill="#D97757"/>'
      + '</svg>';
  }

})();
