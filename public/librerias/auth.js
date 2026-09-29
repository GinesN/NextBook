const AUTHORIZED_EMAIL = "ginesnavarro2006@gmail.com";
const config = window.NEXTBOOK_AUTH || {};
const loginView = document.querySelector("#login-view");
const privateView = document.querySelector("#private-view");
const form = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const message = document.querySelector("#login-message");
const submitButton = document.querySelector("#login-button");
const toggleButton = document.querySelector("#toggle-password");
const logoutButton = document.querySelector("#logout-button");

let authClient;

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}

function showPrivateArea() {
  loginView.hidden = true;
  privateView.hidden = false;
}

function showLogin() {
  privateView.hidden = true;
  loginView.hidden = false;
  passwordInput.value = "";
}

async function initializeAuth() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    setMessage("El acceso seguro está pendiente de activación.");
    form.querySelectorAll("input, button[type='submit']").forEach((element) => element.disabled = true);
    return;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  const { data } = await authClient.auth.getSession();
  const sessionEmail = data.session?.user?.email?.toLowerCase();
  if (sessionEmail === AUTHORIZED_EMAIL) showPrivateArea();
  else if (data.session) await authClient.auth.signOut();

  authClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.email?.toLowerCase() === AUTHORIZED_EMAIL) showPrivateArea();
    else showLogin();
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!authClient) return;

  const email = emailInput.value.trim().toLowerCase();
  if (email !== AUTHORIZED_EMAIL) {
    setMessage("El correo o la contraseña no son correctos.");
    return;
  }

  submitButton.disabled = true;
  setMessage("Comprobando credenciales…");
  const { data, error } = await authClient.auth.signInWithPassword({ email, password: passwordInput.value });
  submitButton.disabled = false;

  if (error || data.user?.email?.toLowerCase() !== AUTHORIZED_EMAIL) {
    if (data.session) await authClient.auth.signOut();
    setMessage("El correo o la contraseña no son correctos.");
    return;
  }

  setMessage("Acceso correcto.", "success");
  showPrivateArea();
});

toggleButton.addEventListener("click", () => {
  const reveal = passwordInput.type === "password";
  passwordInput.type = reveal ? "text" : "password";
  toggleButton.textContent = reveal ? "Ocultar" : "Mostrar";
  toggleButton.setAttribute("aria-label", reveal ? "Ocultar contraseña" : "Mostrar contraseña");
});

logoutButton.addEventListener("click", async () => {
  if (authClient) await authClient.auth.signOut();
  showLogin();
});

initializeAuth().catch(() => setMessage("No se ha podido iniciar el acceso seguro. Inténtalo más tarde."));
