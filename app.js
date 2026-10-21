const API_URL = "https://script.google.com/macros/s/AKfycbwCVnRUqWDrd3irfBvMO_lgLe713w1z9QZRKhBBWkwJA687mGip3E4mQbnS5CuJsJcTog/exec";

let acervoMemoria = [];
let dadosEmprestimoTemporario = {};

// CONTROLE DE CAMPOS DO LOGIN
function alternarCamposLogin() {
  const perfil = document.getElementById("selectPerfil").value;
  const groupTelefone = document.getElementById("groupTelefone");
  const groupSenha = document.getElementById("groupSenha");

  if (perfil === "Admin") {
    groupTelefone.classList.add("hidden");
    groupSenha.classList.remove("hidden");
  } else {
    groupTelefone.classList.remove("hidden");
    groupSenha.classList.add("hidden");
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
      alert("Erro ao validar login.");
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
        alert("Usuário não encontrado. Solicite o cadastro na biblioteca.");
      }
    } catch (err) {
      alert("Erro ao buscar dados do leitor.");
    }
  }
}

function exibirTela(tela) {
  document.getElementById("secLogin").classList.add("hidden");
  document.getElementById("secLeitor").classList.add("hidden");
  document.getElementById("secAdmin").classList.add("hidden");
  document.getElementById("btnSair").classList.remove("hidden");

  if (tela === "leitor") {
    document.getElementById("secLeitor").classList.remove("hidden");
  } else if (tela === "admin") {
    document.getElementById("secAdmin").classList.remove("hidden");
  }
}

function deslogar() {
  document.getElementById("secLogin").classList.remove("hidden");
  document.getElementById("secLeitor").classList.add("hidden");
  document.getElementById("secAdmin").classList.add("hidden");
  document.getElementById("btnSair").classList.add("hidden");
  
  // Limpar campos
  document.getElementById("loginTelefone").value = "";
  document.getElementById("loginSenha").value = "";
}

// CATALOGO DO LEITOR
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
    l.Título.toLowerCase().includes(termo) || 
    l.Autor.toLowerCase().includes(termo) ||
    l.Categoria.toLowerCase().includes(termo)
  );
  renderizarAcervo(filtrados);
}

// EMPRÉSTIMO E DEVOLUÇÃO
async function confirmarEmprestimo() {
  const tel = document.getElementById("empTelefone").value;
  const idLivro = document.getElementById("empIdLivro").value;

  if (!tel || !idLivro) return alert("Preencha todos os campos!");

  try {
    const resUser = await fetch(`${API_URL}?action=buscarUsuarioPorTelefone&telefone=${tel}`);
    const jsonUser = await resUser.json();

    const resLivro = await fetch(`${API_URL}?action=buscarLivroPorId&idLivro=${idLivro}`);
    const jsonLivro = await resLivro.json();

    if (!jsonUser.success) return alert("Usuário não encontrado!");
    if (!jsonLivro.success) return alert("Livro não encontrado!");

    dadosEmprestimoTemporario = { telefone: tel, idLivro: idLivro };

    document.getElementById("confNomeLeitor").innerText = jsonUser.usuario.Nome;
    document.getElementById("confTituloLivro").innerText = jsonLivro.livro.Título;

    abrirModal("modalConfirmacao");
  } catch (err) {
    alert("Erro ao validar dados.");
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
    alert("Erro ao efetuar empréstimo.");
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
    console.error("Erro ao carregar empréstimos:", err);
  }
}

async function devolverLivro(idEmprestimo) {
  if (!confirm("Confirmar a devolução deste exemplar?")) return;

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
        alert("Devolução registrada!");
      }
      carregarEmprestimos();
    }
  } catch (err) {
    alert("Erro na devolução.");
  }
}

// CADASTROS
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

// CONTROLADORES DE MODAL
function abrirModal(id) { document.getElementById(id).classList.remove("hidden"); }
function fecharModal(id) { document.getElementById(id).classList.add("hidden"); }
