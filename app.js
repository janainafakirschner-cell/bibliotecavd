// ATENÇÃO: Substitua o texto abaixo pela URL da sua implantação do Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbwCVnRUqWDrd3irfBvMO_lgLe713w1z9QZRKhBBWkwJA687mGip3E4mQbnS5CuJsJcTog/exec";

let acervoMemoria = [];
let dadosEmprestimoTemporario = {};

// CONTROLE DE CAMPOS NO LOGIN
function alternarCamposLogin() {
  const perfil = document.getElementById("selectPerfil").value;
  const groupTelefone = document.getElementById("groupTelefone");
  const groupSenha = document.getElementById("groupSenha");
  const btnAutoCadastro = document.getElementById("btnAutoCadastro");

  if (perfil === "Admin") {
    groupTelefone.hidden = true;
    groupSenha.hidden = false;
    btnAutoCadastro.hidden = true;
  } else {
    groupTelefone.hidden = false;
    groupSenha.hidden = true;
    btnAutoCadastro.hidden = false;
  }
}

// EXECUÇÃO DO LOGIN
async function executarLogin() {
  const perfil = document.getElementById("selectPerfil").value;

  if (perfil === "Admin") {
    const senha = document.getElementById("loginSenha").value;
    if (!senha) return alert("Digite a senha do administrador.");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "loginAdmin", senha: senha })
      });
      const json = await res.json();

      if (json.success) {
        exibirTela("admin");
        carregarEmprestimos();
      } else {
        alert("Senha incorreta!");
      }
    } catch (err) {
      alert("Erro ao conectar com a planilha. Verifique a URL em API_URL.");
      console.error(err);
    }

  } else {
    // Aluno ou Professor
    const tel = document.getElementById("loginTelefone").value;
    if (!tel) return alert("Digite o número de telefone.");

    try {
      const res = await fetch(`${API_URL}?action=buscarUsuarioPorTelefone&telefone=${tel}`);
      const json = await res.json();

      if (json.success) {
        document.getElementById("nomeLeitorLogado").innerText = json.usuario.Nome;
        exibirTela("leitor");
        carregarAcervo();
      } else {
        alert("Usuário não encontrado. Clique em '1º Acesso / Cadastrar-se' para criar sua conta.");
      }
    } catch (err) {
      alert("Erro ao buscar dados do leitor. Verifique se a URL da API está correta.");
      console.error(err);
    }
  }
}

function exibirTela(tela) {
  document.getElementById("secLogin").hidden = true;
  document.getElementById("secLeitor").hidden = true;
  document.getElementById("secAdmin").hidden = true;
  document.getElementById("btnSair").hidden = false;

  if (tela === "leitor") {
    document.getElementById("secLeitor").hidden = false;
  } else if (tela === "admin") {
    document.getElementById("secAdmin").hidden = false;
  }
}

function deslogar() {
  document.getElementById("secLogin").hidden = false;
  document.getElementById("secLeitor").hidden = true;
  document.getElementById("secAdmin").hidden = true;
  document.getElementById("btnSair").hidden = true;
  
  document.getElementById("loginTelefone").value = "";
  document.getElementById("loginSenha").value = "";
}

// AUTO CADASTRO DO LEITOR (1º ACESSO - CORRIGIDO)
async function salvarAutoCadastro() {
  const nomeEl = document.getElementById("autoNome");
  const emailEl = document.getElementById("autoEmail");
  const telefoneEl = document.getElementById("autoTelefone");
  const perfilEl = document.getElementById("autoPerfil");
  const turmaEl = document.getElementById("autoTurma");

  if (!nomeEl || !telefoneEl) {
    alert("Erro interno: Campos de formulário não encontrados no HTML.");
    return;
  }

  const nome = nomeEl.value.trim();
  const email = emailEl ? emailEl.value.trim() : "";
  const telefone = telefoneEl.value.trim();
  const perfil = perfilEl ? perfilEl.value : "Aluno";
  const turma = turmaEl ? turmaEl.value.trim() : "-";

  if (!nome || !telefone) {
    alert("Por favor, preencha o Nome Completo e o Telefone.");
    return;
  }

  if (API_URL.includes("SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI")) {
    alert("Aviso: Você precisa colar a URL do seu Google Apps Script no topo do arquivo app.js!");
    return;
  }

  const usuario = { nome, email, telefone, perfil, turma };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "cadastrarUsuario", usuario: usuario })
    });

    const json = await res.json();
    alert(json.message);

    if (json.success) {
      fecharModal("modalAutoCadastro");
      document.getElementById("loginTelefone").value = telefone;
      
      // Limpar campos do modal
      nomeEl.value = "";
      if (emailEl) emailEl.value = "";
      telefoneEl.value = "";
      if (turmaEl) turmaEl.value = "";
    }
  } catch (err) {
    alert("Erro ao salvar cadastro. Verifique se a URL do Apps Script foi implantada como 'Qualquer pessoa' (Anyone).");
    console.error("Detalhes do erro:", err);
  }
}

// ACERVO DO LEITOR
async function carregarAcervo() {
  try {
    const res = await fetch(`${API_URL}?action=getAcervo`);
    const json = await res.json();
    if (json.success) {
      acervoMemoria = json.data;
      renderizarAcervo(acervoMemoria);
    }
  } catch (err) {
    console.error("Erro ao carregar acervo:", err);
  }
}

function renderizarAcervo(lista) {
  const container = document.getElementById("gridAcervo");
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum livro encontrado no momento.</p>";
    return;
  }

  lista.forEach(livro => {
    const disponivel = parseInt(livro.Qtd_Disponivel) > 0;
    const capa = livro.Capa_URL || "https://via.placeholder.com/150x200?text=Sem+Capa";

    container.innerHTML += `
      <div class="card-livro">
        <img src="${capa}" alt="${livro.Título}">
        <h4>${livro.Título}</h4>
        <p><small>${livro.Autor}</small></p>
        <span class="badge ${disponivel ? 'badge-disponivel' : 'badge-esgotado'}">
          ${disponivel ? `Disponível (${livro.Qtd_Disponivel})` : 'Esgotado'}
        </span>
      </div>
    `;
  });
}

function filtrarAcervo() {
  const termo = document.getElementById("inputBusca").value.toLowerCase();
  const filtrados = acervoMemoria.filter(l => 
    (l.Título && l.Título.toLowerCase().includes(termo)) || 
    (l.Autor && l.Autor.toLowerCase().includes(termo)) ||
    (l.Categoria && l.Categoria.toLowerCase().includes(termo))
  );
  renderizarAcervo(filtrados);
}

// PAINEL DE EMPRÉSTIMO E DEVOLUÇÃO
async function confirmarEmprestimo() {
  const tel = document.getElementById("empTelefone").value;
  const idLivro = document.getElementById("empIdLivro").value;

  if (!tel || !idLivro) return alert("Preencha o telefone e o ID do livro!");

  try {
    const resUser = await fetch(`${API_URL}?action=buscarUsuarioPorTelefone&telefone=${tel}`);
    const jsonUser = await resUser.json();

    const resLivro = await fetch(`${API_URL}?action=buscarLivroPorId&idLivro=${idLivro}`);
    const jsonLivro = await resLivro.json();

    if (!jsonUser.success) return alert("Usuário não cadastrado!");
    if (!jsonLivro.success) return alert("Livro não encontrado!");

    dadosEmprestimoTemporario = { telefone: tel, idLivro: idLivro };

    document.getElementById("confNomeLeitor").innerText = jsonUser.usuario.Nome;
    document.getElementById("confTituloLivro").innerText = jsonLivro.livro.Título;

    abrirModal("modalConfirmacao");
  } catch (err) {
    alert("Erro ao checar dados na planilha.");
  }
}

async function executarEmprestimo() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "registrarEmprestimo", ...dadosEmprestimoTemporario })
    });
    const json = await res.json();

    if (json.success) {
      alert(`Empréstimo Registrado!\nVencimento: ${json.dataVencimento}`);
      fecharModal("modalConfirmacao");
      carregarEmprestimos();
    } else {
      alert(json.message);
    }
  } catch (err) {
    alert("Erro ao gravar empréstimo.");
  }
}

async function carregarEmprestimos() {
  try {
    const res = await fetch(`${API_URL}?action=getEmprestimos`);
    const json = await res.json();
    const tabela = document.getElementById("tabelaEmprestimos");
    tabela.innerHTML = "";

    if (json.success) {
      json.data.filter(e => e.Status === "Ativo").forEach(emp => {
        tabela.innerHTML += `
          <tr>
            <td>${emp.Nome}</td>
            <td>${emp.Telefone}</td>
            <td>${emp.ID_Livro}</td>
            <td>${emp.DataVencimento}</td>
            <td><button class="btn-devolver" onclick="devolverLivro('${emp.ID}')">Dar Baixa</button></td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error("Erro ao carregar lista de empréstimos:", err);
  }
}

async function devolverLivro(idEmprestimo) {
  if (!confirm("Confirmar a devolução deste livro?")) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "registrarDevolucao", idEmprestimo: idEmprestimo })
    });
    const json = await res.json();

    if (json.success) {
      if (json.alertaReserva) {
        alert(`🚨 ATENÇÃO: O livro "${json.tituloLivro}" possui reserva para o leitor: ${json.proximoLeitor}. Guarde o exemplar para ele!`);
      } else {
        alert("Devolução registrada com sucesso!");
      }
      carregarEmprestimos();
    }
  } catch (err) {
    alert("Erro ao registrar devolução.");
  }
}

// OPERAÇÕES DE CADASTRO (ADMIN)
async function salvarUsuario() {
  const usuario = {
    nome: document.getElementById("cadNome").value,
    email: document.getElementById("cadEmail").value,
    telefone: document.getElementById("cadTelefone").value,
    perfil: document.getElementById("cadPerfil").value,
    turma: document.getElementById("cadTurma").value
  };

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "cadastrarUsuario", usuario: usuario })
  });
  const json = await res.json();
  alert(json.message);
  if (json.success) fecharModal("modalCadUsuario");
}

async function salvarLivro() {
  const livro = {
    titulo: document.getElementById("cadTitulo").value,
    autor: document.getElementById("cadAutor").value,
    isbn: document.getElementById("cadIsbn").value,
    categoria: document.getElementById("cadCategoria").value,
    capaUrl: document.getElementById("cadCapa").value,
    qtdTotal: document.getElementById("cadQtd").value
  };

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "cadastrarLivro", livro: livro })
  });
  const json = await res.json();
  alert(json.message);
  if (json.success) fecharModal("modalCadLivro");
}

// CONTROLADORES DOS MODAIS
function abrirModal(id) { document.getElementById(id).hidden = false; }
function fecharModal(id) { document.getElementById(id).hidden = true; }
