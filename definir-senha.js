document.addEventListener("DOMContentLoaded", async function () {
  const formulario = document.getElementById("form-definir-senha");
  const campoSenha = document.getElementById("nova-senha");
  const campoConfirmacao = document.getElementById("confirmar-senha");
  const mensagem = document.getElementById("mensagem-senha");
  const botao = document.getElementById("btn-salvar-senha");

  // 1. Verifica se o colaborador possui uma sessão válida
  const {
    data: { session },
    error,
  } = await clienteSupabase.auth.getSession();

  if (error || !session) {
    mensagem.textContent =
      "Convite inválido ou expirado. Solicite um novo convite.";

    botao.disabled = true;
    return;
  }

  // 2. Recebe o envio do formulário
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const senha = campoSenha.value;
    const confirmacao = campoConfirmacao.value;

    // 3. Verifica se as senhas são iguais
    if (senha !== confirmacao) {
      mensagem.textContent = "As senhas não coincidem.";
      mensagem.style.color = "#f87171";
      return;
    }

    if (senha.length < 8) {
      mensagem.textContent = "A senha deve ter pelo menos 8 caracteres.";

      mensagem.style.color = "#f87171";
      return;
    }

    // 4. Desabilita o botão durante o processamento
    botao.disabled = true;
    mensagem.textContent = "Salvando sua senha...";
    mensagem.style.color = "#94a3b8";

    // 5. Atualiza a senha na Supabase
    const { error: erroSenha } = await clienteSupabase.auth.updateUser({
      password: senha,
    });

    if (erroSenha) {
      console.error("Erro ao definir senha:", erroSenha);

      mensagem.textContent =
        "Não foi possível salvar sua senha. Tente novamente.";

      mensagem.style.color = "#f87171";
      botao.disabled = false;
      return;
    }

    // 6. Finaliza o processo
    mensagem.textContent = "Senha definida com sucesso! Redirecionando...";

    mensagem.style.color = "#34d399";

    await clienteSupabase.auth.signOut();

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  });
});
