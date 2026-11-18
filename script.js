const formulario = document.getElementById("login-form");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const mensagemLogin = document.getElementById("mensagem-login");

const SUPABASE_URL = "https://wwjhlteacweihhifblnl.supabase.co";
const SUPABASE_KEY = "sb_publishable_NgjeNxdm1gqLRbYjBkMo4w_LKsof79F";
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


//validação de usuario
formulario.addEventListener("submit", async function (event) {
  event.preventDefault();
  const email = campoEmail.value.trim();
  const senha = campoSenha.value;
  if (email === "" || senha === "") {
    mensagemLogin.textContent = "Preencha todos os campos.";
    mensagemLogin.style.color = "red";
    return;
  }
  mensagemLogin.textContent = "Verificando acesso...";
  mensagemLogin.style.color = "white";
  const { data, error } = await clienteSupabase.auth.signInWithPassword({
    email: email,
    password: senha,
  });
  if (error) {
    mensagemLogin.textContent = "E-mail ou senha incorretos.";
    mensagemLogin.style.color = "red";
  } else {
    mensagemLogin.textContent = "Login realizado com sucesso!";
    mensagemLogin.style.color = "green";
    window.location.href = "dashboard.html";
  }
});
