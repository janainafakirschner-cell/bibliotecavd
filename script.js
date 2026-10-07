// ============================================================================
// CONFIGURAÇÃO DA API E VARIÁVEIS DE ESTADO
// ============================================================================
var API_URL = "https://script.google.com/macros/s/AKfycbx1XqxWp61L6yEfIS1AWSaCyDJ8fbJ6lqaUbzIlpLZjkrjVvB7aJHX37Rc6cFOgr2PJjw/exec";

var usuarioLogado = null;
var senhaAdminLogado = "";

document.addEventListener("DOMContentLoaded", function() {
  mostrarTela("telaLogin");
});

// ALTERAR EXIBIÇÃO DE CAMPOS NO LOGIN DE ACORDO COM O PERFIL SELECIONADO
function mudarPerfilLogin() {
  var perfil = document.getElementById("selectPerfil").value;
  var grupoCelular = document.getElementById("grupoCelular");
  var grupoSenhaAdmin = document.getElementById("grupoSenhaAdmin");

  if (perfil === "Administrador") {
    grupoSenhaAdmin.classList.remove("hidden");
    grupoCelular.classList.add("hidden");
  } else {
    grupoSenhaAdmin.classList.add("hidden");
    grupoCelular.classList.remove("hidden");
  }
}

// PROCESSAR LOGIN DE ACORDO COM O PERFIL
function processarLogin() {
  var perfil = document.getElementById("selectPerfil").value;

  if (perfil === "Administrador") {
    var senhaInput = document.getElementById("senhaAdmin");
    var senha = senhaInput ? senhaInput.value : "";
    if (!senha) return alert("Por favor, digite a senha de administrador!");

    if (senha === "admin123") { // Altere a senha de admin aqui se desejar
      senhaAdminLogado = senha;
      mostrarTela("painelAdmin");
      voltarMenuAdmin();
      if (senhaInput) senhaInput.value = "";
    } else {
      alert("Senha de administrador incorreta!");
    }
  } else {
    var telInput = document.getElementById("telLogin");
    var tel = telInput ? telInput.value.replace(/\D/g, "") : "";
    if (!tel || tel === "5581") return alert("Por favor, digite o seu celular completo com DDD!");

    fetch(API_URL + "?acao=loginAluno&telefone=" + encodeURIComponent(tel))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.status === "sucesso") {
          usuarioLogado = data.aluno;
          alert("Bem-vindo(a), " + usuarioLogado.nome + "!");
          
          document.getElementById("nomeUsuarioHeader").innerText = usuarioLogado.nome;
          document.getElementById("perfilUsuarioHeader").innerText = usuarioLogado.perfil || perfil;

          mostrarTela("painelUsuario");
          carregarAcervo();
        } else {
          alert(data.mensagem);
        }
      })
      .catch(function() {
        alert("Erro ao conectar com o servidor para autenticação.");
      });
  }
}

function sair() {
  usuarioLogado = null;
  senhaAdminLogado = "";
  mostrarTela("telaLogin");
}

function mostrarTela(idTela) {
  var telas = ["telaLogin", "painelUsuario", "painelAdmin"];
  telas.forEach(function(t) {
    var el = document.getElementById(t);
    if (el) el.classList.add("hidden");
  });
  var telaAlvo = document.getElementById(idTela);
  if (telaAlvo) telaAlvo.classList.remove("hidden");
}

// PRIMEIRO ACESSO
function abrirModalPrimeiroAcesso() {
  document.getElementById("modalPrimeiroAcesso").classList.remove("hidden");
}

function fecharModalPrimeiroAcesso() {
  document.getElementById("modalPrimeiroAcesso").classList.add("hidden");
}

function salvarPrimeiroAcesso() {
  var nome = document.getElementById("cadNome").value;
  var perfil = document.getElementById("cadPerfil").value;
  var email = document.getElementById("cadEmail").value;
  var tel = document.getElementById("cadTelefone").value.replace(/\D/g, "");

  if (!nome || !tel || tel === "5581") {
    return alert("Preencha o seu nome completo e o celular!");
  }

  var params = new URLSearchParams();
  params.append("acao", "cadastrarUsuario");
  params.append("nome", nome);
  params.append("perfil", perfil);
  params.append("email", email);
  params.append("telefone", tel);

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);
      if (data.status === "sucesso") {
        fecharModalPrimeiroAcesso();
        document.getElementById("telLogin").value = tel;
      }
    })
    .catch(function() { alert("Erro ao cadastrar 1º acesso."); });
}

// CONTROLE DO PAINEL ADMIN
function mostrarSecaoAdmin(idSecao) {
  var menuCards = document.getElementById("menuAdminCards");
  if (menuCards) menuCards.classList.add("hidden");

  var secoes = document.querySelectorAll(".secao-admin");
  secoes.forEach(function(s) { s.classList.add("hidden"); });

  var secaoAlvo = document.getElementById(idSecao);
  if (secaoAlvo) secaoAlvo.classList.remove("hidden");

  if (idSecao === "secaoReservas") carregarReservasAdmin();
}

function voltarMenuAdmin() {
  var secoes = document.querySelectorAll(".secao-admin");
  secoes.forEach(function(s) { s.classList.add("hidden"); });

  var menuCards = document.getElementById("menuAdminCards");
  if (menuCards) menuCards.classList.remove("hidden");
}

// CARREGAR E EXIBIR ACERVO
function carregarAcervo() {
  var grid = document.getElementById("gridLivros");
  if (!grid) return;
  grid.innerHTML = "A carregar acervo...";

  fetch(API_URL + "?acao=getLivros")
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.status === "sucesso") {
        grid.innerHTML = "";

        var categoriasMap = {};
        data.livros.forEach(function(livro) {
          var cat = (livro.categoria && livro.categoria.trim() !== "") ? livro.categoria.trim() : "Geral / Outros";
          if (!categoriasMap[cat]) categoriasMap[cat] = [];
          categoriasMap[cat].push(livro);
        });

        var categoriasOrdenadas = Object.keys(categoriasMap).sort(function(a, b) {
          return a.localeCompare(b);
        });

        categoriasOrdenadas.forEach(function(nomeCategoria) {
          var blocoCat = document.createElement("div");
          blocoCat.style.marginBottom = "25px";

          var tituloCat = document.createElement("h3");
          tituloCat.innerText = nomeCategoria;
          tituloCat.style.borderBottom = "2px solid #2e7d32";
          tituloCat.style.paddingBottom = "5px";
          tituloCat.style.color = "#2e7d32";
          blocoCat.appendChild(tituloCat);

          var listaLivros = document.createElement("ul");
          listaLivros.style.listStyle = "none";
          listaLivros.style.padding = "0";

          var livrosOrdenados = categoriasMap[nomeCategoria].sort(function(a, b) {
            return a.titulo.localeCompare(b.titulo);
          });

          livrosOrdenados.forEach(function(livro) {
            var disponivel = parseInt(livro.qtdDisponivel);
            var semExemplares = isNaN(disponivel) || disponivel < 1;

            var item = document.createElement("li");
            item.style.padding = "10px 0";
            item.style.borderBottom = "1px solid #eee";
            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";

            var textoBotao = semExemplares ? 'Reservar (Fila de Espera)' : 'Solicitar Empréstimo';
            var corBotao = semExemplares ? '#e65100' : '#2e7d32';

            item.innerHTML = 
              '<div>' +
                '<strong>' + livro.titulo + '</strong> — <small>Autor: ' + livro.autor + '</small><br>' +
                '<span style="font-size: 0.9em; color: ' + (semExemplares ? '#d32f2f' : '#2e7d32') + ';">' +
                  'Disponíveis no acervo: <strong>' + (isNaN(disponivel) ? 0 : disponivel) + '</strong>' +
                '</span>' +
              '</div>' +
              '<button onclick="solicitarOuReservar(\'' + livro.id + '\', ' + semExemplares + ')" style="background:' + corBotao + '; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold;">' +
                textoBotao +
              '</button>';

            listaLivros.appendChild(item);
          });

          blocoCat.appendChild(listaLivros);
          grid.appendChild(blocoCat);
        });

      } else {
        grid.innerHTML = "Erro ao carregar acervo: " + data.mensagem;
      }
    })
    .catch(function() {
      grid.innerHTML = "Erro ao conectar com o servidor para carregar o acervo.";
    });
}

function solicitarOuReservar(idLivro, ehReserva) {
  if (!usuarioLogado) return alert("Efetue login primeiro!");

  var msgConfirmacao = ehReserva 
    ? "Todos os exemplares estão emprestados. Deseja entrar na fila de espera?" 
    : "Confirmar solicitação de empréstimo do livro?";

  if (!confirm(msgConfirmacao)) return;

  var params = new URLSearchParams();
  params.append("acao", "reservarLivro");
  params.append("idLivro", String(idLivro));
  params.append("idAluno", String(usuarioLogado.id));

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);
      if (data.status === "sucesso") carregarAcervo();
    })
    .catch(function() { alert("Erro ao processar solicitação."); });
}

// AÇÕES DO ADMINISTRADOR
function cadastrarLivro() {
  var titulo = document.getElementById('tituloLivro') ? document.getElementById('tituloLivro').value : "";
  var autor = document.getElementById('autorLivro') ? document.getElementById('autorLivro').value : "";
  var categoria = document.getElementById('categoriaLivro') ? document.getElementById('categoriaLivro').value : "";
  var qtd = document.getElementById('qtdLivro') ? document.getElementById('qtdLivro').value : "1";
  var isbn = document.getElementById('isbnLivro') ? document.getElementById('isbnLivro').value : "";

  if (!titulo) return alert("Digite o título do livro!");

  var params = new URLSearchParams();
  params.append("acao", "cadastrarLivro");
  params.append("senhaAdmin", senhaAdminLogado);
  params.append("isbn", isbn);
  params.append("titulo", titulo);
  params.append("autor", autor);
  params.append("categoria", categoria);
  params.append("qtdTotal", qtd);

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);
      if (data.status === "sucesso") {
        document.getElementById('isbnLivro').value = "";
        document.getElementById('tituloLivro').value = "";
        document.getElementById('autorLivro').value = "";
        document.getElementById('categoriaLivro').value = "";
        document.getElementById('qtdLivro').value = "1";
        carregarAcervo();
      }
    })
    .catch(function() { alert("Erro ao salvar livro."); });
}

function adminConfirmarEmprestimo() {
  var tel = document.getElementById('empTelAluno').value.replace(/\D/g, "");
  var isbn = document.getElementById('empIsbnLivro').value.trim();

  if (!tel || tel === "5581") return alert("Digite o telefone do utilizador!");
  if (!isbn) return alert("Digite ou escaneie o ISBN!");

  var params = new URLSearchParams();
  params.append("acao", "emprestarPorIsbn");
  params.append("telefoneAluno", tel);
  params.append("isbn", isbn);

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);
      if (data.status === "sucesso") {
        document.getElementById('empTelAluno').value = "5581";
        document.getElementById('empIsbnLivro').value = "";
        carregarAcervo();
        voltarMenuAdmin();
      }
    })
    .catch(function() { alert("Erro ao registrar empréstimo."); });
}

function adminConfirmarDevolucao() {
  var isbn = document.getElementById('devIsbnLivro').value.trim();
  if (!isbn) return alert("Digite o ISBN do livro!");

  var params = new URLSearchParams();
  params.append("acao", "devolverPorIsbn");
  params.append("isbn", isbn);

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);
      if (data.status === "sucesso") {
        document.getElementById('devIsbnLivro').value = "";
        carregarAcervo();
        voltarMenuAdmin();
      }
    })
    .catch(function() { alert("Erro ao registrar devolução."); });
}

function carregarReservasAdmin() {
  var container = document.getElementById('listaReservasAdmin');
  container.innerHTML = "A carregar reservas...";

  fetch(API_URL + "?acao=getReservas")
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.status === "sucesso" && data.reservas && data.reservas.length > 0) {
        var html = '<table border="1" style="width:100%; border-collapse:collapse;">' +
          '<tr style="background:#f2f2f2;"><th>ID</th><th>Utilizador</th><th>Livro</th><th>Status</th><th>Ação</th></tr>';
        data.reservas.forEach(function(r) {
          html += '<tr><td>' + r.idReserva + '</td><td>' + r.idAluno + '</td><td>' + r.idLivro + '</td><td>' + r.status + '</td>' +
            '<td><button onclick="concluirReservaAdmin(\'' + r.idReserva + '\')">Concluir</button></td></tr>';
        });
        container.innerHTML = html + '</table>';
      } else {
        container.innerHTML = "<p>Nenhuma reserva encontrada.</p>";
      }
    });
}

function concluirReservaAdmin(idReserva) {
  var params = new URLSearchParams();
  params.append("acao", "concluirReserva");
  params.append("idReserva", idReserva);

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);
      if (data.status === "sucesso") carregarReservasAdmin();
    });
}
