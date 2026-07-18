const errorBox = document.getElementById('errorBox');
const infoBox = document.getElementById('infoBox');
const forgotForm = document.getElementById('forgotForm');
const submitBtn = document.getElementById('submitBtn');

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');
  infoBox.classList.add('hidden');

  const email = document.getElementById('email').value.trim();
  if (!email) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const data = await api.post('/auth/forgot-password', { email });
    infoBox.textContent = data.message || 'If that email is registered, a password reset link has been sent.';
    infoBox.classList.remove('hidden');
    forgotForm.reset();
  } catch (err) {
    errorBox.textContent = err.message || 'Something went wrong. Please try again.';
    errorBox.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send reset link';
  }
});
