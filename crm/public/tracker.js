(function () {
  try {
    // ── Exclude localhost, loopback, and internal admin pages ───────────────
    var h = (window.location && window.location.hostname) || '';
    var port = (window.location && window.location.port) || '';
    if (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '0.0.0.0' ||
      h === '::1' ||
      h.endsWith('.local') ||
      h.endsWith('.internal') ||
      port === '3000' ||
      port === '5173' ||
      window.location.pathname.startsWith('/admin')
    ) {
      return;
    }

    // ── Session ID ──────────────────────────────────────────────────────────
    var SID = sessionStorage.getItem('_ruid');
    if (!SID) {
      SID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
        return (
          c ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16);
      });
      sessionStorage.setItem('_ruid', SID);
    }

    // ── UTM params ───────────────────────────────────────────────────────────
    var utmKeys = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
    ];
    var utms = {};
    var sp = new URLSearchParams(location.search);
    utmKeys.forEach(function (k) {
      var v = sp.get(k);
      if (v) {
        utms[k.replace('utm_', '')] = v;
        sessionStorage.setItem('_' + k, v);
      }
    });
    // Restore UTMs from session if not in current URL
    if (!utms.source) {
      utmKeys.forEach(function (k) {
        var v = sessionStorage.getItem('_' + k);
        if (v) utms[k.replace('utm_', '')] = v;
      });
    }

    // ── Send helper ──────────────────────────────────────────────────────────
    function send(payload) {
      try {
        var data = Object.assign(
          {
            sessionId: SID,
            pagePath: location.pathname,
            referrer: document.referrer,
            utmSource: utms.source || null,
            utmMedium: utms.medium || null,
            utmCampaign: utms.campaign || null,
          },
          payload
        );
        navigator.sendBeacon('/api/track', JSON.stringify(data));
      } catch (e) {}
    }

    // ── Pageview ─────────────────────────────────────────────────────────────
    send({ eventType: 'pageview' });

    // ── Session start time (for duration) ────────────────────────────────────
    var sessionStart = Date.now();

    // ── Click tracking ────────────────────────────────────────────────────────
    document.addEventListener(
      'click',
      function (e) {
        var el = e.target;
        // Walk up 3 levels to find meaningful element
        for (var i = 0; i < 3; i++) {
          if (!el || el === document.body) break;
          if (el.tagName === 'A' || el.tagName === 'BUTTON') break;
          el = el.parentElement;
        }
        var tag = el ? el.tagName : '';
        var label = (
          (el &&
            (el.getAttribute('aria-label') ||
              el.innerText ||
              el.getAttribute('data-label') ||
              el.className ||
              tag)) ||
          ''
        )
          .trim()
          .slice(0, 80);
        var xPct = ((e.clientX / window.innerWidth) * 100).toFixed(1);
        var yPct = (
          ((e.clientY + window.scrollY) /
            Math.max(document.body.scrollHeight, 1)) *
          100
        ).toFixed(1);

        // Call click
        var anchor = el && el.closest ? el.closest('a[href^="tel:"]') : null;
        if (!anchor && el && el.tagName === 'A' && el.href && el.href.startsWith('tel:'))
          anchor = el;
        if (anchor) {
          send({ eventType: 'call', label: 'Phone Call' });
          return;
        }

        // Outbound link
        if (
          tag === 'A' &&
          el.href &&
          el.hostname &&
          el.hostname !== location.hostname
        ) {
          send({
            eventType: 'outbound_link',
            label: el.href.slice(0, 120),
            element: label,
          });
          return;
        }

        // Nav click
        var isNav = el && (el.closest('nav') || el.closest('header'));
        if (isNav) {
          send({
            eventType: 'nav_click',
            label: label,
            xPct: parseFloat(xPct),
            yPct: parseFloat(yPct),
          });
          return;
        }

        // Button / CTA click
        if (tag === 'BUTTON' || tag === 'A') {
          send({
            eventType: 'button_click',
            label: label,
            element: tag,
            xPct: parseFloat(xPct),
            yPct: parseFloat(yPct),
          });
          return;
        }

        // Generic click (heatmap)
        send({
          eventType: 'click',
          element: label,
          xPct: parseFloat(xPct),
          yPct: parseFloat(yPct),
        });
      },
      { passive: true }
    );

    // ── Scroll depth — report at 25/50/75/90/100% ─────────────────────────
    var reported = {};
    var scrollTicking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (!scrollTicking) {
          window.requestAnimationFrame(function () {
            var pct = Math.round(
              ((window.scrollY + window.innerHeight) /
                Math.max(document.body.scrollHeight, 1)) *
                100
            );
            [25, 50, 75, 90, 100].forEach(function (t) {
              if (pct >= t && !reported[t]) {
                reported[t] = 1;
                send({ eventType: 'scroll', scrollPct: t });
              }
            });
            scrollTicking = false;
          });
          scrollTicking = true;
        }
      },
      { passive: true }
    );

    // ── Form tracking ────────────────────────────────────────────────────────
    var formStarted = {};
    document.addEventListener(
      'focusin',
      function (e) {
        var form = e.target && e.target.closest ? e.target.closest('form') : null;
        if (!form) return;
        var fid =
          form.id ||
          form.getAttribute('name') ||
          form.className.split(' ')[0] ||
          'form';
        if (!formStarted[fid]) {
          formStarted[fid] = 1;
          send({ eventType: 'form_start', label: fid, element: fid });
        }
      },
      { passive: true }
    );

    document.addEventListener(
      'submit',
      function (e) {
        var form = e.target;
        if (!form) return;
        var fid =
          form.id ||
          form.getAttribute('name') ||
          form.className.split(' ')[0] ||
          'form';
        send({ eventType: 'form_submit', label: fid, element: fid });
      },
      { passive: true }
    );

    // ── Session end (duration) ───────────────────────────────────────────────
    function sendSessionEnd() {
      var dur = Date.now() - sessionStart;
      send({
        eventType: 'session_end',
        durationMs: dur,
        label: Math.round(dur / 1000) + 's',
      });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') sendSessionEnd();
    });

    // ── Tab / focus switch ───────────────────────────────────────────────────
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        send({ eventType: 'tab_switch', label: 'tab_hidden' });
      }
    });
  } catch (e) {}
})();
