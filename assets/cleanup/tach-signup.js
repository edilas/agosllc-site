(() => {
  const form = document.getElementById('tach-signup');
  if (!form) return;
  const status = document.getElementById('signup-status');
  const fallback = document.getElementById('signup-fallback');
  const emailLink = document.getElementById('signup-email-link');
  const button = form.querySelector('button[type="submit"]');
  let submitting = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    submitting = true;
    button.disabled = true;
    button.textContent = 'Sending request…';
    fallback.hidden = true;
    status.dataset.kind = '';
    status.textContent = 'Sending your launch notification request…';
    const email = form.elements.email.value.trim();
    const body = `Please notify me at ${email} when TACH launches. I consent to a TACH launch notification email only. Please use this address only for my launch notification request.`;
    emailLink.href = '/contact/?topic=waitlist&subject=TACH%20iPhone%20launch%20notification%20request';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('https://agos-contact.ed-83e.workers.dev/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        signal: controller.signal,
        body: JSON.stringify({
          name: 'TACH launch notification request',
          email,
          topic: 'TACH',
          message: body,
          company: form.elements.company.value
        })
      });
      if (!response.ok) throw new Error('Request failed');
      const result = await response.json();
      if (!result || result.success === false || result.ok === false || result.error) throw new Error('Request failed');
      form.reset();
      status.dataset.kind = 'success';
      status.textContent = 'Your request reached the studio. We’ll email you when TACH launches.';
    } catch {
      status.dataset.kind = 'error';
      status.textContent = 'Your request could not be sent. Use the contact form link below to send your request to the studio.';
      fallback.hidden = false;
    } finally {
      clearTimeout(timeout);
      submitting = false;
      button.disabled = false;
      button.textContent = 'Notify me at launch';
    }
  });
})();
