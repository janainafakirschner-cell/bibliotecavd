// ============================================================================
// CONFIGURAÇÕES GERAIS E VARIÁVEIS DE ESTADO
// ============================================================================
var API_URL = "https://script.google.com/macros/s/AKfycbybjeXiOb11LIg6Us-6AH2lcDSbyTFrRGyGXM7NiCALYPbKhvbTuWoSpetC56W7v3Y59g/exec";

var usuarioLogado = null;
var senhaAdminLogado = "";

document.addEventListener("DOMContentLoaded", function() {
  mostrarTela("telaLogin");
  carregarAcervo();
});

// ALTERNÂNCIA DE ABAS NA TELA DE LOGIN (LEITOR / ADMIN)
function alternarAbaLogin(aba) {
  var tabLeitor = document.getElementById("tabLeitor");
  var tabAdmin = document.getElementById("tabAdmin");
  var formLeitor = document.getElementById("formLoginLeitor");
  var formAdmin = document.getElementById("formLoginAdmin");

  if (aba === 'leitor') {
    tabLeitor.classList.add("active");
    tabAdmin.classList.remove("active");
    formLeitor.classList.remove("hidden");
    formAdmin.classList.add("hidden");
  } else {
    tabAdmin.classList.add("active");
    tabLeitor.classList.remove("active");
    formAdmin.classList.remove("hidden");
    formLeitor.classList.add("hidden");
  }
}

// ============================================================================
// NAVEGAÇÃO E AUTENTICAÇÃO
// ============================================================================
function fazerLoginAluno() {
  var telInput = document.getElementById("telLogin");
  var tel = telInput ? telInput.value.replace(/\D/g, "") : "";
  if (!tel || tel === "5581") return alert("Por favor, digite seu telefone!");

  fetch(API_URL + "?acao=loginAluno&telefone=" + encodeURIComponent(tel))
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.status === "sucesso") {
        usuarioLogado = data.aluno;
        alert("Bem-vindo(a), " + usuarioLogado.nome + "!");
        mostrarTela("painelUsuario");
        
        var elHeader = document.getElementById("nomeUsuarioHeader");
        if (elHeader) elHeader.innerText = usuarioLogado.nome;
      } else {
        alert(data.mensagem);
      }
    })
    .catch(function() {
      alert("Erro ao conectar ao servidor para efetuar login.");
    });
}

function fazerLoginAdmin() {
  var senhaInput = document.getElementById("senhaAdmin");
  var senha = senhaInput ? senhaInput.value : "";
  if (!senha) return alert("Digite a senha de administrador!");

  if (senha === "admin123") { 
    senhaAdminLogado = senha;
    mostrarTela("painelAdmin");
    voltarMenuAdmin();
    if (senhaInput) senhaInput.value = "";
  } else {
    alert("Senha incorreta!");
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

// ============================================================================
// CONTROLE DE NAVEGAÇÃO DO PAINEL ADMIN (CARTÕES 2x2)
// ============================================================================
function mostrarSecaoAdmin(idSecao) {
  var menuCards = document.getElementById("menuAdminCards");
  if (menuCards) menuCards.classList.add("hidden");

  var secoes = document.querySelectorAll(".secao-admin");
  secoes.forEach(function(s) { s.classList.add("hidden"); });

  var secaoAlvo = document.getElementById(idSecao);
  if (secaoAlvo) secaoAlvo.classList.remove("hidden");

  if (idSecao === "secaoReservas") {
    carregarReservasAdmin();
  }
}

function voltarMenuAdmin() {
  var secoes = document.querySelectorAll(".secao-admin");
  secoes.forEach(function(s) { s.classList.add("hidden"); });

  var menuCards = document.getElementById("menuAdminCards");
  if (menuCards) menuCards.classList.remove("hidden");
}

// ============================================================================
// EXIBIÇÃO DO ACERVO
// ============================================================================
function carregarAcervo() {
  var grid = document.getElementById("gridLivros");
  if (!grid) return;
  grid.innerHTML = "A carregar o acervo...";

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
              '<button onclick="solicitarOuReservar(\'' + livro.id + '\', ' + semExemplares + ')" style="background:' + corBotao + '; color:#fff; border:none; padding:8px 14px; border-radius:4px; cursor:pointer; font-weight:bold;">' +
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
      grid.innerHTML = "Erro ao conectar ao servidor para carregar os livros.";
    });
}

function solicitarOuReservar(idLivro, ehReserva) {
  if (!usuarioLogado) {
    alert("Precisa efetuar login antes de realizar esta ação!");
    return;
  }

  var msgConfirmacao = ehReserva 
    ? "Todos os exemplares estão emprestados. Deseja entrar na fila de reserva?" 
    : "Confirmar a solicitação deste livro?";

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
    .catch(function() { alert("Erro ao processar a solicitação."); });
}

// ============================================================================
// AÇÕES ADMINISTRATIVAS (POR ISBN E TELEFONE)
// ============================================================================
function cadastrarLivro() {
  var titulo = document.getElementById('tituloLivro') ? document.getElementById('tituloLivro').value : "";
  var autor = document.getElementById('autorLivro') ? document.getElementById('autorLivro').value : "";
  var qtd = document.getElementById('qtdLivro') ? document.getElementById('qtdLivro').value : "1";
  var isbn = document.getElementById('isbnLivro') ? document.getElementById('isbnLivro').value : "";

  if (!titulo) return alert("Por favor, digite o título do livro!");

  var params = new URLSearchParams();
  params.append("acao", "cadastrarLivro");
  params.append("senhaAdmin", senhaAdminLogado);
  params.append("isbn", isbn);
  params.append("titulo", titulo);
  params.append("autor", autor);
  params.append("qtdTotal", qtd);

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);

      if (document.getElementById('isbnLivro')) document.getElementById('isbnLivro').value = "";
      if (document.getElementById('tituloLivro')) document.getElementById('tituloLivro').value = "";
      if (document.getElementById('autorLivro')) document.getElementById('autorLivro').value = "";
      if (document.getElementById('qtdLivro')) document.getElementById('qtdLivro').value = "1";
      
      carregarAcervo();
    })
    .catch(function() { alert("Erro ao gravar livro na planilha."); });
}

function adminConfirmarEmprestimo() {
  var telInput = document.getElementById('empTelAluno') ? document.getElementById('empTelAluno').value : "";
  var isbnInput = document.getElementById('empIsbnLivro') ? document.getElementById('empIsbnLivro').value : "";

  var tel = telInput.replace(/\D/g, "");
  var isbn = isbnInput.trim();

  if (!tel || tel === "5581") return alert("Por favor, digite o número do telefone completo!");
  if (!isbn) return alert("Por favor, digite ou escaneie o ISBN do livro!");

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
  var isbnInput = document.getElementById('devIsbnLivro') ? document.getElementById('devIsbnLivro').value : "";
  var isbn = isbnInput.trim();

  if (!isbn) return alert("Digite o ISBN do livro a devolver!");

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
  if (!container) return;
  container.innerHTML = "A carregar lista de reservas...";

  fetch(API_URL + "?acao=getReservas")
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.status === "sucesso" && data.reservas && data.reservas.length > 0) {
        var html = '<table border="1" style="width:100%; border-collapse:collapse; text-align:left;">' +
          '<thead>' +
            '<tr style="background:#f2f2f2;">' +
              '<th style="padding:8px;">Reserva</th>' +
              '<th style="padding:8px;">Aluno/Prof</th>' +
              '<th style="padding:8px;">Livro</th>' +
              '<th style="padding:8px;">Status</th>' +
              '<th style="padding:8px;">Fila</th>' +
              '<th style="padding:8px;">Ação</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>';

        data.reservas.forEach(function(r) {
          html += 
            '<tr>' +
              '<td style="padding:8px;">' + r.idReserva + '</td>' +
              '<td style="padding:8px;">' + r.idAluno + '</td>' +
              '<td style="padding:8px;">' + r.idLivro + '</td>' +
              '<td style="padding:8px;">' + r.status + '</td>' +
              '<td style="padding:8px;">' + (r.posicao || '-') + '</td>' +
              '<td style="padding:8px;">' +
                '<button onclick="concluirReservaAdmin(\'' + r.idReserva + '\')" style="background:#2e7d32; color:#fff; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">' +
                  'Concluir' +
                '</button>' +
              '</td>' +
            '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
      } else {
        container.innerHTML = "<p>Nenhuma reserva ativa encontrada.</p>";
      }
    })
    .catch(function() { container.innerHTML = "Não foi possível carregar a lista de reservas."; });
}

function concluirReservaAdmin(idReserva) {
  if (!confirm("Deseja marcar esta reserva como concluída?")) return;

  var params = new URLSearchParams();
  params.append("acao", "concluirReserva");
  params.append("idReserva", idReserva);

  fetch(API_URL, { method: "POST", body: params })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      alert(data.mensagem);
      if (data.status === "sucesso") {
        carregarAcervo();
        voltarMenuAdmin();
      }
    })
    .catch(function() { alert("Erro ao concluir reserva."); });
}
