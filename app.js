// ATENÇÃO: Substitua a URL abaixo pela sua URL do Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbwCVnRUqWDrd3irfBvMO_lgLe713w1z9QZRKhBBWkwJA687mGip3E4mQbnS5CuJsJcTog/exec";

let acervoMemoria = [];
let usuarioLogado = null;
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
      alert("Erro ao conectar com a planilha.");
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
        usuarioLogado = json.usuario;
        document.getElementById("nomeLeitorLogado").innerText = usuarioLogado.Nome;
        exibirTela("leitor");
        carregarAcervo();
      } else {
        alert("Usuário não encontrado. Clique em '1º Acesso / Cadastrar-se' para criar sua conta.");
      }
    } catch (err) {
      alert("Erro ao buscar dados do leitor.");
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
  usuarioLogado = null;
  document.getElementById("secLogin").hidden = false;
  document.getElementById("secLeitor").hidden = true;
  document.getElementById("secAdmin").hidden = true;
  document.getElementById("btnSair").hidden = true;
  
  document.getElementById("loginTelefone").value = "81";
  document.getElementById("loginSenha").value = "";
}

// AUTO CADASTRO DO LEITOR (1º ACESSO)
async function salvarAutoCadastro() {
  const nomeEl = document.getElementById("autoNome");
  const emailEl = document.getElementById("autoEmail");
  const telefoneEl = document.getElementById("autoTelefone");
  const perfilEl = document.getElementById("autoPerfil");
  const turmaEl = document.getElementById("autoTurma");

  if (!nomeEl || !telefoneEl) return alert("Erro interno nos campos.");

  const nome = nomeEl.value.trim();
  const email = emailEl ? emailEl.value.trim() : "";
  const telefone = telefoneEl.value.trim();
  const perfil = perfilEl ? perfilEl.value : "Aluno";
  const turma = turmaEl ? turmaEl.value.trim() : "-";

  if (!nome || !telefone) return alert("Preencha Nome e Telefone.");

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
      nomeEl.value = "";
      if (emailEl) emailEl.value = "";
      if (turmaEl) turmaEl.value = "";
    }
  } catch (err) {
    alert("Erro ao realizar cadastro.");
  }
}

// CARREGAR E RENDERIZAR ACERVO POR CATEGORIA E EM ORDEM ALFABÉTICA
async function carregarAcervo() {
  try {
    const res = await fetch(`${API_URL}?action=getAcervo`);
    const json = await res.json();
    if (json.success) {
      acervoMemoria = json.data;
      renderizarAcervoPorCategorias(acervoMemoria);
    }
  } catch (err) {
    console.error("Erro ao carregar acervo:", err);
  }
}

function renderizarAcervoPorCategorias(listaLivros) {
  const container = document.getElementById("gridAcervo");
  container.innerHTML = "";

  if (!listaLivros || listaLivros.length === 0) {
    container.innerHTML = "<p>Nenhum livro encontrado no momento.</p>";
    return;
  }

  // 1. Mapear livros por categorias (Trata categorias separadas por vírgula)
  const categoriasMap = {};

  listaLivros.forEach(livro => {
    const stringCategorias = livro.Categoria || "Geral";
    // Divide por vírgula e limpa espaços extras
    const categorias = stringCategorias.split(",").map(c => c.trim()).filter(c => c.length > 0);

    categorias.forEach(cat => {
      // Normalizar nome da categoria para chave
      const catChave = cat.toLowerCase();
      if (!categoriasMap[catChave]) {
        categoriasMap[catChave] = {
          nomeFormatado: cat,
          livros: []
        };
      }
      
      // Evita duplicar o mesmo livro na mesma categoria
      const jaExiste = categoriasMap[catChave].livros.some(l => l.ID_Livro === livro.ID_Livro);
      if (!jaExiste) {
        categoriasMap[catChave].livros.push(livro);
      }
    });
  });

  // 2. Ordenar Categorias em Ordem Alfabética (A-Z)
  const categoriasOrdenadas = Object.keys(categoriasMap).sort((a, b) => 
    categoriasMap[a].nomeFormatado.localeCompare(categoriasMap[b].nomeFormatado, 'pt-BR', { sensitivity: 'base' })
  );

  // 3. Renderizar cada Categoria e seus Livros ordenados de A-Z
  categoriasOrdenadas.forEach(chaveCat => {
    const categoria = categoriasMap[chaveCat];

    // Ordenar os livros da categoria em Ordem Alfabética por Título (A-Z)
    categoria.livros.sort((a, b) => (a.Título || "").localeCompare(b.Título || "", 'pt-BR', { sensitivity: 'base' }));

    let HTMLCategoria = `
      <div class="categoria-secao">
        <h3 class="categoria-titulo">📌 ${categoria.nomeFormatado}</h3>
    `;

    categoria.livros.forEach(livro => {
      const qtdDisponivel = parseInt(livro.Qtd_Disponivel) || 0;
      const disponivel = qtdDisponivel > 0;

      HTMLCategoria += `
        <div class="item-livro-limpo">
          <div class="item-livro-info">
            <h4>${livro.Título}</h4>
            <p><strong>Autor:</strong> ${livro.Autor || "Não informado"}</p>
          </div>
          <div>
            ${disponivel 
              ? `<span class="badge badge-disponivel">Disponível (${qtdDisponivel})</span>` 
              : `<button class="btn-reservar-ativo" onclick="solicitarReserva('${livro.ID_Livro}', '${livro.Título}')">Reservar</button>`
            }
          </div>
        </div>
      `;
    });

    HTMLCategoria += `</div>`;
    container.innerHTML += HTMLCategoria;
  });
}

function filtrarAcervo() {
  const termo = document.getElementById("inputBusca").value.toLowerCase();
  
  if (!termo) {
    renderizarAcervoPorCategorias(acervoMemoria);
    return;
  }

  const filtrados = acervoMemoria.filter(l => 
    (l.Título && l.Título.toLowerCase().includes(termo)) || 
    (l.Autor && l.Autor.toLowerCase().includes(termo)) ||
    (l.Categoria && l.Categoria.toLowerCase().includes(termo))
  );

  renderizarAcervoPorCategorias(filtrados);
}

// AÇÃO DE RESERVA DE LIVRO
async function solicitarReserva(idLivro, tituloLivro) {
  if (!usuarioLogado) {
    alert("Erro: Leitor não identificado.");
    return;
  }

  if (!confirm(`Deseja reservar o livro "${tituloLivro}"?\nVocê receberá uma notificação quando ele for devolvido.`)) {
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registrarReserva",
        idUsuario: usuarioLogado.ID || usuarioLogado.Telefone,
        nomeUsuario: usuarioLogado.Nome,
        idLivro: idLivro,
        tituloLivro: tituloLivro
      })
    });

    const json = await res.json();
    alert(json.message);
  } catch (err) {
    alert("Erro ao processar reserva.");
    console.error(err);
  }
}

// PAINEL DE EMPRÉSTIMO E DEVOLUÇÃO (ADMIN)
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
    console.error("Erro ao carregar empréstimos:", err);
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

// CADASTROS (ADMIN)
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

// CONTROLADORES DE MODAIS
function abrirModal(id) { document.getElementById(id).hidden = false; }
function fecharModal(id) { document.getElementById(id).hidden = true; }
