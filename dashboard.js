const SUPABASE_URL = "https://wwjhlteacweihhifblnl.supabase.co";
const SUPABASE_KEY = "sb_publishable_NgjeNxdm1gqLRbYjBkMo4w_LKsof79F";
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const botaoSair = document.getElementById("btn-sair");

async function verificarUsuario() {
  const { data, error } = await clienteSupabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("usuario-email").textContent = data.user.email;
}

verificarUsuario();

botaoSair.addEventListener("click", async function() {

    const { error } = await clienteSupabase.auth.signOut();

    if (error) {
        alert("Não foi possível encerrar a sessão.");
        return;
    }

    window.location.href = "index.html";

});
