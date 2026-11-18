const SUPABASE_URL = "https://wwjhlteacweihhifblnl.supabase.co";
const SUPABASE_KEY = "sb_publishable_NgjeNxdm1gqLRbYjBkMo4w_LKsof79F";
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const formularioShow = document.getElementById("cadastro-show-form");
const mensagemShow = document.getElementById("mensagem-show");
const listaShows = document.getElementById("lista-shows");
const botaoSair = document.getElementById("btn-sair");

//verificar se exxiste usuario
async function verificarUsuario() {
  const { data, error } = await clienteSupabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("usuario-email").textContent = data.user.email;
}

verificarUsuario();

//botao pra sair do lgin
botaoSair.addEventListener("click", async function () {
  const { error } = await clienteSupabase.auth.signOut();

  if (error) {
    alert("Não foi possível encerrar a sessão.");
    return;
  }

  window.location.href = "index.html";
});

//cadastra novos shows
formularioShow.addEventListener("submit", async function (event) {
  event.preventDefault();
  const nome = document.getElementById("nome-show").value.trim();
  const dataShow = document.getElementById("data-show").value;
  const local = document.getElementById("local-show").value.trim();
  const descricao = document.getElementById("descricao-show").value.trim();
  const { data: usuarioData, error: usuarioError } =
    await clienteSupabase.auth.getUser();

  if (usuarioError || !usuarioData.user) {
    mensagemShow.textContent = "Sessão inválida. Faça login novamente.";
    return;
  }

  const { error } = await clienteSupabase.from("shows").insert({
    nome: nome,
    data_show: dataShow,
    local: local,
    descricao: descricao,
    created_by: usuarioData.user.id,
  });

  if (error) {
    console.error(error);
    mensagemShow.textContent = "Erro ao cadastrar o show.";
    mensagemShow.style.color = "red";
  } else {
    mensagemShow.textContent = "Show cadastrado com sucesso!";
    mensagemShow.style.color = "#22c55e";
    formularioShow.reset();
    carregarShows();
  }
});

//mostra os shws existentes no banco de dados
async function carregarShows() {
  const { data: shows, error } = await clienteSupabase
    .from("shows")
    .select("*")
    .order("data_show", { ascending: true });

  if (error) {
    console.error("Erro ao carregar shows:", error);
    return;
  }

  listaShows.innerHTML = "";

  shows.forEach(function (show) {
    const card = document.createElement("div");

    card.className = "show-card";

    const titulo = document.createElement("h4");
    titulo.textContent = show.nome;

    const data = document.createElement("p");
    data.textContent = "Data: " + show.data_show;

    const local = document.createElement("p");
    local.textContent = "Local: " + (show.local || "Não informado");

    card.appendChild(titulo);
    card.appendChild(data);
    card.appendChild(local);

    listaShows.appendChild(card);
  });
}

carregarShows();
