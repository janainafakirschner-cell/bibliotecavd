// ============================================================================
// 1. LINK DA SUA PLANILHA / GOOGLE APPS SCRIPT (COLE A SUA URL ABAIXO)
// ============================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbxjkauU-Y0eX8HXnmt9NOjytTLoMMOin_Qj6iBETq4XC77Er08z6D0_JaR61yd9pgi2fw/exec"; 
// Exemplo: const API_URL = "https://script.google.com/macros/s/AKfycbx.../exec";


// ============================================================================
// 2. CORREÇÃO MANUAL PARA ISBNS COM DADOS ERRADOS NAS APIS PÚBLICAS
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
// 4. INTERFACE E CONTROLE DE NAVEGAÇÃO
// ============================================================================

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


// ============================================================================
// 5. AUTENTICAÇÃO E PRIMEIRO ACESSO (INTEGRAÇÃO COM A PLANILHA)
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
      msg.innerText = "Erro ao realizar o cadastro no servidor.";
    }
    return;
  }

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
// 6. ACERVO DE LIVROS E RESERVAS
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
// 8. BUSCA DE ISBN (COM VERIFICAÇÃO DE DADOS LOCAIS)
// ============================================================================
async function buscarISBN(event) {
  if (event) event.preventDefault();

  const inputIsbn = document.getElementById('isbnLivro');
  const isbn = inputIsbn.value.replace(/\D/g, "");

  if (!isbn) {
    alert("Por favor, digite ou escaneie o número do ISBN!");
    return;
  }

  // 1. VERIFICA SE O ISBN JÁ TEM CORREÇÃO MANUAL NO CÓDIGO
  if (ISBNS_CORRIGIDOS[isbn]) {
    document.getElementById('tituloLivro').value = ISBNS_CORRIGIDOS[isbn].titulo;
    document.getElementById('autorLivro').value = ISBNS_CORRIGIDOS[isbn].autor;
    alert("Livro identificado localmente: O Jovem Lennon!");
    return;
  }

  // 2. TENTA A BRASILAPI
  try {
    let res = await fetch(`https://brasilapi.com.br/api/isbn/v1/${isbn}`);
    if (res.ok) {
      let data = await res.json();
      document.getElementById('tituloLivro').value = data.title || "";
      document.getElementById('autorLivro').value = data.authors ? data.authors.join(", ") : "";
      alert("Livro encontrado na BrasilAPI! Verifique os dados antes de salvar.");
      return;
    }
  } catch (e) {
    console.log("BrasilAPI indisponível...");
  }

  // 3. TENTA O GOOGLE BOOKS
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
  } catch (e) {
    console.log("Google Books indisponível...");
  }

  alert("ISBN lido! Caso os campos não tenham sido preenchidos ou estejam incorretos, digite o Título e Autor manualmente.");
}


// ============================================================================
// 9. CADASTRO DE NOVO LIVRO NO PAINEL ADMIN (COM LIMPEZA COMPLETA)
// ============================================================================
async function cadastrarLivro() {
  const titulo = document.getElementById('tituloLivro').value;
  const autor = document.getElementById('autorLivro').value;
  const qtd = document.getElementById('qtdLivro').value;
  const isbn = document.getElementById('isbnLivro').value;
