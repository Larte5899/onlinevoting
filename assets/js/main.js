/* =========================================================
   LAINNOV Voting — shared interactions
   - year stamp
   - smooth scroll
   - navbar active + auto-collapse on mobile
   - copy-to-clipboard for USSD codes
   - Online vote form: live total + confirm modal
   - USSD demo: full simulator (mock or live endpoint)
   ========================================================= */

(function () {
  // Year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Smooth scroll for same-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close navbar on mobile after jump
        const nav = document.getElementById('navMain');
        if (nav && nav.classList.contains('show')) {
          new bootstrap.Collapse(nav).hide();
        }
      }
    });
  });

  // Navbar: mark current page active if not explicitly set
  (function setActiveNav() {
    const path = location.pathname.replace(/\/+$/, '');
    document.querySelectorAll('.navbar .nav-link').forEach(link => {
      try {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        const url = new URL(href, location.origin);
        if (url.pathname.replace(/\/+$/, '') === path) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
      } catch {}
    });
  })();

  // Navbar: collapse on link click (mobile)
  document.querySelectorAll('.navbar .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const nav = document.getElementById('navMain');
      if (nav && nav.classList.contains('show')) {
        new bootstrap.Collapse(nav).hide();
      }
    });
  });

  // Copy USSD code buttons
  function wireCopy(btnId, codeId) {
    const btn = document.getElementById(btnId);
    const code = document.getElementById(codeId);
    if (!btn || !code) return;
    btn.addEventListener('click', async () => {
      const text = code.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i>';
        btn.classList.add('btn-success');
        setTimeout(() => { btn.innerHTML = original; btn.classList.remove('btn-success'); }, 1200);
      } catch {
        alert('Could not copy. Long-press to copy manually.');
      }
    });
  }
  wireCopy('copyCodeBtn', 'ussdCodeText');
  wireCopy('copyCodeBtn2', 'ussdCodeTextPillars');

  // Online voting form
  (function setupOnlineForm() {
    const form = document.getElementById('onlineVoteForm');
    if (!form) return;

    const unitPrice = Number(form.dataset.price || '0.50');
    const votesEl   = document.getElementById('votes');
    const totalEl   = document.getElementById('total');
    const idEl      = document.getElementById('voterId');
    const codeEl    = document.getElementById('nomineeCode');

    const confirmModalEl = document.getElementById('confirmModal');
    const confirmBody    = document.getElementById('confirmBody');
    const confirmBtn     = document.getElementById('confirmPayBtn');
    const modal          = new bootstrap.Modal(confirmModalEl);

    function updateTotal() {
      const n = Math.max(0, parseInt(votesEl.value || '0', 10));
      totalEl.value = (n * unitPrice).toFixed(2);
    }
    votesEl.addEventListener('input', updateTotal);
    updateTotal();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;

      const payload = {
        voterId: (idEl.value || '').trim(),
        nomineeCode: (codeEl.value || '').trim().toUpperCase(),
        votes: Math.max(1, parseInt(votesEl.value, 10) || 1),
        total: Number(totalEl.value || '0')
      };

      confirmBody.innerHTML = `
        <div class="d-flex flex-column gap-2">
          <div><strong>Voter:</strong> ${escapeHtml(payload.voterId)}</div>
          <div><strong>Nominee Code:</strong> <code>${escapeHtml(payload.nomineeCode)}</code></div>
          <div><strong>Votes:</strong> ${payload.votes}</div>
          <div class="fs-5"><strong>Total (GHS):</strong> ${payload.total.toFixed(2)}</div>
          <div class="text-muted small">* Hook your PSP here (Paystack, Flutterwave, etc.).</div>
        </div>
      `;
      modal.show();

      confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = 'Processing…';
        try {
          await new Promise(r => setTimeout(r, 800)); // stub
          modal.hide();
          alert('Payment flow placeholder. Wire to your PSP and backend.');
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = 'Pay';
        }
      };
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
  })();

  /* ============================
     USSD DEMO — FULL SIMULATOR
     ============================ */
  (function ussdSimulator() {
    // Elements
    const endpointEl = document.getElementById('endpointUrl');
    const codeEl     = document.getElementById('serviceCodeInput');
    const msisdnEl   = document.getElementById('msisdnInput');

    const startBtn   = document.getElementById('startSessionBtn');
    const resetBtn   = document.getElementById('resetSessionBtn');
    const sendBtn    = document.getElementById('sendReplyBtn');

    const replyEl    = document.getElementById('userReply');
    const displayEl  = document.getElementById('ussdDisplay');

    const sessIdEl   = document.getElementById('sessId');
    const statusBdge = document.getElementById('statusBadge');

    if (!startBtn || !sendBtn || !displayEl) return; // not on this page

    // State
    let sessionId = '';
    let textChain = '';   // "1*2*CODE"
    let active    = false;

    function setStatus(state) {
      const cls = {
        idle: 'bg-secondary',
        active: 'bg-success',
        ended: 'bg-dark',
        error: 'bg-danger'
      };
      statusBdge.className = 'badge ' + (cls[state] || 'bg-secondary');
      statusBdge.textContent = state;
    }

    function resetUI() {
      active = false;
      sessionId = '';
      textChain = '';
      displayEl.value = '';
      replyEl.value = '';
      replyEl.disabled = true;
      sendBtn.disabled = true;
      sessIdEl.textContent = '—';
      setStatus('idle');
    }

    function startUI() {
      active = true;
      replyEl.disabled = false;
      sendBtn.disabled = false;
      replyEl.focus();
      setStatus('active');
    }

    function write(msg, replace=false) {
      const cleaned = String(msg || '').replace(/^\s+|\s+$/g, '');
      displayEl.value = replace ? cleaned : (displayEl.value ? displayEl.value + '\n' + cleaned : cleaned);
      displayEl.scrollTop = displayEl.scrollHeight;
    }

    function encodeForm(obj) {
      return Object.entries(obj)
        .map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');
    }

    // ---- MOCK FLOW (when no endpoint set)
    function mockFlow(text) {
      // text = '1*CODE*5*1'
      const parts = text ? text.split('*') : [];
      const step1 = parts[0] || ''; // menu pick

      if (!text) {
        return 'CON What would you like to do\n1. Vote by code\n2. Help';
      }

      if (step1 === '1') {
        if (parts.length === 1) {
          return 'CON Enter Nominee Code';
        }
        if (parts.length === 2) {
          return 'CON Enter number of votes';
        }
        if (parts.length === 3) {
          const code = parts[1].toUpperCase();
          const votes = parseInt(parts[2], 10) || 1;
          return `CON Confirm\nNominee: ${code}\nVotes: ${votes}\n1. Confirm\n2. Cancel`;
        }
        if (parts.length >= 4) {
          const choice = parts[3];
          if (choice === '1') {
            return 'END Thank you. Your vote was recorded (mock).';
          }
          return 'END Cancelled.';
        }
      }

      if (step1 === '2') {
        return 'END Help: Dial again, pick 1, enter nominee code and votes.';
      }

      return 'CON Invalid option\n1. Vote by code\n2. Help';
    }

    async function callServer(currentText) {
      const endpoint = (endpointEl?.value || '').trim();
      const serviceCode = (codeEl?.value || '*928*303#').trim();
      const phoneNumber = (msisdnEl?.value || '').trim();

      if (!endpoint) {
        // local mock
        return mockFlow(currentText);
      }

      // live call
      const body = encodeForm({
        sessionId,
        serviceCode,
        phoneNumber,
        text: currentText
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      // Some USSD backends return text/plain; avoid .json()
      const txt = await res.text();
      return txt;
    }

    function handleResponse(raw) {
      // Expect "CON ..." or "END ..."
      const isCon = /^CON\b/i.test(raw);
      const isEnd = /^END\b/i.test(raw);
      const content = String(raw).replace(/^(CON|END)\s*/i, '');

      if (isCon) {
        write(content, true);
      } else if (isEnd) {
        write(content, true);
        active = false;
        replyEl.disabled = true;
        sendBtn.disabled = true;
        setStatus('ended');
      } else {
        // Graceful fallback if backend forgot prefix
        write(raw, true);
      }
    }

    // Start session
    startBtn.addEventListener('click', async () => {
      // Basic number check (won’t block; just a nudge)
      const v = (msisdnEl.value || '').replace(/\D/g, '');
      if (v.length < 10) {
        alert('Enter a valid test number (e.g., 233555123456)');
      }

      resetUI();
      sessionId = 'SIM-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
      sessIdEl.textContent = sessionId;

      try {
        startUI();
        // Initial request uses empty text
        const resp = await callServer('');
        handleResponse(resp);
      } catch (e) {
        setStatus('error');
        write('END Network error / CORS blocked. Tip: enable CORS on your PHP or leave endpoint empty to use the mock.', true);
        active = false;
        replyEl.disabled = true;
        sendBtn.disabled = true;
      }
    });

    // Send reply
    async function sendReply() {
      if (!active) return;
      const ans = (replyEl.value || '').trim();
      if (!ans) return;

      // Build USSD aggregator "1*2*3"
      textChain = textChain ? (textChain + '*' + ans) : ans;
      replyEl.value = '';

      try {
        const resp = await callServer(textChain);
        handleResponse(resp);

        // If session ended, freeze chain; else keep growing
        if (/^END\b/i.test(resp)) {
          active = false;
        }
      } catch (e) {
        setStatus('error');
        write('END Network error / CORS blocked. Tip: enable CORS on your PHP or use the mock (clear endpoint).', true);
        active = false;
      }
    }

    sendBtn.addEventListener('click', sendReply);
    replyEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendReply();
      }
    });

    // Reset
    resetBtn.addEventListener('click', resetUI);

    // Init
    resetUI();
  })();
})();
