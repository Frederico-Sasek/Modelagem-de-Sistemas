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
  // Verifica se estamos editando ou cadastrando uma receita
  let resultado;

  if (window.idReceitaEditando) {
    // Atualiza a receita existente
    resultado = await clienteSupabase
      .from("receitas")
      .update(novaReceita)
      .eq("id", window.idReceitaEditando);
  } else {
    // Cadastra uma nova receita
    resultado = await clienteSupabase.from("receitas").insert(novaReceita);
  }

  const { error } = resultado;

  if (error) {
    console.error("Erro ao cadastrar receita:", error);
    mensagemReceita.textContent = "Erro ao cadastrar receita.";
    return;
  }

  if (window.idReceitaEditando) {
    mensagemReceita.textContent = "Receita atualizada com sucesso!";
  } else {
    mensagemReceita.textContent = "Receita cadastrada com sucesso!";
  }

  // Limpa o formulário
  formReceita.reset();

  // Limpa o ID da edição
  window.idReceitaEditando = null;

  // Restaura o texto do botão
  formReceita.querySelector("button[type='submit']").textContent =
    "Cadastrar receita";

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
  // Verifica se estamos editando ou cadastrando
  let resultado;

  if (window.idDespesaEditando) {
    // Atualiza uma despesa existente
    resultado = await clienteSupabase
      .from("despesas")
      .update(novaDespesa)
      .eq("id", window.idDespesaEditando);
  } else {
    // Cadastra uma nova despesa
    resultado = await clienteSupabase.from("despesas").insert(novaDespesa);
  }

  const { error } = resultado;

  if (window.idDespesaEditando) {
    mensagemDespesa.textContent = "Despesa atualizada com sucesso!";
  } else {
    mensagemDespesa.textContent = "Despesa cadastrada com sucesso!";
  }

  // Limpa o formulário
  formDespesa.reset();

  // Limpa o ID da edição
  window.idDespesaEditando = null;

  // Restaura o texto do botão
  formDespesa.querySelector("button[type='submit']").textContent =
    "Cadastrar despesa";

  // Atualiza os valores e o histórico
  await carregarResumoFinanceiro();
  await carregarDespesas();

  // Limpa os campos// Exclui uma receita
  async function excluirReceita(id) {
    // Solicita confirmação do usuário
    const confirmar = confirm("Tem certeza que deseja excluir esta receita?");

    if (!confirmar) {
      return;
    }

    // Exclui a receita do Supabase
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

    // Atualiza os valores e o histórico
    await carregarResumoFinanceiro();
    await carregarReceitas();
  }
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
  // Busca os dados da receita selecionada
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

  // Preenche o formulário com os dados encontrados
  document.getElementById("descricao-receita").value = receita.descricao;

  document.getElementById("categoria-receita").value = receita.categoria || "";

  document.getElementById("valor-receita").value = receita.valor;

  document.getElementById("data-receita").value = receita.data_recebimento;

  // Guarda o ID da receita que será editada
  window.idReceitaEditando = id;

  // Altera o texto do botão
  formReceita.querySelector("button[type='submit']").textContent =
    "Salvar alterações";

  // Leva o usuário até o formulário
  formReceita.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// Exclui uma receita
async function excluirReceita(id) {
  // Solicita confirmação do usuário
  const confirmar = confirm("Tem certeza que deseja excluir esta receita?");

  if (!confirmar) {
    return;
  }

  // Exclui a receita do Supabase
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

  // Atualiza os valores e o histórico
  await carregarResumoFinanceiro();
  await carregarReceitas();
}

// Marca uma despesa como paga
async function marcarDespesaPaga(id) {
  const confirmar = confirm("Deseja marcar esta despesa como paga?");

  if (!confirmar) {
    return;
  }

  // Obtém a data atual
  const hoje = new Date().toLocaleDateString("en-CA");

  // Atualiza a despesa no Supabase
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

  // Atualiza o resumo e o histórico
  await carregarResumoFinanceiro();
  await carregarDespesas();
}

// Edita uma despesa
async function editarDespesa(id) {
  // Busca a despesa selecionada
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

  // Preenche o formulário
  document.getElementById("descricao-despesa").value = despesa.descricao;

  document.getElementById("categoria-despesa").value = despesa.categoria || "";

  document.getElementById("valor-despesa").value = despesa.valor;

  document.getElementById("vencimento-despesa").value =
    despesa.data_vencimento || "";

  // Guarda o ID da despesa em edição
  window.idDespesaEditando = id;

  // Altera o texto do botão
  formDespesa.querySelector("button[type='submit']").textContent =
    "Salvar alterações";

  // Leva o usuário até o formulário
  formDespesa.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// Exclui uma despesa
async function excluirDespesa(id) {
  const confirmar = confirm("Tem certeza que deseja excluir esta despesa?");

  if (!confirmar) {
    return;
  }

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

  // Atualiza o resumo e o histórico
  await carregarResumoFinanceiro();
  await carregarDespesas();
}

// Reabre uma despesa que foi marcada como paga
async function reabrirDespesa(id) {
  const confirmar = confirm("Deseja reabrir esta despesa?");

  if (!confirmar) {
    return;
  }

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

// Gera o relatório financeiro do show
async function gerarRelatorio() {
  const dataInicial = document.getElementById("data-inicial-relatorio").value;
  const dataFinal = document.getElementById("data-final-relatorio").value;

  const resultadoRelatorio = document.getElementById("resultado-relatorio");

  // Verifica se as datas foram preenchidas
  if (!dataInicial || !dataFinal) {
    resultadoRelatorio.textContent = "Informe a data inicial e a data final.";
    return;
  }

  // Verifica se o período é válido
  if (dataInicial > dataFinal) {
    resultadoRelatorio.textContent =
      "A data inicial não pode ser posterior à data final.";
    return;
  }

  resultadoRelatorio.textContent = "Gerando relatório...";

  // Busca receitas do período
  const { data: receitas, error: erroReceitas } = await clienteSupabase
    .from("receitas")
    .select("valor")
    .eq("show_id", idShow)
    .gte("data_recebimento", dataInicial)
    .lte("data_recebimento", dataFinal);

  if (erroReceitas) {
    console.error("Erro ao buscar receitas:", erroReceitas);
    resultadoRelatorio.textContent = "Erro ao consultar as receitas.";
    return;
  }

  // Busca despesas do período
  const { data: despesas, error: erroDespesas } = await clienteSupabase
    .from("despesas")
    .select("valor, status")
    .eq("show_id", idShow)
    .gte("data_vencimento", dataInicial)
    .lte("data_vencimento", dataFinal);

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

  // Formata os valores em reais
  function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // Exibe os resultados
  resultadoRelatorio.innerHTML = `
        <h3>Resultado do período</h3>

        <p>Receitas: ${formatarMoeda(totalReceitas)}</p>

        <p>Despesas: ${formatarMoeda(totalDespesas)}</p>

        <p>Despesas pendentes: ${formatarMoeda(totalPendentes)}</p>

        <h3>Resultado financeiro: ${formatarMoeda(resultado)}</h3>
    `;
}

document
  .getElementById("btn-gerar-relatorio")
  .addEventListener("click", gerarRelatorio);

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
