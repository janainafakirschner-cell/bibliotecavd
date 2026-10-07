// ============================================================================
// 1. LINK DA SUA PLANILHA / GOOGLE APPS SCRIPT
// ============================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwptlsouQZAEKrkBwzy0fRB0L8CqGaIiemdJEz-te-i4Sd_e9d76bTrxdI6c9LI2e-3Mg/exec"; 


// ============================================================================
// 2. CORREÇÃO MANUAL PARA ISBNS CONHECIDOS
// ============================================================================
const ISBNS_CORRIGIDOS = {
  "8574921181": {
    titulo: "O Jovem Lennon",
    autor: "Lesley-Ann Jones"
  },
  "9788574921181": {
    titulo: "O Jovem Lennon",
    autor: "Lesley-Ann Jones"
  }
};


// ============================================================================
// 3. VARIÁVEIS GLOBAIS DE CONTROLE
// ============================================================================
let usuarioLogado = null;
let senhaAdminLogado = "";
let modoCadastro = false;
let html5QrCode = null;


// ============================================================================
// 4. CONTROLE DE INTERFACE E PRIMEIRO ACESSO
// ============================================================================
window.addEventListener('DOMContentLoaded', function() {
  const selectPerfil = document.getElementById('selectTipoPerfil');
  if (selectPerfil) {
    selectPerfil.addEventListener('change', atualizarPerfil);
  }
});

function atualizarPerfil() {
  const perfil = document.getElementById('selectTipoPerfil').value;
  const boxTel = document.getElementById('boxTelefone');
  const boxSenha = document.getElementById('boxSenhaAdmin');
  const btnModo = document.getElementById('btnModoAcesso');

  if (perfil === 'Admin') {
    boxTel.style.display = 'none';
    boxSenha.style.display = 'flex';
    btnModo.style.display = 'none';
    if (modoCadastro) alternarModoAcesso();
  } else {
    boxTel.style.display = 'flex';
    boxSenha.style.display = 'none';
    btnModo.style.display = 'inline';
  }
}

function alternarModoAcesso() {
  modoCadastro = !modoCadastro;

  const titulo = document.getElementById('tituloAcesso');
  const btnAcesso = document.getElementById('btnAcesso');
  const btnModo = document.getElementById('btnModoAcesso');
  const boxNome = document.getElementById('boxNome');
  const boxEmail = document.getElementById('boxEmail');

  if (modoCadastro) {
    titulo.innerText = "Primeiro Acesso - Criar Conta";
    btnAcesso.innerText = "Concluir Cadastro";
    btnModo.innerText = "Já tem cadastro? Faça login aqui.";
    boxNome.style.display = 'flex';
    boxEmail.style.display = 'flex';
  } else {
    titulo.innerText = "Acesso à Biblioteca";
    btnAcesso.innerText = "Entrar no Sistema";
    btnModo.innerText = "Primeiro acesso? Cadastre-se aqui.";
    boxNome.style.display = 'none';
    boxEmail.style.display = 'none';
  }
}


// ============================================================================
// 5. AUTENTICAÇÃO E CADASTRO (ENVIOS EM PARÂMETROS PARA EVITAR CORS)
// ============================================================================
async function processarAcesso() {
  const perfil = document.getElementById('selectTipoPerfil').value;
  const msg = document.getElementById('msgLoginAluno');
  msg.innerText = "";

  if (perfil === 'Admin') {
    const senha = document.getElementById('inputSenhaAdminPerfil').value;
    if (senha === "123456") {
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

  // MODO PRIMEIRO ACESSO (CADASTRO)
  if (modoCadastro) {
    const nome = document.getElementById('inputNomeUsuario').value.trim();
    const email = document.getElementById('inputEmailUsuario').value.trim();

    if (!nome || !email) {
      msg.innerText = "Por favor, preencha o seu nome completo e e-mail!";
      return;
    }

    msg.innerText = "A criar o seu cadastro...";

    try {
      const params = new URLSearchParams();
      params.append("acao", "cadastrarUsuario");
      params.append("nome", nome);
      params.append("email", email);
      params.append("telefone", telInput);
      params.append("perfil", perfil);

      const res = await fetch(API_URL, {
        method: "POST",
        body: params
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
      console.error(err);
      msg.innerText = "Erro ao conectar ao servidor. Verifique a URL do Web App e as permissões.";
    }
    return;
  }

  // MODO LOGIN
  msg.innerText = "A validar cadastro...";
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


// ============================================================================
// 6. ACERVO E RESERVAS
// ============================================================================
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


// ============================================================================
// 7. SCANNER DE CÂMERA
// ============================================================================
async function iniciarScanner() {
  const areaScanner = document.getElementById('areaScanner');
  areaScanner.classList.remove('hidden');

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        document.getElementById('isbnLivro').value = decodedText;
        fecharScanner();
        buscarISBN();
      },
      (errorMessage) => {}
    );
  } catch (err) {
    alert("Erro ao abrir a câmera! Verifique se deu permissão de acesso à câmera no seu navegador.");
    console.error(err);
    fecharScanner();
  }
}

async function fecharScanner() {
  const areaScanner = document.getElementById('areaScanner');
  if (areaScanner) {
    areaScanner.classList.add('hidden');
  }

  if (html5QrCode && html5QrCode.isScanning) {
    await html5QrCode.stop();
  }
}


// ============================================================================
// 8. BUSCA DE ISBN
// ============================================================================
async function buscarISBN(event) {
  if (event) event.preventDefault();

  const inputIsbn = document.getElementById('isbnLivro');
  const isbn = inputIsbn.value.replace(/\D/g, "");

  if (!isbn) {
    alert("Por favor, digite ou escaneie o número do ISBN!");
    return;
  }

  if (ISBNS_CORRIGIDOS[isbn]) {
    document.getElementById('tituloLivro').value = ISBNS_CORRIGIDOS[isbn].titulo;
    document.getElementById('autorLivro').value = ISBNS_CORRIGIDOS[isbn].autor;
    alert("Livro localizado!");
    return;
  }

  try {
    let res = await fetch(`https://brasilapi.com.br/api/isbn/v1/${isbn}`);
    if (res.ok) {
      let data = await res.json();
      document.getElementById('tituloLivro').value = data.title || "";
      document.getElementById('autorLivro').value = data.authors ? data.authors.join(", ") : "";
      alert("Livro encontrado na BrasilAPI! Verifique os dados antes de salvar.");
      return;
    }
  } catch (e) {}

  try {
    let res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    let data = await res.json();

    if (data.totalItems > 0 && data.items && data.items.length > 0) {
      const info = data.items[0].volumeInfo;
      document.getElementById('tituloLivro').value = info.title || "";
      document.getElementById('autorLivro').value = info.authors ? info.authors.join(", ") : "";
      alert("Livro encontrado no Google Books! Verifique os dados antes de salvar.");
      return;
    }
  } catch (e) {}

  alert("ISBN lido! Preencha o Título e Autor manualmente.");
}


// ============================================================================
// 9. CADASTRO DE NOVO LIVRO
// ============================================================================
async function cadastrarLivro() {
  const titulo = document.getElementById('tituloLivro').value;
  const autor = document.getElementById('autorLivro').value;
  const qtd = document.getElementById('qtdLivro').value;
  const isbn = document.getElementById('isbnLivro').value;

  if (!titulo) return alert("Por favor, digite o título do livro!");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        acao: "cadastrarLivro",
        senhaAdmin: senhaAdminLogado,
        isbn: isbn,
        titulo: titulo,
        autor: autor,
        qtdTotal: qtd
      })
    });

    const data = await res.json();
    alert(data.mensagem);

    document.getElementById('isbnLivro').value = "";
    document.getElementById('tituloLivro').value = "";
    document.getElementById('autorLivro').value = "";
    document.getElementById('qtdLivro').value = "1";

    fecharScanner();
  } catch (err) {
    alert("Erro ao gravar livro na planilha.");
  }
}

function sair() {
  location.reload();
}
