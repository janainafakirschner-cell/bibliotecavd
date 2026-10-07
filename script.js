// ============================================================================
// 1. LINK DA SUA PLANILHA / GOOGLE APPS SCRIPT (COLE O SEU LINK AQUI ABAIXO)
// ============================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbxjkauU-Y0eX8HXnmt9NOjytTLoMMOin_Qj6iBETq4XC77Er08z6D0_JaR61yd9pgi2fw/exec"; 
// Exemplo de como deve ficar:
// const API_URL = "https://script.google.com/macros/s/AKfycbx.../exec";


// ============================================================================
// 2. LÓGICA DO SISTEMA (NÃO PRECISA ALTERAR NADA ABAIXO)
// ============================================================================
let usuarioLogado = null;
let senhaAdminLogado = "";
let modoCadastro = false;

// Alterna a interface de acordo com a seleção de perfil
document.getElementById('selectTipoPerfil').addEventListener('change', function() {
  const perfil = this.value;
  const boxTel = document.getElementById('boxTelefone');
  const boxSenha = document.getElementById('boxSenhaAdmin');
  const linkModo = document.getElementById('linkModoAcesso');

  if (perfil === 'Admin') {
    boxTel.classList.add('hidden');
    boxSenha.classList.remove('hidden');
    linkModo.classList.add('hidden');
  } else {
    boxTel.classList.remove('hidden');
    boxSenha.classList.add('hidden');
    linkModo.classList.remove('hidden');
  }
});

// Alterna entre a tela de Login e a tela de Primeiro Acesso
function alternarModoAcesso(event) {
  event.preventDefault();
  modoCadastro = !modoCadastro;

  const titulo = document.getElementById('tituloAcesso');
  const btn = document.getElementById('btnAcesso');
  const link = document.getElementById('linkModoAcesso');
  const boxNome = document.getElementById('boxNome');
  const boxEmail = document.getElementById('boxEmail');

  if (modoCadastro) {
    titulo.innerText = "Primeiro Acesso - Criar Conta";
    btn.innerText = "Concluir Cadastro";
    link.innerText = "Já tem cadastro? Faça login aqui.";
    boxNome.classList.remove('hidden');
    boxEmail.classList.remove('hidden');
  } else {
    titulo.innerText = "Acesso à Biblioteca";
    btn.innerText = "Entrar no Sistema";
    link.innerText = "Primeiro acesso? Cadastre-se aqui.";
    boxNome.classList.add('hidden');
    boxEmail.classList.add('hidden');
  }
}

// Processa a Entrada ou o Novo Cadastro
async function processarAcesso() {
  const perfil = document.getElementById('selectTipoPerfil').value;
  const msg = document.getElementById('msgLoginAluno');
  msg.innerText = "";

  // 1. ACESSO DO ADMINISTRADOR
  if (perfil === 'Admin') {
    const senha = document.getElementById('inputSenhaAdminPerfil').value;
    if (senha === "123456") { // Senha padrão
      senhaAdminLogado = senha;
      document.getElementById('loginAlunoCard').classList.add('hidden');
      document.getElementById('painelAdmin').classList.remove('hidden');
    } else {
      msg.innerText = "Senha de Administrador incorreta!";
    }
    return;
  }

  const telInput = document.getElementById('inputTelAluno').value.replace(/\D/g, "");
  if (!telInput || telInput.length < 12) {
    msg.innerText = "Digite o número completo com DDD (Ex: 5581999998888).";
    return;
  }

  // 2. MODO PRIMEIRO ACESSO (CADASTRO)
  if (modoCadastro) {
    const nome = document.getElementById('inputNomeUsuario').value.trim();
    const email = document.getElementById('inputEmailUsuario').value.trim();

    if (!nome || !email) {
      msg.innerText = "Por favor, preencha o seu nome e e-mail!";
      return;
    }

    msg.innerText = "A criar o seu cadastro na planilha...";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          acao: "cadastrarUsuario",
          nome: nome,
          email: email,
          telefone: telInput,
          perfil: perfil
        })
      });

      const data = await res.json();

      if (data.status === "sucesso") {
        usuarioLogado = data.aluno;
        document.getElementById('nomeAlunoLogado').innerText = `${usuarioLogado.nome} (${perfil})`;
        document.getElementById('loginAlunoCard').classList.add('hidden');
        document.getElementById('painelAluno').classList.remove('hidden');
        carregarAcervo();
      } else {
        msg.innerText = data.mensagem;
      }
    } catch (err) {
      msg.innerText = "Erro ao realizar cadastro no servidor.";
    }
    return;
  }

  // 3. MODO LOGIN NORMAL
  msg.innerText = "A validar o seu cadastro...";
  try {
    const res = await fetch(`${API_URL}?acao=loginAluno&telefone=${encodeURIComponent(telInput)}`);
    const data = await res.json();

    if (data.status === "sucesso") {
      usuarioLogado = data.aluno;
      document.getElementById('nomeAlunoLogado').innerText = `${usuarioLogado.nome} (${perfil})`;
      document.getElementById('loginAlunoCard').classList.add('hidden');
      document.getElementById('painelAluno').classList.remove('hidden');
      carregarAcervo();
    } else {
      msg.innerText = data.mensagem;
    }
  } catch (err) {
    msg.innerText = "Erro ao conectar ao servidor.";
  }
}

// Carrega a lista de livros do acervo a partir da planilha
async function carregarAcervo() {
  const grid = document.getElementById('gridLivros');
  grid.innerHTML = "A carregar os livros...";

  try {
    const res = await fetch(`${API_URL}?acao=getLivros`);
    const data = await res.json();

    if (data.status === "sucesso") {
      grid.innerHTML = "";
      data.livros.forEach(livro => {
        const div = document.createElement('div');
        div.className = "livro-card";
        div.innerHTML = `
          <img src="${livro.capaUrl || 'https://via.placeholder.com/120x160?text=Sem+Capa'}" alt="Capa">
          <h4>${livro.titulo}</h4>
          <p><small>${livro.autor}</small></p>
          <p>Disponíveis: ${livro.qtdDisponivel}</p>
          <button onclick="reservarLivro('${livro.id}')" ${livro.qtdDisponivel < 1 ? 'disabled style="background:#ccc;"' : ''}>
            ${livro.qtdDisponivel < 1 ? 'Esgotado' : 'Reservar'}
          </button>
        `;
        grid.appendChild(div);
      });
    }
  } catch (err) {
    grid.innerHTML = "Erro ao carregar o acervo de livros.";
  }
}

// Executa a reserva e grava na planilha
async function reservarLivro(idLivro) {
  if (!usuarioLogado) return;

  if (!confirm("Confirmar a reserva deste livro?")) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        acao: "reservarLivro",
        idLivro: idLivro,
        idAluno: usuarioLogado.id
      })
    });

    const data = await res.json();
    alert(data.mensagem);
    carregarAcervo();
  } catch (err) {
    alert("Erro ao realizar a reserva.");
  }
}

// Busca direta de ISBN (Google Books + BrasilAPI)
async function buscarISBN(event) {
  const inputIsbn = document.getElementById('isbnLivro');
  const isbn = inputIsbn.value.replace(/\D/g, "");

  if (!isbn) {
    alert("Por favor, digite o número do ISBN!");
    return;
  }

  const btn = event.target;
  btn.innerText = "A buscar...";
  btn.disabled = true;

  try {
    // 1. Consulta a API do Google Books
    let res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    let data = await res.json();

    if (data.totalItems > 0 && data.items && data.items.length > 0) {
      const info = data.items[0].volumeInfo;
      document.getElementById('tituloLivro').value = info.title || "";
      document.getElementById('autorLivro').value = info.authors ? info.authors.join(", ") : "";
      alert("Livro encontrado com sucesso!");
      btn.innerText = "Buscar Dados do Livro";
      btn.disabled = false;
      return;
    }

    // 2. Consulta a BrasilAPI
    res = await fetch(`https://brasilapi.com.br/api/isbn/v1/${isbn}`);
    if (res.ok) {
      data = await res.json();
      document.getElementById('tituloLivro').value = data.title || "";
      document.getElementById('autorLivro').value = data.authors ? data.authors.join(", ") : "";
      alert("Livro encontrado com sucesso!");
      btn.innerText = "Buscar Dados do Livro";
      btn.disabled = false;
      return;
    }

    alert("ISBN não encontrado nas bases automáticas. Pode preencher o Título e o Autor manualmente!");
  } catch (err) {
    alert("Não foi possível consultar o ISBN automaticamente. Por favor, digite o título e autor manualmente.");
  } finally {
    btn.innerText = "Buscar Dados do Livro";
    btn.disabled = false;
  }
}

// Salva um novo livro na planilha (Painel Admin)
async function cadastrarLivro() {
  const titulo = document.getElementById('tituloLivro').value;
  const autor = document.getElementById('autorLivro').value;
  const qtd = document.getElementById('qtdLivro').value;

  if (!titulo) return alert("Digite o título do livro!");

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      acao: "cadastrarLivro",
      senhaAdmin: senhaAdminLogado,
      titulo: titulo,
      autor: autor,
      qtdTotal: qtd
    })
  });

  const data = await res.json();
  alert(data.mensagem);
}

function sair() {
  location.reload();
}
