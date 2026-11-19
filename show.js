const SUPABASE_URL = "https://wwjhlteacweihhifblnl.supabase.co";
const SUPABASE_KEY = "sb_publishable_NgjeNxdm1gqLRbYjBkMo4w_LKsof79F";

const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Identifica o show pelo endereço da página
const parametros = new URLSearchParams(window.location.search);
const idShow = parametros.get("id");

let graficoReceitas = null;
let graficoDespesas = null;
let permissaoUsuario = null;

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

// Busca a permissão do usuário no show
async function carregarPermissaoUsuario(usuario, show) {
  // O criador do show é considerado administrador
  if (show.created_by === usuario.id) {
    permissaoUsuario = "administrador";
    return;
  }

  const { data, error } = await clienteSupabase
    .from("usuarios_shows")
    .select("permissao")
    .eq("show_id", idShow)
    .eq("usuario_id", usuario.id)
    .single();

  if (error || !data) {
    console.error("Erro ao consultar permissão:", error);
    permissaoUsuario = null;
    return;
  }

  permissaoUsuario = data.permissao;
}

// Aplica as permissões na interface
function aplicarPermissoesInterface() {
  const secaoEquipe = document.getElementById("secao-equipe");

  // Somente o administrador gerencia colaboradores
  if (permissaoUsuario !== "administrador" && secaoEquipe) {
    secaoEquipe.style.display = "none";
  }
}

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

  // Identifica a permissão do usuário
  await carregarPermissaoUsuario(usuarioData.user, show);

  if (!permissaoUsuario) {
    mensagemShow.textContent =
      "Você não possui uma permissão válida para acessar este show.";
    return;
  }

  console.log("Permissão do usuário:", permissaoUsuario);

  // Aplica as restrições da interface
  aplicarPermissoesInterface();

  // Carrega a equipe para administradores
  if (permissaoUsuario === "administrador") {
    await carregarColaboradores();
  }

  // Exibe os controles somente para administrador e organizador
  const acoesShow = document.getElementById("acoes-show");

  if (
    permissaoUsuario === "administrador" ||
    permissaoUsuario === "organizador"
  ) {
    acoesShow.style.display = "flex";
  } else {
    acoesShow.style.display = "none";
  }

  // Preenche o formulário com os dados atuais
  document.getElementById("editar-nome-show").value = show.nome;

  document.getElementById("editar-data-show").value = show.data_show;

  document.getElementById("editar-local-show").value = show.local || "";

  document.getElementById("editar-descricao-show").value = show.descricao || "";

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

// Calcula o resumo financeiro
async function carregarResumoFinanceiro() {
  const { data: receitas, error: erroReceitas } = await clienteSupabase
    .from("receitas")
    .select("valor")
    .eq("show_id", idShow);

  if (erroReceitas) {
    console.error("Erro ao buscar receitas:", erroReceitas);
    return;
  }

  const { data: despesas, error: erroDespesas } = await clienteSupabase
    .from("despesas")
    .select("valor, status")
    .eq("show_id", idShow);

  if (erroDespesas) {
    console.error("Erro ao buscar despesas:", erroDespesas);
    return;
  }

  const totalReceitas = receitas.reduce(function (total, receita) {
    return total + Number(receita.valor);
  }, 0);

  const totalDespesas = despesas.reduce(function (total, despesa) {
    return total + Number(despesa.valor);
  }, 0);

  const totalPendentes = despesas.reduce(function (total, despesa) {
    if (despesa.status === "pendente") {
      return total + Number(despesa.valor);
    }

    return total;
  }, 0);

  const resultado = totalReceitas - totalDespesas;

  function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  document.getElementById("total-receitas").textContent =
    formatarMoeda(totalReceitas);

  document.getElementById("total-despesas").textContent =
    formatarMoeda(totalDespesas);

  document.getElementById("total-pendentes").textContent =
    formatarMoeda(totalPendentes);

  document.getElementById("resultado-financeiro").textContent =
    formatarMoeda(resultado);
}

// Cadastro e edição de receitas
const formReceita = document.getElementById("form-receita");
const mensagemReceita = document.getElementById("mensagem-receita");

formReceita.addEventListener("submit", async function (event) {
  event.preventDefault();

  mensagemReceita.textContent = "Salvando receita...";

  const { data: usuarioData, error: usuarioError } =
    await clienteSupabase.auth.getUser();

  if (usuarioError || !usuarioData.user) {
    mensagemReceita.textContent = "Você precisa estar conectado.";
    return;
  }

  const novaReceita = {
    show_id: idShow,
    descricao: document.getElementById("descricao-receita").value,
    categoria: document.getElementById("categoria-receita").value,
    valor: Number(document.getElementById("valor-receita").value),
    data_recebimento: document.getElementById("data-receita").value,
  };

  const estaEditando = Boolean(window.idReceitaEditando);
  let resultado;

  if (estaEditando) {
    resultado = await clienteSupabase
      .from("receitas")
      .update(novaReceita)
      .eq("id", window.idReceitaEditando);
  } else {
    resultado = await clienteSupabase.from("receitas").insert({
      ...novaReceita,
      created_by: usuarioData.user.id,
    });
  }

  if (resultado.error) {
    console.error("Erro ao salvar receita:", resultado.error);
    mensagemReceita.textContent = "Erro ao salvar receita.";
    return;
  }

  mensagemReceita.textContent = estaEditando
    ? "Receita atualizada com sucesso!"
    : "Receita cadastrada com sucesso!";

  formReceita.reset();
  window.idReceitaEditando = null;

  formReceita.querySelector("button[type='submit']").textContent =
    "Cadastrar receita";

  await carregarResumoFinanceiro();
  await carregarReceitas();
});

// Cadastro e edição de despesas
const formDespesa = document.getElementById("form-despesa");
const mensagemDespesa = document.getElementById("mensagem-despesa");

formDespesa.addEventListener("submit", async function (event) {
  event.preventDefault();

  mensagemDespesa.textContent = "Salvando despesa...";

  const { data: usuarioData, error: usuarioError } =
    await clienteSupabase.auth.getUser();

  if (usuarioError || !usuarioData.user) {
    mensagemDespesa.textContent = "Você precisa estar conectado.";
    return;
  }

  const novaDespesa = {
    show_id: idShow,
    descricao: document.getElementById("descricao-despesa").value,
    categoria: document.getElementById("categoria-despesa").value,
    valor: Number(document.getElementById("valor-despesa").value),
    data_vencimento:
      document.getElementById("vencimento-despesa").value || null,
  };

  const estaEditando = Boolean(window.idDespesaEditando);
  let resultado;

  if (estaEditando) {
    resultado = await clienteSupabase
      .from("despesas")
      .update(novaDespesa)
      .eq("id", window.idDespesaEditando);
  } else {
    resultado = await clienteSupabase.from("despesas").insert({
      ...novaDespesa,
      created_by: usuarioData.user.id,
    });
  }

  if (resultado.error) {
    console.error("Erro ao salvar despesa:", resultado.error);
    mensagemDespesa.textContent = "Não foi possível salvar a despesa.";
    return;
  }

  mensagemDespesa.textContent = estaEditando
    ? "Despesa atualizada com sucesso!"
    : "Despesa cadastrada com sucesso!";

  formDespesa.reset();
  window.idDespesaEditando = null;

  formDespesa.querySelector("button[type='submit']").textContent =
    "Cadastrar despesa";

  await carregarResumoFinanceiro();
  await carregarDespesas();
});

// Carrega o histórico de receitas
async function carregarReceitas() {
  const listaReceitas = document.getElementById("lista-receitas");

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

  listaReceitas.innerHTML = "";

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

  listaDespesas.innerHTML = "";

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
      <td>
        <button class="btn-editar"
          onclick="editarDespesa('${despesa.id}')">
          Editar
        </button>

        ${
          despesa.status === "pago"
            ? `<button class="btn-editar"
                onclick="reabrirDespesa('${despesa.id}')">
                Reabrir
              </button>`
            : `<button class="btn-editar"
                onclick="marcarDespesaPaga('${despesa.id}')">
                Pagar
              </button>`
        }

        <button class="btn-excluir"
          onclick="excluirDespesa('${despesa.id}')">
          Excluir
        </button>
      </td>
    `;

    listaDespesas.appendChild(linha);
  });
}

// Edita uma receita
async function editarReceita(id) {
  const { data: receita, error } = await clienteSupabase
    .from("receitas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar receita:", error);
    alert("Não foi possível carregar a receita.");
    return;
  }

  document.getElementById("descricao-receita").value = receita.descricao;

  document.getElementById("categoria-receita").value = receita.categoria || "";

  document.getElementById("valor-receita").value = receita.valor;

  document.getElementById("data-receita").value = receita.data_recebimento;

  window.idReceitaEditando = id;

  formReceita.querySelector("button[type='submit']").textContent =
    "Salvar alterações";

  formReceita.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// Exclui uma receita
async function excluirReceita(id) {
  const confirmar = confirm("Tem certeza que deseja excluir esta receita?");

  if (!confirmar) return;

  const { error } = await clienteSupabase
    .from("receitas")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir receita:", error);
    alert("Não foi possível excluir a receita.");
    return;
  }

  alert("Receita excluída com sucesso!");

  await carregarResumoFinanceiro();
  await carregarReceitas();
}

// Marca uma despesa como paga
async function marcarDespesaPaga(id) {
  const confirmar = confirm("Deseja marcar esta despesa como paga?");

  if (!confirmar) return;

  const hoje = new Date().toLocaleDateString("en-CA");

  const { error } = await clienteSupabase
    .from("despesas")
    .update({
      status: "pago",
      data_pagamento: hoje,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar despesa:", error);
    alert("Não foi possível atualizar a despesa.");
    return;
  }

  alert("Despesa marcada como paga!");

  await carregarResumoFinanceiro();
  await carregarDespesas();
}

// Edita uma despesa
async function editarDespesa(id) {
  const { data: despesa, error } = await clienteSupabase
    .from("despesas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar despesa:", error);
    alert("Não foi possível carregar a despesa.");
    return;
  }

  document.getElementById("descricao-despesa").value = despesa.descricao;

  document.getElementById("categoria-despesa").value = despesa.categoria || "";

  document.getElementById("valor-despesa").value = despesa.valor;

  document.getElementById("vencimento-despesa").value =
    despesa.data_vencimento || "";

  window.idDespesaEditando = id;

  formDespesa.querySelector("button[type='submit']").textContent =
    "Salvar alterações";

  formDespesa.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// Exclui uma despesa
async function excluirDespesa(id) {
  const confirmar = confirm("Tem certeza que deseja excluir esta despesa?");

  if (!confirmar) return;

  const { error } = await clienteSupabase
    .from("despesas")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir despesa:", error);
    alert("Não foi possível excluir a despesa.");
    return;
  }

  alert("Despesa excluída com sucesso!");

  await carregarResumoFinanceiro();
  await carregarDespesas();
}

// Reabre uma despesa paga
async function reabrirDespesa(id) {
  const confirmar = confirm("Deseja reabrir esta despesa?");

  if (!confirmar) return;

  const { error } = await clienteSupabase
    .from("despesas")
    .update({
      status: "pendente",
      data_pagamento: null,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao reabrir despesa:", error);
    alert("Não foi possível reabrir a despesa.");
    return;
  }

  alert("Despesa reaberta com sucesso!");

  await carregarResumoFinanceiro();
  await carregarDespesas();
}

// Gera o relatório financeiro
async function gerarRelatorio() {
  const dataInicial = document.getElementById("data-inicial-relatorio").value;

  const dataFinal = document.getElementById("data-final-relatorio").value;

  const resultadoRelatorio = document.getElementById("resultado-relatorio");

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    resultadoRelatorio.textContent =
      "A data inicial não pode ser posterior à data final.";
    return;
  }

  resultadoRelatorio.textContent = "Gerando relatório...";

  // Busca receitas
  let consultaReceitas = clienteSupabase
    .from("receitas")
    .select("valor, categoria")
    .eq("show_id", idShow);

  if (dataInicial) {
    consultaReceitas = consultaReceitas.gte("data_recebimento", dataInicial);
  }

  if (dataFinal) {
    consultaReceitas = consultaReceitas.lte("data_recebimento", dataFinal);
  }

  const { data: receitas, error: erroReceitas } = await consultaReceitas;

  if (erroReceitas) {
    console.error("Erro ao buscar receitas:", erroReceitas);
    resultadoRelatorio.textContent = "Erro ao consultar as receitas.";
    return;
  }

  // Busca despesas
  let consultaDespesas = clienteSupabase
    .from("despesas")
    .select("valor, status, categoria")
    .eq("show_id", idShow);

  if (dataInicial) {
    consultaDespesas = consultaDespesas.gte("data_vencimento", dataInicial);
  }

  if (dataFinal) {
    consultaDespesas = consultaDespesas.lte("data_vencimento", dataFinal);
  }

  const { data: despesas, error: erroDespesas } = await consultaDespesas;

  if (erroDespesas) {
    console.error("Erro ao buscar despesas:", erroDespesas);
    resultadoRelatorio.textContent = "Erro ao consultar as despesas.";
    return;
  }

  // Calcula os totais
  const totalReceitas = receitas.reduce(function (total, receita) {
    return total + Number(receita.valor);
  }, 0);

  const totalDespesas = despesas.reduce(function (total, despesa) {
    return total + Number(despesa.valor);
  }, 0);

  const totalPendentes = despesas.reduce(function (total, despesa) {
    if (despesa.status === "pendente") {
      return total + Number(despesa.valor);
    }

    return total;
  }, 0);

  const resultado = totalReceitas - totalDespesas;

  function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // Agrupa categorias iguais
  function agruparPorCategoria(registros) {
    const categorias = new Map();

    registros.forEach(function (registro) {
      const nomeOriginal = (registro.categoria || "Sem categoria")
        .trim()
        .replace(/\s+/g, " ");

      const chave = nomeOriginal.toLocaleLowerCase("pt-BR");
      const valor = Number(registro.valor);

      if (categorias.has(chave)) {
        categorias.get(chave).valor += valor;
      } else {
        categorias.set(chave, {
          nome: nomeOriginal,
          valor: valor,
        });
      }
    });

    return Array.from(categorias.values());
  }

  const categoriasReceitas = agruparPorCategoria(receitas);
  const categoriasDespesas = agruparPorCategoria(despesas);

  const coresGraficos = [
    "#38bdf8",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#a78bfa",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#84cc16",
    "#06b6d4",
    "#e879f9",
  ];

  // Dados do gráfico de receitas
  const dadosReceitas = {
    labels: categoriasReceitas.map((item) => item.nome),
    datasets: [
      {
        data: categoriasReceitas.map((item) => item.valor),
        backgroundColor: categoriasReceitas.map(
          (_, indice) => coresGraficos[indice % coresGraficos.length],
        ),
      },
    ],
  };

  // Dados do gráfico de despesas
  const dadosDespesas = {
    labels: categoriasDespesas.map((item) => item.nome),
    datasets: [
      {
        data: categoriasDespesas.map((item) => item.valor),
        backgroundColor: categoriasDespesas.map(
          (_, indice) => coresGraficos[indice % coresGraficos.length],
        ),
      },
    ],
  };

  // Cria as legendas personalizadas
  function renderizarLegenda(grafico, idLegenda) {
    const elemento = document.getElementById(idLegenda);

    if (!elemento) return;

    elemento.innerHTML = "";

    const dados = grafico.data.datasets[0];

    grafico.data.labels.forEach(function (categoria, indice) {
      const item = document.createElement("div");
      item.className = "item-legenda";

      const cor = document.createElement("span");
      cor.className = "cor-legenda";
      cor.style.backgroundColor = dados.backgroundColor[indice];

      const nome = document.createElement("span");
      nome.className = "texto-legenda";
      nome.textContent = categoria;

      const valor = document.createElement("span");
      valor.className = "valor-legenda";
      valor.textContent = formatarMoeda(dados.data[indice]);

      item.appendChild(cor);
      item.appendChild(nome);
      item.appendChild(valor);

      elemento.appendChild(item);
    });
  }

  // Gráfico de receitas
  if (graficoReceitas) {
    graficoReceitas.data = dadosReceitas;
    graficoReceitas.update();
  } else {
    graficoReceitas = new Chart(document.getElementById("grafico-receitas"), {
      type: "doughnut",
      data: dadosReceitas,
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }

  // Gráfico de despesas
  if (graficoDespesas) {
    graficoDespesas.data = dadosDespesas;
    graficoDespesas.update();
  } else {
    graficoDespesas = new Chart(document.getElementById("grafico-despesas"), {
      type: "doughnut",
      data: dadosDespesas,
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }

  renderizarLegenda(graficoReceitas, "legenda-receitas");
  renderizarLegenda(graficoDespesas, "legenda-despesas");

  // Atualiza os cards do relatório
  document.getElementById("relatorio-total-receitas").textContent =
    formatarMoeda(totalReceitas);

  document.getElementById("relatorio-total-despesas").textContent =
    formatarMoeda(totalDespesas);

  document.getElementById("relatorio-total-pendentes").textContent =
    formatarMoeda(totalPendentes);

  document.getElementById("relatorio-resultado").textContent =
    formatarMoeda(resultado);

  resultadoRelatorio.textContent = "Relatório gerado com sucesso!";
}

// Botão para gerar relatório
document
  .getElementById("btn-gerar-relatorio")
  .addEventListener("click", gerarRelatorio);

// Botão para limpar relatório
document
  .getElementById("btn-limpar-relatorio")
  .addEventListener("click", function () {
    document.getElementById("data-inicial-relatorio").value = "";
    document.getElementById("data-final-relatorio").value = "";

    document.getElementById("relatorio-total-receitas").textContent = "R$ 0,00";

    document.getElementById("relatorio-total-despesas").textContent = "R$ 0,00";

    document.getElementById("relatorio-total-pendentes").textContent =
      "R$ 0,00";

    document.getElementById("relatorio-resultado").textContent = "R$ 0,00";

    document.getElementById("resultado-relatorio").textContent =
      "Filtros limpos.";
  });

// Formulário de convite de colaboradores
const formConvidarUsuario = document.getElementById("form-convidar-usuario");

formConvidarUsuario.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("email-colaborador").value.trim();

  const permissao = document.getElementById("permissao-colaborador").value;

  const mensagem = document.getElementById("mensagem-convite");

  const botao = formConvidarUsuario.querySelector("button[type='submit']");

  mensagem.textContent = "Enviando convite...";
  botao.disabled = true;

  const { data, error } = await clienteSupabase.functions.invoke(
    "clever-processor",
    {
      body: {
        email: email,
        show_id: idShow,
        permissao: permissao,
      },
    },
  );

  botao.disabled = false;

  if (error) {
    console.error("Erro ao enviar convite:", error);

    mensagem.textContent =
      "Não foi possível enviar o convite. Verifique o console.";

    return;
  }

  if (data && data.erro) {
    mensagem.textContent = data.erro;
    return;
  }

  mensagem.textContent = data?.mensagem || "Convite enviado com sucesso!";

  formConvidarUsuario.reset();
});

// Abre o formulário de edição
document.getElementById("btn-editar-show").addEventListener("click", () => {
  if (
    permissaoUsuario !== "administrador" &&
    permissaoUsuario !== "organizador"
  ) {
    return;
  }

  document.getElementById("nome-show").style.display = "none";
  document.getElementById("data-show").style.display = "none";
  document.getElementById("local-show").style.display = "none";
  document.getElementById("descricao-show").style.display = "none";

  document.getElementById("acoes-show").style.display = "none";
  document.getElementById("form-editar-show").style.display = "block";
});

// Cancela a edição
document.getElementById("btn-cancelar-edicao").addEventListener("click", () => {
  document.getElementById("form-editar-show").style.display = "none";

  document.getElementById("nome-show").style.display = "";
  document.getElementById("data-show").style.display = "";
  document.getElementById("local-show").style.display = "";
  document.getElementById("descricao-show").style.display = "";

  document.getElementById("acoes-show").style.display = "flex";

  document.getElementById("mensagem-edicao-show").textContent = "";
});

// Salva as alterações do show
document
  .getElementById("form-editar-show")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    if (
      permissaoUsuario !== "administrador" &&
      permissaoUsuario !== "organizador"
    ) {
      return;
    }

    const mensagem = document.getElementById("mensagem-edicao-show");

    const nome = document.getElementById("editar-nome-show").value.trim();
    const data = document.getElementById("editar-data-show").value;
    const local = document.getElementById("editar-local-show").value.trim();
    const descricao = document
      .getElementById("editar-descricao-show")
      .value.trim();

    if (!nome || !data) {
      mensagem.textContent = "Preencha o nome e a data do show.";
      return;
    }

    mensagem.textContent = "Salvando alterações...";

    const { error } = await clienteSupabase
      .from("shows")
      .update({
        nome: nome,
        data_show: data,
        local: local || null,
        descricao: descricao || null,
      })
      .eq("id", idShow);

    if (error) {
      console.error("Erro ao atualizar show:", error);
      mensagem.textContent = "Não foi possível salvar as alterações.";
      return;
    }

    // Atualiza as informações exibidas na página
    document.getElementById("nome-show").textContent = nome;

    document.getElementById("data-show").textContent =
      "Data: " + new Date(data + "T00:00:00").toLocaleDateString("pt-BR");

    document.getElementById("local-show").textContent =
      "Local: " + (local || "Não informado");

    document.getElementById("descricao-show").textContent =
      "Descrição: " + (descricao || "Não informada");

    // Fecha o formulário e retorna à visualização
    document.getElementById("form-editar-show").style.display = "none";

    document.getElementById("nome-show").style.display = "";
    document.getElementById("data-show").style.display = "";
    document.getElementById("local-show").style.display = "";
    document.getElementById("descricao-show").style.display = "";

    document.getElementById("acoes-show").style.display = "flex";

    mensagem.textContent = "";

    alert("Show atualizado com sucesso!");
  });

// Exclui o show
document
  .getElementById("btn-excluir-show")
  .addEventListener("click", async () => {
    if (
      permissaoUsuario !== "administrador" &&
      permissaoUsuario !== "organizador"
    ) {
      return;
    }

    const confirmar = confirm(
      "Tem certeza de que deseja excluir este show?\n\n" +
        "Todas as receitas e despesas vinculadas também serão excluídas permanentemente.",
    );

    if (!confirmar) {
      return;
    }

    const botaoExcluir = document.getElementById("btn-excluir-show");

    botaoExcluir.disabled = true;
    botaoExcluir.textContent = "Excluindo...";

    const { error } = await clienteSupabase
      .from("shows")
      .delete()
      .eq("id", idShow);

    if (error) {
      console.error("Erro ao excluir show:", error);

      alert(
        "Não foi possível excluir o show. Verifique as permissões e tente novamente.",
      );

      botaoExcluir.disabled = false;
      botaoExcluir.textContent = "Excluir show";

      return;
    }

    alert("Show excluído com sucesso!");

    window.location.href = "dashboard.html";
  });

/* =====================================
   GERENCIAMENTO DE COLABORADORES
===================================== */

// Carrega os colaboradores do show
async function carregarColaboradores() {
  const lista = document.getElementById("lista-colaboradores");
  const mensagem = document.getElementById("mensagem-equipe");

  mensagem.textContent = "Carregando colaboradores...";
  lista.innerHTML = "";

  const { data, error } = await clienteSupabase.functions.invoke(
    "clever-processor",
    {
      body: {
        acao: "listar",
        show_id: idShow,
      },
    },
  );

  if (error || !data?.sucesso) {
    console.error("Erro ao carregar colaboradores:", error || data);

    mensagem.textContent =
      data?.erro || "Não foi possível carregar os colaboradores.";

    return;
  }

  const colaboradores = data.colaboradores || [];

  if (colaboradores.length === 0) {
    mensagem.textContent = "Nenhum colaborador cadastrado.";
    return;
  }

  mensagem.textContent = "";

  colaboradores.forEach((colaborador) => {
    const item = document.createElement("div");
    item.className = "colaborador-item";

    const email = document.createElement("p");
    email.className = "colaborador-email";
    email.textContent = colaborador.email;

    const permissao = document.createElement("select");
    permissao.className = "seletor-permissao";

    const opcoes = [
      { valor: "administrador", texto: "Administrador" },
      { valor: "organizador", texto: "Organizador" },
      { valor: "financeiro", texto: "Financeiro" },
    ];

    opcoes.forEach((opcao) => {
      const option = document.createElement("option");
      option.value = opcao.valor;
      option.textContent = opcao.texto;

      permissao.appendChild(option);
    });

    permissao.value = colaborador.permissao;

    const botoes = document.createElement("div");
    botoes.className = "acoes-colaborador";

    const btnSalvar = document.createElement("button");
    btnSalvar.type = "button";
    btnSalvar.textContent = "Salvar permissão";

    btnSalvar.addEventListener("click", async () => {
      if (permissao.value === colaborador.permissao) {
        alert("A permissão selecionada já está definida.");
        return;
      }

      const confirmar = confirm(
        `Deseja alterar a permissão de ${colaborador.email} para ${permissao.options[permissao.selectedIndex].text}?`,
      );

      if (!confirmar) return;

      btnSalvar.disabled = true;

      const { data, error } = await clienteSupabase.functions.invoke(
        "clever-processor",
        {
          body: {
            acao: "alterar_permissao",
            show_id: idShow,
            usuario_id: colaborador.usuario_id,
            permissao: permissao.value,
          },
        },
      );

      btnSalvar.disabled = false;

      if (error || !data?.sucesso) {
        console.error("Erro ao alterar permissão:", error || data);

        alert(data?.erro || "Não foi possível alterar a permissão.");
        return;
      }

      alert("Permissão alterada com sucesso!");

      await carregarColaboradores();
    });

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.textContent = "Remover";

    btnRemover.addEventListener("click", async () => {
      const confirmar = confirm(
        `Tem certeza de que deseja remover ${colaborador.email} deste show?`,
      );

      if (!confirmar) return;

      btnRemover.disabled = true;

      const { data, error } = await clienteSupabase.functions.invoke(
        "clever-processor",
        {
          body: {
            acao: "remover",
            show_id: idShow,
            usuario_id: colaborador.usuario_id,
          },
        },
      );

      btnRemover.disabled = false;

      if (error || !data?.sucesso) {
        console.error("Erro ao remover colaborador:", error || data);

        alert(data?.erro || "Não foi possível remover o colaborador.");
        return;
      }

      alert("Colaborador removido com sucesso!");

      await carregarColaboradores();
    });

    botoes.appendChild(btnSalvar);
    botoes.appendChild(btnRemover);

    item.appendChild(email);
    item.appendChild(permissao);
    item.appendChild(botoes);

    lista.appendChild(item);
  });
}

/* =====================================
   GERENCIAMENTO DE COLABORADORES
===================================== */

// Carrega os colaboradores do show
async function carregarColaboradores() {
  const lista = document.getElementById("lista-colaboradores");
  const mensagem = document.getElementById("mensagem-equipe");

  mensagem.textContent = "Carregando colaboradores...";
  lista.innerHTML = "";

  const { data, error } = await clienteSupabase.functions.invoke(
    "clever-processor",
    {
      body: {
        acao: "listar",
        show_id: idShow,
      },
    },
  );

  if (error || !data?.sucesso) {
    console.error("Erro ao carregar colaboradores:", error || data);

    mensagem.textContent =
      data?.erro || "Não foi possível carregar os colaboradores.";

    return;
  }

  const colaboradores = data.colaboradores || [];

  if (colaboradores.length === 0) {
    mensagem.textContent = "Nenhum colaborador cadastrado.";
    return;
  }

  mensagem.textContent = "";

  colaboradores.forEach((colaborador) => {
    const item = document.createElement("div");
    item.className = "colaborador-item";

    const email = document.createElement("p");
    email.className = "colaborador-email";
    email.textContent = colaborador.email;

    const permissao = document.createElement("select");
    permissao.className = "seletor-permissao";

    const opcoes = [
      { valor: "administrador", texto: "Administrador" },
      { valor: "organizador", texto: "Organizador" },
      { valor: "financeiro", texto: "Financeiro" },
    ];

    opcoes.forEach((opcao) => {
      const option = document.createElement("option");
      option.value = opcao.valor;
      option.textContent = opcao.texto;

      permissao.appendChild(option);
    });

    permissao.value = colaborador.permissao;

    const botoes = document.createElement("div");
    botoes.className = "acoes-colaborador";

    const btnSalvar = document.createElement("button");
    btnSalvar.type = "button";
    btnSalvar.textContent = "Salvar permissão";

    btnSalvar.addEventListener("click", async () => {
      if (permissao.value === colaborador.permissao) {
        alert("A permissão selecionada já está definida.");
        return;
      }

      const confirmar = confirm(
        `Deseja alterar a permissão de ${colaborador.email} para ${permissao.options[permissao.selectedIndex].text}?`,
      );

      if (!confirmar) return;

      btnSalvar.disabled = true;

      const { data, error } = await clienteSupabase.functions.invoke(
        "clever-processor",
        {
          body: {
            acao: "alterar_permissao",
            show_id: idShow,
            usuario_id: colaborador.usuario_id,
            permissao: permissao.value,
          },
        },
      );

      btnSalvar.disabled = false;

      if (error || !data?.sucesso) {
        console.error("Erro ao alterar permissão:", error || data);

        alert(data?.erro || "Não foi possível alterar a permissão.");
        return;
      }

      alert("Permissão alterada com sucesso!");

      await carregarColaboradores();
    });

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.textContent = "Remover";

    btnRemover.addEventListener("click", async () => {
      const confirmar = confirm(
        `Tem certeza de que deseja remover ${colaborador.email} deste show?`,
      );

      if (!confirmar) return;

      btnRemover.disabled = true;

      const { data, error } = await clienteSupabase.functions.invoke(
        "clever-processor",
        {
          body: {
            acao: "remover",
            show_id: idShow,
            usuario_id: colaborador.usuario_id,
          },
        },
      );

      btnRemover.disabled = false;

      if (error || !data?.sucesso) {
        console.error("Erro ao remover colaborador:", error || data);

        alert(data?.erro || "Não foi possível remover o colaborador.");
        return;
      }

      alert("Colaborador removido com sucesso!");

      await carregarColaboradores();
    });

    botoes.appendChild(btnSalvar);
    botoes.appendChild(btnRemover);

    item.appendChild(email);
    item.appendChild(permissao);
    item.appendChild(botoes);

    lista.appendChild(item);
  });
}
