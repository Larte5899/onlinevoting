/* =========================================================
   LAINNOV Voting — shared interactions
   - year stamp
   - smooth scroll
   - navbar active + auto-collapse on mobile
   - copy-to-clipboard for USSD codes
   - Online vote form: live total + confirm modal
   - USSD demo: light guardrails (optional)
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

      // One-time confirm handler per show
      confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = 'Processing…';
        try {
          // TODO: Replace with your real checkout call
          await new Promise(r => setTimeout(r, 800));
          modal.hide();
          alert('Payment flow placeholder. Wire to your PSP and backend.');
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = 'Pay';
        }
      };
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
    }
  })();

  // USSD demo light guards
  (function ussdDemoGuards() {
    const msisdn = document.getElementById('msisdnInput');
    const start  = document.getElementById('startSessionBtn');
    if (!msisdn || !start) return;
    start.addEventListener('click', () => {
      const v = (msisdn.value || '').replace(/\D/g, '');
      if (v.length < 10) {
        alert('Enter a valid test number (e.g., 233555123456)');
      }
    });
  })();
})();
