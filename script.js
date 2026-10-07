// ATENÇÃO: Substitua a URL abaixo pela URL da sua Execução do Web App no Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxjkauU-Y0eX8HXnmt9NOjytTLoMMOin_Qj6iBETq4XC77Er08z6D0_JaR61yd9pgi2fw/exec";

let usuarioLogado = null;
let senhaAdminLogado = "";

// Alterna os campos visíveis ao mudar o select de perfil
document.getElementById('selectTipoPerfil').addEventListener('change', function() {
  const perfil = this.value;
  const boxTel = document.getElementById('boxTelefone');
  const boxSenha = document.getElementById('boxSenhaAdmin');

  if (perfil === 'Admin') {
    boxTel.classList.add('hidden');
    boxSenha.classList.remove('hidden');
  } else {
    boxTel.classList.remove('hidden');
    boxSenha.classList.add('hidden');
  }
});

// Processa a entrada no sistema
async function processarAcesso() {
  const perfil = document.getElementById('selectTipoPerfil').value;
  const msg = document.getElementById('msgLoginAluno');
  msg.innerText = "";

  // 1. LOGIN ADMIN
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

  // 2. LOGIN ALUNO OU PROFESSOR
  const inputEl = document.getElementById('inputTelAluno');
  let tel = inputEl.value.replace(/\D/g, "");

  if (!tel || tel.length < 12) {
    msg.innerText = "Digite o número completo com DDD (Ex: 5581999998888).";
    return;
  }

  msg.innerText = "Validando cadastro...";

  try {
    const res = await fetch(`${API_URL}?acao=loginAluno&telefone=${encodeURIComponent(tel)}`);
    const data = await res.json();

    if (data.status === "sucesso") {
      usuarioLogado = data.aluno;
      document.getElementById('nomeAlunoLogado').innerText = `${usuarioLogado.nome} (${perfil})`;
      document.getElementById('loginAlunoCard').classList.add('hidden');
      document.getElementById('painelAluno').classList.remove('hidden');
      msg.innerText = "";
      carregarAcervo();
    } else {
      msg.innerText = data.mensagem;
    }
  } catch (err) {
    msg.innerText = "Erro ao conectar ao servidor.";
  }
}

// Carrega o acervo de livros
async function carregarAcervo() {
  const grid = document.getElementById('gridLivros');
  grid.innerHTML = "Carregando livros...";

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
    grid.innerHTML = "Erro ao carregar o acervo.";
  }
}

// Realiza a reserva aplicando as regras de prazo (7 dias Aluno / 15 dias Professor)
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
    alert("Erro ao realizar reserva.");
  }
}

// Busca ISBN (Admin)
async function buscarISBN() {
  const isbn = document.getElementById('isbnLivro').value;
  if (!isbn) return alert("Digite o ISBN!");

  const res = await fetch(`${API_URL}?acao=buscarISBN&isbn=${isbn}`);
  const data = await res.json();

  if (data.status === "sucesso") {
    document.getElementById('tituloLivro').value = data.livro.titulo;
    document.getElementById('autorLivro').value = data.livro.autor;
  } else {
    alert(data.mensagem);
  }
}

// Cadastrar livro (Admin)
async function cadastrarLivro() {
  const titulo = document.getElementById('tituloLivro').value;
  const autor = document.getElementById('autorLivro').value;
  const qtd = document.getElementById('qtdLivro').value;

  if (!titulo) return alert("Digite o título!");

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