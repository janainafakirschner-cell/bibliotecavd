// URL do Google Apps Script (Substitua pela sua URL gerada na implantação)
const API_URL = "https://script.google.com/macros/s/AKfycbwCVnRUqWDrd3irfBvMO_lgLe713w1z9QZRKhBBWkwJA687mGip3E4mQbnS5CuJsJcTog/exec";

let acervoMemoria = [];
let dadosEmprestimoTemporario = {};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  carregarAcervo();
});

// NAVEGAÇÃO DE ABAS
function mudarAba(aba) {
  document.getElementById("secLeitor").classList.remove("active");
  document.getElementById("secAdmin").classList.remove("active");
  document.getElementById("btnNavLeitor").classList.remove("active");
  document.getElementById("btnNavAdmin").classList.remove("active");

  if (aba === "leitor") {
    document.getElementById("secLeitor").classList.add("active");
    document.getElementById("btnNavLeitor").classList.add("active");
  } else {
    document.getElementById("secAdmin").classList.add("active");
    document.getElementById("btnNavAdmin").classList.add("active");
  }
}

// 1. ÁREA DO LEITOR (ACERVO)
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
    const capa = livro.Capa_URL || "https://via.placeholder.com/150x220?text=Sem+Capa";

    container.innerHTML += `
      <div class="card-livro">
        <img src="${capa}" alt="${livro.Título}">
        <h4>${livro.Título}</h4>
        <p><small>${livro.Autor}</small></p>
        <span class="badge ${disponivel ? 'badge-disponivel' : 'badge-esgotado'}">
          ${disponivel ? `Disponível (${livro.Qtd_Disponivel})` : 'Esgotado'}
        </span>
        ${!disponivel ? `<button style="margin-top:10px;" onclick="solicitarReserva('${livro.ID_Livro}', '${livro.Título}')">Reservar</button>` : ''}
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

// 2. PAINEL ADMIN
async function loginAdmin() {
  const senha = document.getElementById("senhaAdmin").value;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "loginAdmin", senha: senha })
    });
    const json = await res.json();
    
    if (json.success) {
      document.getElementById("boxLoginAdmin").classList.add("hidden");
      document.getElementById("painelAdmin").classList.remove("hidden");
      carregarEmprestimos();
    } else {
      alert("Senha incorreta!");
    }
  } catch (err) {
    alert("Erro ao validar login.");
  }
}

// VALIDAÇÃO PRÉVIA E CONFIRMAÇÃO DE EMPRÉSTIMO
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
    alert("Erro ao buscar informações para confirmação.");
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
      carregarAcervo();
      carregarEmprestimos();
    } else {
      alert(json.message);
    }
  } catch (err) {
    alert("Erro ao efetuar empréstimo.");
  }
}

// CARREGAR E PROCESSAR DEVOLUÇÃO
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
        alert(`🚨 ATENÇÃO: O livro "${json.tituloLivro}" possui uma reserva pendente para o leitor: ${json.proximoLeitor}. Guarde o exemplar para ele!`);
      } else {
        alert("Devolução registrada com sucesso!");
      }
      carregarAcervo();
      carregarEmprestimos();
    }
  } catch (err) {
    alert("Erro ao registrar devolução.");
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
  if (json.success) {
    fecharModal("modalCadLivro");
    carregarAcervo();
  }
}

// MODAIS
function abrirModal(id) { document.getElementById(id).style.display = "flex"; }
function fecharModal(id) { document.getElementById(id).style.display = "none"; }
