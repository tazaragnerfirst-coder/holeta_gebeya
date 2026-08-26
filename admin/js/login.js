const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const btn = document.getElementById('login-btn');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

// If already signed in with a valid admin claim, skip straight to
// the dashboard instead of showing the login form again.
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const token = await user.getIdTokenResult();
  if (token.claims.isAdmin) window.location.replace('dashboard.html');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const token = await cred.user.getIdTokenResult();
    if (!token.claims.isAdmin) {
      await auth.signOut();
      showError('This account is not set up as an admin. Ask for the isAdmin claim to be granted first.');
      return;
    }
    window.location.replace('dashboard.html');
  } catch (err) {
    showError(err.message || 'Sign in failed. Check your email and password.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});
