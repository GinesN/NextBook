import { createClient } from '@supabase/supabase-js';

const config = window.NEXTBOOK_AUTH || {};
const loginView = document.querySelector('#login-view');
const privateView = document.querySelector('#private-view');
const form = document.querySelector('#login-form');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const message = document.querySelector('#login-message');
const submitButton = document.querySelector('#login-button');
const toggleButton = document.querySelector('#toggle-password');
const logoutButton = document.querySelector('#logout-button');
let authClient;
let sessionCheck = 0;

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}
function showLogin() {
  privateView.hidden = true;
  loginView.hidden = false;
  passwordInput.value = '';
}
async function verifyAccess() {
  const check = ++sessionCheck;
  showLogin();
  const { data, error } = await authClient.auth.getUser();
  if (check !== sessionCheck) return false;
  if (error) {
    if (error.name === 'AuthSessionMissingError') return false;
    throw error;
  }
  if (!data.user) return false;
  const membership = await authClient.from('bookstore_memberships')
    .select('bookstore_slug,bookstore_name').eq('bookstore_slug', 'carlin-la-reina').maybeSingle();
  if (check !== sessionCheck) return false;
  if (membership.error) throw new Error('No se ha podido comprobar el acceso a tu librería. Inténtalo de nuevo.');
  if (!membership.data) {
    await authClient.auth.signOut({ scope: 'local' });
    setMessage('Esta cuenta no tiene una librería activada.');
    return false;
  }
  document.querySelector('#dashboard-title').textContent = membership.data.bookstore_name;
  document.querySelector('#access-status').textContent = '';
  loginView.hidden = true;
  privateView.hidden = false;
  passwordInput.value = '';
  return true;
}
async function initializeAuth() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('El acceso seguro está pendiente de activación.');
  authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, {
      ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000),
    }) },
  });
  authClient.auth.onAuthStateChange((event, session) => {
    if (!session) { sessionCheck++; showLogin(); return; }
    if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
      // Supabase auth callbacks run under its session lock. Check after returning.
      setTimeout(() => void verifyAccess().catch(() => setMessage('No se ha podido comprobar el acceso. Inténtalo de nuevo.')), 0);
    }
  });
  await verifyAccess();
  submitButton.disabled = false;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!authClient || submitButton.disabled || !form.reportValidity()) return;
  submitButton.disabled = true;
  setMessage('Comprobando credenciales…');
  try {
    const { error } = await authClient.auth.signInWithPassword({
      email: emailInput.value.trim().toLowerCase(), password: passwordInput.value,
    });
    if (error) { setMessage('El correo o la contraseña no son correctos.'); return; }
    if (await verifyAccess()) setMessage('Acceso correcto.', 'success');
  } catch {
    showLogin();
    setMessage('No se ha podido conectar con el acceso seguro. Inténtalo de nuevo.');
  } finally { submitButton.disabled = false; passwordInput.value = ''; }
});
toggleButton.addEventListener('click', () => {
  const reveal = passwordInput.type === 'password';
  passwordInput.type = reveal ? 'text' : 'password';
  toggleButton.textContent = reveal ? 'Ocultar' : 'Mostrar';
  toggleButton.setAttribute('aria-label', reveal ? 'Ocultar contraseña' : 'Mostrar contraseña');
});
logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    const { error } = await authClient.auth.signOut({ scope: 'local' });
    if (error) throw error;
    sessionCheck++;
    showLogin();
    setMessage('Sesión cerrada.');
  } catch { document.querySelector('#access-status').textContent = 'No se ha podido cerrar la sesión. Comprueba la conexión y vuelve a intentarlo.'; }
  finally { logoutButton.disabled = false; }
});
initializeAuth().catch(() => {
  showLogin();
  submitButton.disabled = !authClient;
  setMessage('No se ha podido comprobar la sesión. Puedes volver a intentarlo.');
});
