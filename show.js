const SUPABASE_URL = "https://wwjhlteacweihhifblnl.supabase.co";
const SUPABASE_KEY = "sb_publishable_NgjeNxdm1gqLRbYjBkMo4w_LKsof79F";
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Identifica o show pelo endereço da página
const parametros = new URLSearchParams(window.location.search);
const idShow = parametros.get("id");

// Elementos da página
const nomeShow = document.getElementById("nome-show");
const dataShow = document.getElementById("data-show");
const localShow = document.getElementById("local-show");
const descricaoShow = document.getElementById("descricao-show");
const mensagemShow = document.getElementById("mensagem-show");

// Botão para voltar ao Dashboard
document.getElementById("btn-voltar").addEventListener("click", function () {
  window.location.href = "dashboard.html";
});

// Busca os dados do show
async function carregarShow() {
  const { data: usuarioData, error: usuarioError } =
    await clienteSupabase.auth.getUser();

  if (usuarioError || !usuarioData.user) {
    window.location.href = "index.html";
    return;
  }

  if (!idShow) {
    mensagemShow.textContent = "Nenhum show foi selecionado.";
    return;
  }

  mensagemShow.textContent = "Carregando informações...";

  const { data: show, error } = await clienteSupabase
    .from("shows")
    .select("*")
    .eq("id", idShow)
    .single();

  if (error) {
    console.error("Erro ao carregar show:", error);
    mensagemShow.textContent = "Não foi possível carregar este show.";
    return;
  }

  nomeShow.textContent = show.nome;

  dataShow.textContent =
    "Data: " +
    new Date(show.data_show + "T00:00:00").toLocaleDateString("pt-BR");

  localShow.textContent = "Local: " + (show.local || "Não informado");

  descricaoShow.textContent =
    "Descrição: " + (show.descricao || "Não informada");

  mensagemShow.textContent = "";
}

carregarShow();
