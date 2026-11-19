const SUPABASE_URL = "https://wwjhlteacweihhifblnl.supabase.co";
const SUPABASE_KEY = "sb_publishable_NgjeNxdm1gqLRbYjBkMo4w_LKsof79F";
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const formularioShow = document.getElementById("cadastro-show-form");
const mensagemShow = document.getElementById("mensagem-show");
const listaShows = document.getElementById("lista-shows");
const botaoSair = document.getElementById("btn-sair");

let usuarioAtual = null;
let podeCriarShows = false;

//verificar se exxiste usuario
async function verificarUsuario() {
  const { data, error } = await clienteSupabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = "index.html";
    return;
  }

  usuarioAtual = data.user;

  document.getElementById("usuario-email").textContent = usuarioAtual.email;

  // Busca as permissões do usuário nos shows
  const { data: acessos, error: erroAcessos } = await clienteSupabase
    .from("usuarios_shows")
    .select("permissao")
    .eq("usuario_id", usuarioAtual.id);

  if (erroAcessos) {
    console.error("Erro ao consultar permissões:", erroAcessos);
    return;
  }

  // Verifica se o usuário é criador de algum show
  const { data: shows, error: erroShows } = await clienteSupabase
    .from("shows")
    .select("id, created_by");

  if (erroShows) {
    console.error("Erro ao consultar shows:", erroShows);
    return;
  }

  const eCriador = shows.some((show) => show.created_by === usuarioAtual.id);

  const eAdministradorOuOrganizador = acessos.some(
    (acesso) =>
      acesso.permissao === "administrador" ||
      acesso.permissao === "organizador",
  );

  podeCriarShows =
    acessos.length === 0 || eCriador || eAdministradorOuOrganizador;

  const formularioContainer = document.querySelector(".show-form-container");

  // Esconde o formulário se não puder cadastrar
  if (!podeCriarShows) {
    document.querySelector(".show-form-container").style.display = "none";
  }
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
  if (!podeCriarShows) {
    mensagemShow.textContent = "Você não tem permissão para cadastrar shows.";
    mensagemShow.style.color = "red";
    return;
  }
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

//mostra os shows existentes no banco de dados
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

    const botaoAbrir = document.createElement("button");
    botaoAbrir.textContent = "Abrir show";
    botaoAbrir.id = "btn-abrir";

    botaoAbrir.addEventListener("click", function () {
      window.location.href = "show.html?id=" + show.id;
    });

    card.appendChild(titulo);
    card.appendChild(data);
    card.appendChild(local);
    card.appendChild(botaoAbrir);

    listaShows.appendChild(card);
  });
}

carregarShows();
