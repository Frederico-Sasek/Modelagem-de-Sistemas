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
  await carregarResumoFinanceiro();
  await carregarReceitas();
  await carregarDespesas();
}

carregarShow();

// Calcula o resumo financeiro do show
async function carregarResumoFinanceiro() {
  // Busca as receitas do show selecionado
  const { data: receitas, error: erroReceitas } = await clienteSupabase
    .from("receitas")
    .select("valor")
    .eq("show_id", idShow);

  if (erroReceitas) {
    console.error("Erro ao buscar receitas:", erroReceitas);
    return;
  }

  // Busca as despesas do show selecionado
  const { data: despesas, error: erroDespesas } = await clienteSupabase
    .from("despesas")
    .select("valor, status")
    .eq("show_id", idShow);

  if (erroDespesas) {
    console.error("Erro ao buscar despesas:", erroDespesas);
    return;
  }

  // Soma todas as receitas
  const totalReceitas = receitas.reduce(function (total, receita) {
    return total + Number(receita.valor);
  }, 0);

  // Soma todas as despesas
  const totalDespesas = despesas.reduce(function (total, despesa) {
    return total + Number(despesa.valor);
  }, 0);

  // Soma somente as despesas pendentes
  const totalPendentes = despesas.reduce(function (total, despesa) {
    if (despesa.status === "pendente") {
      return total + Number(despesa.valor);
    }

    return total;
  }, 0);

  // Calcula o resultado financeiro
  const resultado = totalReceitas - totalDespesas;

  // Formata os valores para reais
  function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // Atualiza os indicadores na página
  document.getElementById("total-receitas").textContent =
    formatarMoeda(totalReceitas);

  document.getElementById("total-despesas").textContent =
    formatarMoeda(totalDespesas);

  document.getElementById("total-pendentes").textContent =
    formatarMoeda(totalPendentes);

  document.getElementById("resultado-financeiro").textContent =
    formatarMoeda(resultado);
}

// Cadastro de receitas
const formReceita = document.getElementById("form-receita");
const mensagemReceita = document.getElementById("mensagem-receita");

formReceita.addEventListener("submit", async function (event) {
  event.preventDefault();

  mensagemReceita.textContent = "Cadastrando receita...";

  // Identifica o usuário conectado
  const { data: usuarioData, error: usuarioError } =
    await clienteSupabase.auth.getUser();

  if (usuarioError || !usuarioData.user) {
    mensagemReceita.textContent = "Você precisa estar conectado.";
    return;
  }

  // Reúne os dados preenchidos no formulário
  const novaReceita = {
    show_id: idShow,
    descricao: document.getElementById("descricao-receita").value,
    categoria: document.getElementById("categoria-receita").value,
    valor: Number(document.getElementById("valor-receita").value),
    data_recebimento: document.getElementById("data-receita").value,
    created_by: usuarioData.user.id,
  };

  // Envia os dados para o Supabase
  const { error } = await clienteSupabase.from("receitas").insert(novaReceita);

  if (error) {
    console.error("Erro ao cadastrar receita:", error);
    mensagemReceita.textContent = "Erro ao cadastrar receita.";
    return;
  }

  mensagemReceita.textContent = "Receita cadastrada com sucesso!";

  // Limpa o formulário
  formReceita.reset();

  // Atualiza os valores do resumo financeiro
  await carregarResumoFinanceiro();
  await carregarReceitas();
  await carregarDespesas();
});

// Cadastro de despesas
const formDespesa = document.getElementById("form-despesa");
const mensagemDespesa = document.getElementById("mensagem-despesa");

formDespesa.addEventListener("submit", async function (event) {
  event.preventDefault();

  mensagemDespesa.textContent = "Cadastrando despesa...";

  // Identifica o usuário conectado
  const { data: usuarioData, error: usuarioError } =
    await clienteSupabase.auth.getUser();

  if (usuarioError || !usuarioData.user) {
    mensagemDespesa.textContent = "Você precisa estar conectado.";
    return;
  }

  // Reúne os dados da despesa
  const novaDespesa = {
    show_id: idShow,
    descricao: document.getElementById("descricao-despesa").value,
    categoria: document.getElementById("categoria-despesa").value,
    valor: Number(document.getElementById("valor-despesa").value),
    data_vencimento:
      document.getElementById("vencimento-despesa").value || null,
    created_by: usuarioData.user.id,
  };

  // Salva no Supabase
  const { error } = await clienteSupabase.from("despesas").insert(novaDespesa);

  if (error) {
    console.error("Erro ao cadastrar despesa:", error);
    mensagemDespesa.textContent = "Erro ao cadastrar despesa: " + error.message;
    return;
  }

  mensagemDespesa.textContent = "Despesa cadastrada com sucesso!";

  // Limpa os campos
  formDespesa.reset();

  // Atualiza o resumo financeiro
  await carregarResumoFinanceiro();
  await carregarReceitas();
});

// Carrega o histórico de receitas
async function carregarReceitas() {
  const listaReceitas = document.getElementById("lista-receitas");

  // Busca as receitas do show selecionado
  const { data: receitas, error } = await clienteSupabase
    .from("receitas")
    .select("*")
    .eq("show_id", idShow)
    .order("data_recebimento", { ascending: false });

  if (error) {
    console.error("Erro ao carregar receitas:", error);
    listaReceitas.innerHTML = `
            <tr>
                <td colspan="5">Erro ao carregar receitas.</td>
            </tr>
        `;
    return;
  }

  // Verifica se existem receitas cadastradas
  if (receitas.length === 0) {
    listaReceitas.innerHTML = `
            <tr>
                <td colspan="5" class="tabela-vazia">
                    Nenhuma receita cadastrada.
                </td>
            </tr>
        `;
    return;
  }

  // Limpa a tabela antes de inserir os registros
  listaReceitas.innerHTML = "";

  // Percorre todas as receitas encontradas
  receitas.forEach(function (receita) {
    const linha = document.createElement("tr");

    const dataFormatada = new Date(
      receita.data_recebimento + "T00:00:00",
    ).toLocaleDateString("pt-BR");

    const valorFormatado = Number(receita.valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    linha.innerHTML = `
            <td>${receita.descricao}</td>
            <td>${receita.categoria || "Não informada"}</td>
            <td>${dataFormatada}</td>
            <td>${valorFormatado}</td>
            <td>
        <button class="btn-editar"
            onclick="editarReceita('${receita.id}')">
            Editar
        </button>

        <button class="btn-excluir"
            onclick="excluirReceita('${receita.id}')">
            Excluir
        </button>
    </td>
            
        `;

    listaReceitas.appendChild(linha);
  });
}
// Carrega o histórico de despesas
async function carregarDespesas() {
  const listaDespesas = document.getElementById("lista-despesas");

  // Busca as despesas do show selecionado
  const { data: despesas, error } = await clienteSupabase
    .from("despesas")
    .select("*")
    .eq("show_id", idShow)
    .order("data_vencimento", { ascending: true });

  if (error) {
    console.error("Erro ao carregar despesas:", error);

    listaDespesas.innerHTML = `
            <tr>
                <td colspan="6">Erro ao carregar despesas.</td>
            </tr>
        `;
    return;
  }

  // Verifica se existem despesas
  if (despesas.length === 0) {
    listaDespesas.innerHTML = `
            <tr>
                <td colspan="6" class="tabela-vazia">
                    Nenhuma despesa cadastrada.
                </td>
            </tr>
        `;
    return;
  }

  // Limpa a tabela
  listaDespesas.innerHTML = "";

  // Percorre as despesas encontradas
  despesas.forEach(function (despesa) {
    const linha = document.createElement("tr");

    const dataFormatada = despesa.data_vencimento
      ? new Date(despesa.data_vencimento + "T00:00:00").toLocaleDateString(
          "pt-BR",
        )
      : "Não informada";

    const valorFormatado = Number(despesa.valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const classeStatus =
      despesa.status === "pago" ? "status-pago" : "status-pendente";

    const statusFormatado = despesa.status === "pago" ? "Pago" : "Pendente";

    linha.innerHTML = `
            <td>${despesa.descricao}</td>
            <td>${despesa.categoria || "Não informada"}</td>
            <td>${dataFormatada}</td>
            <td>${valorFormatado}</td>
            <td>
                <span class="status-despesa ${classeStatus}">
                    ${statusFormatado}
                </span>
            </td>
            <td>-</td>
        `;

    listaDespesas.appendChild(linha);
  });
}
