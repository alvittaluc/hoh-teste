/* ══════════════════════════════════════════════════════════════
   HOME OFFICE HUB — cabeçalho e rodapé compartilhados
   Cada página chama montarLayout("inicio" | "vagas" | "empresas" | "guia").
   Mexer aqui muda a navegação de todas as páginas ao mesmo tempo.
   ══════════════════════════════════════════════════════════════ */

const ABAS = [
  { id: "inicio",   nome: "Início",        href: "index.html" },
  { id: "vagas",    nome: "Vagas",         href: "vagas.html" },
  { id: "empresas", nome: "Empresas",      href: "empresas.html" },
  { id: "guia",     nome: "Como funciona", href: "como-funciona.html" },
  { id: "aluno", nome: "Área do aluno", href: "inicio.html" },
  { id: "mentorias", nome: "Mentorias", href: "mentorias.html" },
];

/* Mentorias desligadas por enquanto (23/10/2026): saem do menu, do rodapé e
   do menu da conta, e quem abre a página delas vai para o início. As páginas
   e os dados continuam guardados. Para religar, volte para true. */
const MENTORIAS_LIGADAS = false;
if (!MENTORIAS_LIGADAS) {
  ABAS.splice(ABAS.findIndex(a => a.id === "mentorias"), 1);
  if (/^mentorias?\.html$/.test(location.pathname.split("/").pop())) location.replace("index.html");
}

/* ══════════════════════════════════════════════════════════════
   ACESSO — o que é aberto e o que pede conta

   O site é aberto. A conta vale para o que tem mais valor:
     · as ferramentas (Meu Controle e Transcrição ao vivo)
     · os cursos, da segunda aula em diante (a primeira é aberta)
     · o grupo "Em movimento" da aba Vagas, que aparece borrado

   Tudo é decidido aqui, em um lugar só. As páginas não sabem de nada:
   este arquivo olha o nome da página e aplica a regra dela.

   IMPORTANTE: isto é uma cortina, não um cofre. O site é feito de
   arquivos públicos, então quem entende de programação consegue ler o
   texto de um curso por fora. Serve para dar motivo para a pessoa criar
   a conta, e para isso basta. O que é realmente protegido são os dados
   de cada conta, que ficam no banco (ver controle-conta.js).
   ══════════════════════════════════════════════════════════════ */
const Acesso = (function () {
  /* false: nada é trancado ainda, e só o botão Entrar aparece no topo.
            Para ver como fica, abra qualquer página com ?previa=1 no fim
            do endereço (e ?previa=0 para voltar ao normal).
     true:  as portas valem para todo mundo. */
  const PORTAS_LIGADAS = true;

  const PROJETO = "zrqucjktympnwilbvisw";   // o mesmo do controle-conta.js

  /* O que cada página tranca para quem não tem conta. */
  const REGRAS = [
    { pagina: /^transcricao\.html$/, tudo: true,
      titulo: "A Transcrição ao vivo é para quem tem conta",
      texto: "Entre na sua conta para usar a ferramenta." },
    { pagina: /^curso-[a-z-]+\.html$/, secoes: ["aula2", "aula3", "aula4", "quiz"],
      titulo: "Continue o curso com a sua conta",
      texto: "A primeira aula é aberta. As outras aulas e o quiz são para quem tem conta no Hub." },
  ];

  /* O login guarda a sessão no navegador. Ler direto de lá é instantâneo e
     não precisa carregar a biblioteca do Supabase em toda página. */
  function sessao() {
    try {
      const t = JSON.parse(localStorage.getItem("sb-" + PROJETO + "-auth-token") || "null");
      return t && (t.refresh_token || t.access_token) ? t : null;
    } catch (e) { return null; }
  }
  function logado() { return !!sessao(); }
  function email() { const s = sessao(); return (s && s.user && s.user.email) || ""; }

  /* A pessoa é da equipe do Hub? Serve só para mostrar a entrada do painel no
     menu da conta: quem tranca o painel de verdade é o banco, que recusa
     quem não está na lista. A resposta fica guardada por uma hora, para não
     perguntar ao servidor a cada página. */
  const CHAVE_PUBLICA = "sb_publishable_4X7Cyykz9ZDMWOTvauxibA_Tpa4KtAh";
  function daEquipe(aoSaber) {
    const s = sessao();
    const uid = s && s.user && s.user.id;
    if (!uid) return;
    let g = null;
    try { g = JSON.parse(localStorage.getItem("hub-equipe") || "null"); } catch (e) {}
    if (g && g.uid === uid) {
      if (g.sim) aoSaber();
      if (Date.now() - g.quando < 3600e3) return;
    }
    // com o acesso vencido o servidor recusaria; a próxima página logada renova
    if (!s.access_token || (s.expires_at && s.expires_at * 1000 < Date.now())) return;
    (() => Promise.reject("teste"))("https://" + PROJETO + ".supabase.co/rest/v1/rpc/eh_admin", {
      method: "POST", body: "{}",
      headers: { "Content-Type": "application/json", apikey: CHAVE_PUBLICA, Authorization: "Bearer " + s.access_token },
    }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(sim => {
      try { localStorage.setItem("hub-equipe", JSON.stringify({ uid, sim: sim === true, quando: Date.now() })); } catch (e) {}
      if (sim === true && !(g && g.uid === uid && g.sim)) aoSaber();
    }).catch(() => {});
  }

  /* O plano da pessoa (Black ou Pro), que só a equipe coloca, pelo Painel
     (banco/painel-equipe.sql). O banco entrega a cada um só a linha dele.
     Fica guardado por 10 minutos; quando a resposta chega, os selos da
     página (os lugares marcados com data-plano-selo) são redesenhados. */
  const PLANOS = { black: "Plano Black", pro: "Plano Pro" };
  const ICONE_PLANO = {
    black: '<path fill="currentColor" d="M4.2 2h7.6l3 4.1L8 14.5 1.2 6.1 4.2 2Zm.6 1.3L3 5.6h3.1l-1.3-2.3Zm6.4 0L9.9 5.6H13l-1.8-2.3ZM8 3.4 6.8 5.6h2.4L8 3.4ZM3.1 7l3.7 4.6L5.3 7H3.1Zm3.6 0L8 11.1 9.3 7H6.7Zm4 0-1.5 4.6L12.9 7h-2.2Z"/>',
    pro: '<path fill="currentColor" d="M8 1.2l2 4.3 4.7.5-3.5 3.2 1 4.6L8 11.5l-4.2 2.3 1-4.6L1.3 6l4.7-.5L8 1.2Z"/>',
  };
  function planoGuardado() {
    const s = sessao(), uid = s && s.user && s.user.id;
    if (!uid) return "";
    try { const g = JSON.parse(localStorage.getItem("hub-plano") || "null"); return g && g.uid === uid && PLANOS[g.plano] ? g.plano : ""; } catch (e) { return ""; }
  }
  function seloPlano(mini) {
    const p = planoGuardado();
    if (!p) return "";
    porCss();
    return `<span class="hub-selo ${p}${mini ? " mini" : ""}"><svg viewBox="0 0 16 16" aria-hidden="true">${ICONE_PLANO[p]}</svg>${PLANOS[p]}</span>`;
  }
  function pintarPlano(raiz) {
    (raiz || document).querySelectorAll("[data-plano-selo]").forEach(el => { el.innerHTML = seloPlano(el.dataset.planoSelo === "mini"); });
  }
  function buscarPlano() {
    const s = sessao(), uid = s && s.user && s.user.id;
    if (!uid) return;
    let g = null;
    try { g = JSON.parse(localStorage.getItem("hub-plano") || "null"); } catch (e) {}
    if (g && g.uid === uid && Date.now() - g.quando < 600e3) return;
    if (!s.access_token || (s.expires_at && s.expires_at * 1000 < Date.now())) return;
    (() => Promise.reject("teste"))("https://" + PROJETO + ".supabase.co/rest/v1/planos?select=plano&user_id=eq." + encodeURIComponent(uid), {
      headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + s.access_token },
    }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(linhas => {
      const plano = (Array.isArray(linhas) && linhas[0] && linhas[0].plano) || "";
      try { localStorage.setItem("hub-plano", JSON.stringify({ uid, plano, quando: Date.now() })); } catch (e) {}
      if (!g || g.uid !== uid || g.plano !== plano) pintarPlano();
    }).catch(() => {});
  }

  /* As áreas de formação. O primeiro nome é o que vem nos arquivos de vagas
     (sem acento, do classificador.py); o segundo é o que a pessoa lê. */
  const AREAS = [
    ["Direito", "Direito"],
    ["Medicina e Saude", "Medicina e Saúde"],
    ["Meio Ambiente e Ciencias da Terra", "Meio Ambiente e Ciências da Terra"],
    ["Programacao e Software", "Programação e Software"],
    ["Engenharia", "Engenharia"],
    ["Matematica e Estatistica", "Matemática e Estatística"],
    ["Fisica e Astronomia", "Física e Astronomia"],
    ["Quimica", "Química"],
    ["Biologia e Ciencias da Vida", "Biologia e Ciências da Vida"],
    ["Financas e Contabilidade", "Finanças e Contabilidade"],
    ["Economia e Negocios", "Economia e Negócios"],
    ["Psicologia e Ciencias Sociais", "Psicologia e Ciências Sociais"],
    ["Educacao e Ensino", "Educação e Ensino"],
    ["Humanidades", "Humanidades"],
    ["Linguistica", "Linguística"],
    ["Musica e Audio", "Música e Áudio"],
    ["Design e Criacao", "Design e Criação"],
    ["Marketing e Vendas", "Marketing e Vendas"],
    ["Outras areas", "Outras áreas de especialista"],
  ];
  /* Especialidades das áreas grandes. Mesmos nomes (sem acento) do
     classificador.py, que é quem marca cada vaga. Vaga sem especialidade é
     a genérica da área e aparece para todo mundo que marcou a área. */
  const SUBAREAS = {
    "Programacao e Software": [
      ["Desenvolvimento de Software", "Desenvolvimento de software"],
      ["Dados e Machine Learning", "Dados e machine learning"],
      ["Seguranca da Informacao", "Segurança da informação"],
      ["DevOps, Infraestrutura e TI", "DevOps, infraestrutura e TI"],
    ],
    "Engenharia": [
      ["Eletrica e Eletronica", "Elétrica e eletrônica"],
      ["Mecanica e CAD", "Mecânica e CAD"],
      ["Civil e Estruturas", "Civil e estruturas"],
      ["Aeroespacial e Fluidos", "Aeroespacial e fluidos"],
      ["Quimica, Materiais e Nuclear", "Química, materiais e nuclear"],
      ["Robotica e Controle", "Robótica e controle"],
    ],
    "Medicina e Saude": [
      ["Medicos, Enfermagem e Farmacia", "Médicos, enfermagem e farmácia"],
      ["Pesquisa Clinica e Regulatorio", "Pesquisa clínica e regulatório"],
      ["Dados e Informatica em Saude", "Dados e informática em saúde"],
    ],
    "Financas e Contabilidade": [
      ["Contabilidade e Impostos", "Contabilidade e impostos"],
      ["Mercado Financeiro e Investimentos", "Mercado financeiro e investimentos"],
    ],
    "Design e Criacao": [
      ["Video, Cinema e Animacao", "Vídeo, cinema e animação"],
      ["Design Grafico, UX e Ilustracao", "Design gráfico, UX e ilustração"],
    ],
  };
  function nomeSub(area, id) {
    const s = (SUBAREAS[area] || []).find(x => x[0] === id);
    return s ? s[1] : (id || "");
  }
  /* As especialidades marcadas, no formato "Area/Especialidade". */
  function subareas() {
    const s = sessao();
    const m = s && s.user && s.user.user_metadata;
    return (m && Array.isArray(m.subareas)) ? m.subareas : [];
  }
  /* A vaga serve para esta pessoa? Vale a área; dentro dela, se a pessoa
     marcou especialidades, entram as dela e as genéricas da área. */
  function vagaDasMinhasAreas(v, minhas, subs) {
    if (!v || minhas.indexOf(v.area) < 0) return false;
    const dela = subs.filter(x => x.indexOf(v.area + "/") === 0);
    if (!dela.length || !v.sub) return true;
    return dela.indexOf(v.area + "/" + v.sub) >= 0;
  }
  /* "Engenharia (elétrica e eletrônica)" */
  function resumoDasAreas(minhas, subs) {
    return minhas.map(a => {
      const dela = subs.filter(x => x.indexOf(a + "/") === 0).map(x => nomeSub(a, x.slice(a.length + 1)).toLowerCase());
      return nomeArea(a) + (dela.length ? " (" + dela.join(", ") + ")" : "");
    }).join(", ");
  }

  function nomeArea(id) {
    const a = AREAS.find(x => x[0] === id);
    return a ? a[1] : (id || "");
  }
  /* As áreas que a pessoa marcou na conta. null = ainda não respondeu (ou
     não está logada); lista vazia = respondeu que não tem nenhuma. */
  function areas() {
    const s = sessao();
    const m = s && s.user && s.user.user_metadata;
    if (!m || m.areas_respondido !== true) return null;
    return Array.isArray(m.areas) ? m.areas : [];
  }

  function previa() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.has("previa")) sessionStorage.setItem("hub-previa", q.get("previa") === "0" ? "" : "1");
      return sessionStorage.getItem("hub-previa") === "1";
    } catch (e) { return false; }
  }
  function portasLigadas() { return PORTAS_LIGADAS || previa(); }
  function trancado() { return portasLigadas() && !logado(); }

  function paginaAtual() { return location.pathname.split("/").pop() || "index.html"; }
  function linkEntrar() {
    return "entrar.html?voltar=" + encodeURIComponent(paginaAtual() + location.search + location.hash);
  }

  /* ══════════════════════════════════════════════════════════
     O HUB SÓ COM CONTA (pedido do dono em 04/11/2026)

     Quem não está logado não vê nada do Hub: qualquer página leva
     para a entrar.html, que volta para a página pedida depois do
     login. Ficam abertas só a entrada, a política de privacidade
     (o cadastro aponta para ela) e a página de erro.

     Quem acabou de criar a conta preenche o perfil profissional
     antes de usar o resto (perfil-profissional.html). O banco marca
     isso na conta (perfil_prof), então vale em qualquer aparelho.

     false: o site volta a ser aberto, com as portas antigas lá de
     cima (cursos, ferramentas e Em alta).
     ══════════════════════════════════════════════════════════ */
  const SO_COM_CONTA = true;
  const ABERTAS = /^(entrar|privacidade|404)\.html$/;

  function perfilFeito(u) {
    const s = u ? { user: u } : sessao();
    const m = s && s.user && s.user.user_metadata;
    return !!(m && m.perfil_prof === true);
  }
  function linkPerfil(voltar) {
    return "perfil-profissional.html?primeira=1&voltar=" + encodeURIComponent(voltar || (paginaAtual() + location.search + location.hash));
  }
  /* O link de confirmação e o de "esqueci a senha" chegam com a sessão
     no endereço, antes de ela ir para o navegador. Esses passam. */
  function chegandoPorLink() { return /access_token=|error_code=|[?&]code=/.test(location.hash + location.search); }

  function porta() {
    if (localStorage.getItem("plat-exemplo-pronto") !== "2") { document.documentElement.style.visibility = "hidden"; location.replace("exemplo.html?voltar=" + encodeURIComponent(paginaAtual() + location.search + location.hash)); return; }
    if (!SO_COM_CONTA || chegandoPorLink()) return;
    const pg = paginaAtual();
    let ir = "";
    if (!logado()) { if (!ABERTAS.test(pg)) ir = pg === "index.html" && !location.search ? "entrar.html" : linkEntrar(); }
    else if (!perfilFeito() && !ABERTAS.test(pg) && pg !== "perfil-profissional.html") ir = linkPerfil();
    if (!ir) return;
    // a página não chega a aparecer: some na hora e troca de endereço
    document.documentElement.style.visibility = "hidden";
    location.replace(ir);
  }
  porta();

  const CSS = `
  .hd .tabs[hidden], .hd .hd-toggle[hidden] { display:none !important; }
  .hd-conta { margin-left:10px; white-space:nowrap; font-size:13.5px; font-weight:600; text-decoration:none;
    padding:9px 16px; border-radius:999px; background:var(--signal,#1A4893); color:#fff; border:1px solid var(--signal,#1A4893); }
  .hd-conta:hover { filter:brightness(1.08); }
  .hd-conta.dentro { background:var(--panel,#fff); color:var(--ink,#10203A); border-color:var(--line,#DED7CA); }
  @media (max-width:900px){ .hd-conta { order:2; margin-left:auto; padding:8px 13px; }
    .hd-toggle { order:3; margin-left:8px !important; } .hd-spacer { display:none; } }

  /* menu da conta: abre ao clicar em "Minha conta" */
  .hd-menu { position:relative; margin-left:10px; }
  .hd-menu > summary { list-style:none; cursor:pointer; margin-left:0; display:inline-block; }
  .hd-menu > summary::-webkit-details-marker { display:none; }
  .hd-menu > summary::after { content:"▾"; margin-left:6px; font-size:11px; opacity:.6; }
  .hd-menu-cx { position:absolute; right:0; top:calc(100% + 10px); z-index:60; min-width:250px; padding:8px;
    background:var(--panel,#fff); border:1px solid var(--line,#DED7CA); border-radius:16px;
    box-shadow:0 18px 40px -22px rgba(16,32,58,.45); }
  .hd-menu-quem { padding:8px 12px 10px; font-size:12.5px; color:var(--ink-3,#66717F); border-bottom:1px solid var(--line-soft,#EAE4D9);
    margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .hd-menu-cx a { display:block; padding:10px 12px; border-radius:10px; font-size:14px; font-weight:500; color:var(--ink,#10203A); text-decoration:none; }
  .hd-menu-cx a:hover { background:var(--bg-soft,#F1ECE3); }
  .hd-menu-cx a small { display:block; font-size:12px; font-weight:400; color:var(--ink-3,#66717F); margin-top:1px;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:250px; }
  .hd-menu-cx a.hd-menu-equipe { border-top:1px solid var(--line-soft,#EAE4D9); border-radius:0 0 10px 10px; margin-top:6px; padding-top:12px; color:var(--signal,#1A4893); }
  @media (max-width:900px){ .hd-menu { order:2; margin-left:auto; } }
  /* selo do plano (Black ou Pro) */
  .hub-selo { display:inline-flex; align-items:center; gap:6px; font-family:inherit; font-size:12.5px; font-weight:600; line-height:1; letter-spacing:0;
    border-radius:99px; padding:6px 11px 6px 9px; white-space:nowrap; vertical-align:middle; text-transform:none; }
  .hub-selo svg { width:13px; height:13px; flex-shrink:0; }
  .hub-selo.black { background:linear-gradient(135deg,#15171C 0%,#2B2E36 100%); color:#F2E3BF; box-shadow:inset 0 0 0 1px #3B3E47; }
  .hub-selo.black svg { color:#D9B86C; }
  .hub-selo.pro { background:var(--signal,#1A4893); color:#fff; } .hub-selo.pro svg { color:#BBD3F2; }
  .hub-selo.mini { font-size:11px; padding:4px 8px 4px 7px; gap:4px; } .hub-selo.mini svg { width:11px; height:11px; }
  .hd-conta [data-plano-selo]:not(:empty) { margin-left:7px; }
  @media (max-width:560px){ .hd-conta [data-plano-selo] { display:none; } }
  .hd-menu-quem [data-plano-selo]:not(:empty) { display:block; margin-top:7px; }

  .ac-aviso { max-width:520px; margin:44px auto; padding:30px 28px; text-align:center; background:var(--panel,#fff);
    border:1px solid var(--line-soft,#EAE4D9); border-radius:var(--raio,18px); box-shadow:var(--sombra,none); }
  .ac-aviso .ac-cadeado { width:44px; height:44px; margin:0 auto 14px; border-radius:13px; display:grid; place-items:center;
    background:var(--signal-suave,#EAF1F8); color:var(--signal,#1A4893); }
  .ac-aviso h2 { font-family:var(--display,Georgia,serif); font-weight:400; font-size:23px; line-height:1.2; color:var(--ink,#10203A); margin:0 0 8px; }
  .ac-aviso p { font-size:14.5px; line-height:1.55; color:var(--ink-2,#54606F); margin:0 0 18px; }
  /* !important: as páginas de curso pintam todo link do texto de azul, e o
     botão ficaria azul sobre azul */
  .ac-aviso a.ac-bt { display:inline-block; font-weight:600; font-size:14.5px; text-decoration:none !important; color:#fff !important;
    background:var(--signal,#1A4893); padding:12px 22px; border-radius:12px; }
  .ac-aviso .ac-nota { font-size:12.5px; color:var(--ink-3,#66717F); margin:14px 0 0; }
  .ac-aviso .ac-nota a { color:var(--signal,#1A4893) !important; text-decoration:underline; }

  .ac-trancada > *:not(.ac-aviso) { display:none !important; }
  main.ac-pagina-trancada > *:not(.ac-aviso) { display:none !important; }

  .ac-cortina { position:relative; }
  .ac-cortina > .ac-borrado { filter:blur(7px); opacity:.75; pointer-events:none; user-select:none; }
  .ac-cortina > .ac-por-cima { position:absolute; inset:0; display:grid; place-items:center; padding:12px; }
  .ac-cortina .ac-aviso { margin:0; padding:20px 22px; max-width:420px; }
  .ac-cortina .ac-aviso h2 { font-size:19px; } .ac-cortina .ac-aviso p { margin-bottom:14px; }
  `;

  let cssPosto = false;
  function porCss() {
    if (cssPosto) return;
    cssPosto = true;
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const CADEADO = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="4" y="9" width="12" height="8.5" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M6.8 9V6.6a3.2 3.2 0 0 1 6.4 0V9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function htmlAviso(titulo, texto) {
    porCss();
    return `<div class="ac-aviso">
      <div class="ac-cadeado">${CADEADO}</div>
      <h2>${titulo}</h2>
      <p>${texto}</p>
      <a class="ac-bt" href="${linkEntrar()}">Entrar na conta</a>
      <p class="ac-nota">Ainda não tem conta? <a href="${linkEntrar().replace("entrar.html?", "entrar.html?criar=1&")}">Crie a sua</a>.</p>
    </div>`;
  }

  /* Usado pela aba Vagas: devolve o bloco borrado, com o aviso por cima. */
  function cortina(htmlDeDentro, titulo, texto) {
    porCss();
    return `<div class="ac-cortina">
      <div class="ac-borrado" aria-hidden="true">${htmlDeDentro}</div>
      <div class="ac-por-cima">${htmlAviso(titulo, texto)}</div>
    </div>`;
  }

  function botaoNoCabecalho(hd) {
    if (!hd) return;
    porCss();
    if (logado()) {
      /* Quem está logado ganha um menu, para achar sem procurar onde mudar
         as áreas de formação e onde ficam os dados da conta. */
      const minhas = areas();
      const resumo = minhas === null ? "ainda não marcadas"
        : minhas.length ? resumoDasAreas(minhas, subareas()) : "nenhuma marcada";
      const volta = encodeURIComponent(paginaAtual() === "entrar.html" ? "vagas.html" : paginaAtual());
      const d = document.createElement("details");
      d.className = "hd-menu";
      d.innerHTML = `<summary class="hd-conta dentro">Minha conta<span data-plano-selo="mini">${seloPlano(true)}</span></summary>
        <div class="hd-menu-cx">
          <div class="hd-menu-quem">${esc(email())}<span data-plano-selo="mini">${seloPlano(true)}</span></div>
          <a href="perfil-profissional.html">Perfil profissional<small>idiomas, formação, áreas e experiências</small></a>
          <a href="perfil.html?voltar=${volta}">Meu perfil<small>nome, apresentação e foto</small></a>
          <a href="entrar.html?areas=1&voltar=${volta}">Minhas áreas de formação<small>${esc(resumo)}</small></a>
          <a href="vagas.html${minhas && minhas.length ? "?ver=voce" : ""}">Vagas para mim</a>
          ${MENTORIAS_LIGADAS ? '<a href="mentorias.html">Mentorias</a>' : ""}
          <a href="controle.html">Meu Controle</a>
          <a href="controle.html#dados">Dados da conta e sair</a>
        </div>`;
      hd.appendChild(d);
      buscarPlano();
      daEquipe(() => {
        if (d.querySelector(".hd-menu-equipe")) return;
        d.querySelector(".hd-menu-cx").insertAdjacentHTML("beforeend",
          `<a class="hd-menu-equipe" href="painel.html">Painel da equipe<small>${MENTORIAS_LIGADAS ? "números, pessoas e denúncias" : "números, pessoas e equipe"}</small></a>`);
      });
      document.addEventListener("click", ev => { if (d.open && !d.contains(ev.target)) d.open = false; });
      document.addEventListener("keydown", ev => { if (ev.key === "Escape") d.open = false; });
      return;
    }
    const a = document.createElement("a");
    {
      a.className = "hd-conta";
      a.href = paginaAtual() === "entrar.html" ? "entrar.html" : linkEntrar();
      a.textContent = "Entrar";
    }
    hd.appendChild(a);
  }

  function aplicarRegras() {
    if (!trancado()) return;
    const regra = REGRAS.find(r => r.pagina.test(paginaAtual()));
    if (!regra) return;
    porCss();

    if (regra.tudo) {
      const main = document.querySelector("main") || document.body;
      main.classList.add("ac-pagina-trancada");
      main.insertAdjacentHTML("afterbegin", htmlAviso(regra.titulo, regra.texto));
      return;
    }
    (regra.secoes || []).forEach(id => {
      const sec = document.getElementById(id);
      if (!sec || sec.classList.contains("ac-trancada")) return;
      sec.classList.add("ac-trancada");
      sec.insertAdjacentHTML("afterbegin", htmlAviso(regra.titulo, regra.texto));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicarRegras);
  else aplicarRegras();

  return {
    logado, email, trancado, linkEntrar, perfilFeito, linkPerfil, SO_COM_CONTA, cortina, htmlAviso, botaoNoCabecalho, aplicarRegras,
    planoGuardado, seloPlano, pintarPlano, buscarPlano,
    AREAS, nomeArea, areas, SUBAREAS, nomeSub, subareas, vagaDasMinhasAreas, resumoDasAreas,
    get portasLigadas() { return portasLigadas(); },
  };
})();

/* A marca é o arquivo logo.svg, que precisa estar na mesma pasta dos HTML.
   É um desenho em vetor, então fica nítido em qualquer tamanho. As cópias em
   imagem (logo.png, favicon e apple-touch-icon) são o mesmo desenho. */
function marca(tam) {
  return `<img src="logo.svg" alt="Home Office Hub" width="${tam}" height="${tam}"
    style="width:${tam}px;height:${tam}px;display:block;object-fit:contain;">`;
}

function montarLayoutTopo(ativa) {
  /* O ícone da aba agora vem das tags <link rel="icon"> no head de cada
     página, que apontam para favicon.ico e favicon-32.png. Não injetamos
     mais nada aqui, senão o logo.png sobrescreveria o ícone bom. */

  // sem conta, o menu e os atalhos do rodapé somem: só a entrada fica
  const fora = Acesso.SO_COM_CONTA && (!Acesso.logado() || !Acesso.perfilFeito());

  // ── cabeçalho ──
  const header = document.createElement("header");
  header.className = "site";
  header.innerHTML = `
    <div class="hd">
      <a href="index.html" class="brand" aria-label="Home Office Hub, página inicial">
        <span class="brand-mark">${marca(30)}</span>
        <span class="brand-name">Home Office Hub</span>
      </a>
      <button class="hd-toggle" id="hdToggle" aria-label="Abrir menu" aria-expanded="false"${fora ? " hidden" : ""}>
        <span></span><span></span><span></span>
      </button>
      <nav class="tabs" id="hdTabs"${fora ? " hidden" : ""}>
        ${ABAS.map(a => `<a href="${a.href}"${a.id === ativa ? ' class="on" aria-current="page"' : ""}>${a.nome}</a>`).join("")}
      </nav>
      <div class="hd-spacer"></div>
    </div>`;
  document.body.prepend(header);

  // botão Entrar / Minha conta, no canto direito
  try { Acesso.botaoNoCabecalho(header.querySelector(".hd")); } catch (e) { console.warn(e); }

  const btn = document.getElementById("hdToggle");
  const tabs = document.getElementById("hdTabs");
  btn.addEventListener("click", () => {
    const aberto = tabs.classList.toggle("aberto");
    btn.setAttribute("aria-expanded", aberto ? "true" : "false");
  });

  // ── rodapé ──
  const footer = document.createElement("footer");
  footer.className = "site";
  footer.innerHTML = `
    <div class="ft">
      <div>
        <div class="ft-brand"><span class="brand-mark" style="width:32px;height:32px;">${marca(32)}</span>Home Office Hub</div>
        <p class="ft-desc">Trabalho remoto com inteligência artificial, dados e tradução, para quem mora no Brasil.</p>
      </div>
      ${fora ? "" : `<div>
        <h4>Navegar</h4>
        <ul>${ABAS.map(a => `<li><a href="${a.href}">${a.nome}</a></li>`).join("")}</ul>
      </div>
      <div>
        <h4>Áreas</h4>
        <ul>
          <li><a href="vagas.html?cat=ai">IA e dados</a></li>
          <li><a href="vagas.html?cat=transl">Tradução</a></li>
          <li><a href="vagas.html?cat=qa">QA e validação</a></li>
          <li><a href="vagas.html?cat=sme">Especialistas</a></li>
        </ul>
      </div>
      <div>
        <h4>Guia</h4>
        <ul>
          <li><a href="como-funciona.html#areas">Tipos de projeto</a></li>
          <li><a href="como-funciona.html#processo">Teste de entrada</a></li>
          <li><a href="como-funciona.html#pagamento">Como receber</a></li>
          <li><a href="como-funciona.html#golpe">Evitar golpes</a></li>
        </ul>
      </div>`}
    </div>
    <div class="ft-bottom">
      <span>Home Office Hub</span>
      <a href="privacidade.html">Privacidade e regras de uso</a>
    </div>`;
  document.body.appendChild(footer);
}

/* Lê o vagas.json uma vez e devolve os dados. */
let _cacheVagas = null;
async function lerVagas() {
  if (_cacheVagas) return _cacheVagas;
  const resp = await fetch("vagas.json?v=" + Date.now());
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  _cacheVagas = await resp.json();
  return _cacheVagas;
}

/* Usada SÓ pela página individual da vaga. Junta as vagas visíveis com as
   escondidas por área, para que um link direto continue abrindo. A aba Vagas
   nunca chama esta função: ela segue com lerVagas(). */
let _cacheEsp = null;
async function lerEspecificas() {
  if (_cacheEsp) return _cacheEsp;
  try {
    const resp = await fetch("vagas-especificas.json?v=" + Date.now());
    if (!resp.ok) throw new Error("sem arquivo");
    const d = await resp.json();
    _cacheEsp = { vagas: d.vagas || [], areas: d.areas || [] };
  } catch (e) {
    _cacheEsp = { vagas: [], areas: [] };
  }
  return _cacheEsp;
}

let _cacheTodas = null;
async function lerVagasComEscondidas() {
  if (_cacheTodas) return _cacheTodas;
  const dados = await lerVagas();
  const esp = await lerEspecificas();
  _cacheTodas = { ...dados, vagas: (dados.vagas || []).concat(esp.vagas) };
  return _cacheTodas;
}

async function lerEmpresas() {
  const resp = await fetch("empresas.json?v=" + Date.now());
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return await resp.json();
}

/* ══════════════════════════════════════════════════════════════
   IDIOMA DO TRABALHO
   Cada vaga com resumo traz o campo "idioma", marcado à mão:
     pt      o trabalho é em português (inglês só nas instruções)
     nenhum  gravar vídeo, tirar foto: não depende de idioma
     en      lê e escreve em inglês, com tempo e ferramenta do lado
     en+     inglês avançado: falar ao vivo, escrever como nativo
     outro   texto livre, por exemplo "alemão e inglês"
   A etiqueta informa; quem decide se dá conta é a pessoa.
   ══════════════════════════════════════════════════════════════ */
function idiomaDaVaga(v) {
  const i = v && v.resumo && v.resumo.idioma;
  if (!i) return null;
  if (i === "pt")     return { tipo: "pt",  curto: "em português",       longo: "Em português", semIngles: true };
  if (i === "nenhum") return { tipo: "pt",  curto: "não depende de idioma", longo: "Não depende de idioma", semIngles: true };
  if (i === "en")     return { tipo: "en",  curto: "em inglês",          longo: "Em inglês" };
  if (i === "en+")    return { tipo: "av",  curto: "inglês avançado",    longo: "Exige inglês avançado" };
  return { tipo: "en", curto: i, longo: i.charAt(0).toUpperCase() + i.slice(1) };
}

/* Mantida vazia de propósito: as páginas ainda chamam selo(), mas o site
   não exibe mais data de atualização em lugar nenhum. */
function selo() {}

function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Endereço que pode virar link: só http e https. Qualquer outra coisa
   (javascript:, data:...) volta vazia, para nunca virar um link que roda código. */
function urlSegura(u) {
  const s = String(u === null || u === undefined ? "" : u).trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

/* O site não abre dentro de outro site (num quadro invisível, alguém poderia
   fazer a pessoa clicar em botões daqui sem perceber). */
try {
  if (window.top !== window.self) {
    document.documentElement.style.display = "none";
    window.top.location = window.self.location.href;
  }
} catch (e) { document.documentElement.style.display = "none"; }

/* Logo da empresa: usa o arquivo guardado no site (pasta logos/, campo
   "logo" do empresas.json) e cai para a sigla se ele faltar. Empresa nova
   que ainda não tem arquivo usa o ícone do serviço do Google, como antes.

   O logo ocupa o quadrado inteiro, com uma folga proporcional. Antes ele
   ficava pequeno no meio de um quadrado colorido e sobrava um contorno
   em volta. O quadrado vira branco pela regra .marca:has(img) do
   estilo.css; se o logo não carregar, a sigla volta e o quadrado
   colorido volta junto, sozinho. */
function logoHtml(e, tam) {
  const px = tam >= 40 ? 64 : 32;
  const folga = Math.max(2, Math.round(tam * 0.12));
  const guardado = /^logos\/[a-z0-9-]+\.(png|svg|webp)$/.test(e.logo || "") ? e.logo : "";
  if (guardado || e.dom) {
    const origem = guardado || `https://www.google.com/s2/favicons?domain=${e.dom}&sz=${px}`;
    return `<img src="${origem}" alt="${esc(e.nome)}" loading="lazy"
      style="width:100%;height:100%;object-fit:contain;padding:${folga}px;box-sizing:border-box;"
      onerror="var p=this.parentNode; if(p){ p.textContent='${e.sigla || "?"}'; p.style.color='${e.cor || "#9BA3B4"}'; }">`;
  }
  return e.sigla || "";
}

/* ══════════════════════════════════════════════════════════════
   REVELAÇÃO SUAVE AO ROLAR
   Cada bloco entra com um deslize curto quando aparece na tela.
   Roda uma vez por elemento e respeita quem pediu menos animação
   no sistema. Se o navegador for antigo, simplesmente não faz nada
   e a página continua normal.
   ══════════════════════════════════════════════════════════════ */
function revelarAoRolar(seletores) {
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (quieto || !("IntersectionObserver" in window)) return;

  const alvos = document.querySelectorAll(seletores);
  if (!alvos.length) return;

  /* Seguro contra página em branco.
     O efeito abaixo esconde os blocos e devolve quando eles entram na tela.
     Se isso não acontecer (impressão, salvar em PDF, navegador estranho,
     aba aberta em segundo plano), a página ficaria vazia. Estas três linhas
     garantem que o conteúdo sempre aparece. */
  function mostrarTudo() {
    alvos.forEach(el => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.willChange = "auto";
    });
  }
  setTimeout(mostrarTudo, 3000);
  window.addEventListener("beforeprint", mostrarTudo);

  alvos.forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    el.style.transition = "opacity .65s cubic-bezier(.22,.61,.36,1), transform .65s cubic-bezier(.22,.61,.36,1)";
    el.style.willChange = "opacity, transform";
  });

  const obs = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.style.opacity = "1";
      e.target.style.transform = "none";
      e.target.style.willChange = "auto";
      obs.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });

  alvos.forEach(el => obs.observe(el));
}

/* ══════════════════════════════════════════════════════════════
   MEDIÇÃO DE VISITAS
   Conta quantas pessoas abrem cada página. Não usa cookie, não
   guarda nada sobre quem visitou, e por isso não exige aviso de
   cookies no site.

   PARA LIGAR:
   1. Entre em dash.cloudflare.com, menu "Analytics & Logs",
      depois "Web Analytics", e clique em "Add a site".
   2. Informe o endereço:  alvittaluc.github.io/home-office-hub
   3. A Cloudflare mostra um trecho de código com um token, que é
      um monte de letras e números entre aspas.
   4. Copie SÓ esse token e cole na linha abaixo, no lugar de
      COLE-O-TOKEN-AQUI, mantendo as aspas.

   Enquanto o token não estiver preenchido, nada é carregado e o
   site funciona normalmente.
   ══════════════════════════════════════════════════════════════ */
const TOKEN_MEDICAO = "";

(function medicao() {
  if (!TOKEN_MEDICAO || TOKEN_MEDICAO === "COLE-O-TOKEN-AQUI") return;
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", JSON.stringify({ token: TOKEN_MEDICAO }));
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════════════════════════
   PLATAFORMA: coluna fixa à esquerda no lugar do menu do topo
   (só na cópia de teste; é colado no fim do layout.js da cópia)

   Quem está na conta e já fez o perfil vê a coluna. Quem está fora,
   na entrada ou no primeiro perfil, continua com o topo de hoje.
   As páginas não mudam: só a moldura em volta delas.
   ══════════════════════════════════════════════════════════════ */
const Plataforma = (function () {
  const IC = {
    inicio: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
    vagas: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7M3 13h18"/>',
    empresas: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
    cursos: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5M8.5 7.5h7"/>',
    hoje: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    painel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    imposto: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    candidaturas: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    trabalhos: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    curriculo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    estudo: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 10.5h6M9 13.5h4"/>',
    transcricao: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    guia: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8v.2"/>',
    perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    dados: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    acima: '<path d="M7 14l5-5 5 5"/>',
    volta: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  };
  const ic = n => `<svg class="pl-ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ""}</svg>`;

  /* Os itens da coluna. Os do Meu Controle têm os mesmos nomes e a mesma
     ordem da coluna que ele já tem hoje. */
  const GRUPOS = [
    ["", [["inicio", "Início", "inicio.html"]]],
    ["Meu Controle", [["mc-hoje", "Hoje", "controle.html#hoje", "hoje"], ["mc-agenda", "Agenda", "controle.html#agenda", "agenda"],
      ["mc-painel", "Ganhos", "controle.html#painel", "painel"], ["mc-imposto", "Imposto", "controle.html#imposto", "imposto"],
      ["mc-aplicacoes", "Candidaturas", "controle.html#aplicacoes", "candidaturas"], ["mc-trabalhos", "Trabalhos", "controle.html#trabalhos", "trabalhos"]]],
    ["Aprender", [["cursos", "Cursos", "cursos.html"]]],
    ["Ferramentas", [["curriculo", "Avaliar currículo", "ferramenta-curriculo.html"], ["estudo", "Estudar uma diretriz", "estudo-diretriz.html"], ["transcricao", "Transcrição ao vivo", "transcricao.html"]]],
  ];

  function atual() {
    const pg = location.pathname.split("/").pop() || "index.html";
    if (/^curso-/.test(pg)) return "cursos";
    if (pg === "vagas.html") { const q = location.search; return /areas=1|area=/.test(q) ? "v-form" : /ver=todas/.test(q) ? "v-todas" : /ver=voce/.test(q) || !q ? "v-voce" : "vagas"; }
    if (pg === "controle.html") {
      const t = (location.hash.slice(1).split("/")[0]) || "hoje";
      if (t === "trabalho") return "mc-trabalhos";
      if (t === "dados") return "conta";
      return "mc-" + t;
    }
    return { "inicio.html": "inicio", "index.html": "inicio", "vagas.html": "vagas", "vaga.html": "vagas", "empresas.html": "empresas",
      "cursos.html": "cursos", "ferramenta-curriculo.html": "curriculo", "estudo-diretriz.html": "estudo", "transcricao.html": "transcricao",
      "perfil-profissional.html": "perfil", "perfil.html": "perfil", "como-funciona.html": "guia" }[pg] || "";
  }

  const CORES = [["clara", "Clara"], ["azul", "Azul claro"], ["escura", "Escura"]];
  function corGuardada() { try { const c = localStorage.getItem("plat-cor"); return CORES.some(x => x[0] === c) ? c : "clara"; } catch (e) { return "clara"; } }

  const CSS = `
  body.plat { padding-left:252px; }
  body.plat header.site, body.plat footer.site { display:none !important; }
  .pl-lado { --l-bg:#FFFFFF; --l-borda:#EAE4D9; --l-txt:#4A5666; --l-forte:#10203A; --l-rot:#8A929C; --l-hover:#F6F3EE;
    --l-ativo:#EAF1F8; --l-ativo-txt:#1A4893; --l-ativo-ic:#1A4893; --l-sombra-ativo:none;
    position:fixed; left:0; top:0; bottom:0; width:252px; z-index:300; display:flex; flex-direction:column;
    background:var(--l-bg); border-right:1px solid var(--l-borda); font-family:var(--body,'Geist',system-ui,sans-serif); }
  .pl-lado[data-cor="azul"] { --l-bg:#EEF3F9; --l-borda:#DCE6F1; --l-txt:#44546A; --l-rot:#7D8DA2; --l-hover:#E4ECF6;
    --l-ativo:#FFFFFF; --l-sombra-ativo:0 1px 2px rgba(16,32,58,.08), 0 4px 12px -6px rgba(26,72,147,.25); }
  .pl-lado[data-cor="escura"] { --l-bg:#26334A; --l-borda:#26334A; --l-txt:#C3CDD9; --l-forte:#FFFFFF; --l-rot:#8C9BAE; --l-hover:rgba(255,255,255,.06);
    --l-ativo:rgba(255,255,255,.11); --l-ativo-txt:#FFFFFF; --l-ativo-ic:#A9CBEA; }
  .pl-topo { display:flex; align-items:center; gap:10px; padding:20px 20px 12px; color:var(--l-forte); }
  .pl-topo img { width:30px; height:30px; display:block; }
  .pl-topo b { display:block; font-weight:600; font-size:15px; letter-spacing:-.015em; line-height:1.2; }
  .pl-area { display:block; font-size:11.5px; font-weight:500; color:var(--l-rot); }
  .pl-volta { display:flex; align-items:center; gap:8px; margin:0 12px 4px; padding:7px 10px; border-radius:10px; font-size:13px; color:var(--l-rot); text-decoration:none; }
  .pl-volta:hover { background:var(--l-hover); color:var(--l-forte); }
  .pl-volta .pl-ic { width:16px; height:16px; }
  .pl-nav { flex:1; overflow-y:auto; padding:4px 12px 12px; scrollbar-width:thin; }
  .pl-grupo { margin-top:16px; }
  .pl-grupo:first-child { margin-top:4px; }
  .pl-grupo > span { display:block; font-size:10.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--l-rot); padding:0 10px 6px; }
  .pl-item { display:flex; align-items:center; gap:11px; padding:8px 10px; border-radius:10px; font-size:14px; color:var(--l-txt);
    text-decoration:none; transition:background .15s, color .15s; }
  .pl-item:hover { background:var(--l-hover); color:var(--l-forte); }
  .pl-item[aria-current="page"] { background:var(--l-ativo); color:var(--l-ativo-txt); font-weight:550; box-shadow:var(--l-sombra-ativo); }
  .pl-item[aria-current="page"] .pl-ic { color:var(--l-ativo-ic); }
  .pl-sub { padding:6px 10px 6px 39px; font-size:13.5px; position:relative; }
  .pl-sub::before { content:""; position:absolute; left:19px; top:0; bottom:0; width:1.5px; background:var(--l-borda); }
  .pl-lado[data-cor="escura"] .pl-sub::before { background:rgba(255,255,255,.12); }
  .pl-sub .pl-n { margin-left:auto; font-size:11.5px; font-weight:500; color:var(--l-rot); }
  .pl-sub[aria-current="page"] .pl-n { color:var(--l-ativo-txt); }
  .pl-ic { width:18px; height:18px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .pl-pe { border-top:1px solid var(--l-borda); padding:10px 12px 12px; position:relative; }
  .pl-lado[data-cor="escura"] .pl-pe { border-top-color:rgba(255,255,255,.08); }
  .pl-eu { width:100%; display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:12px; text-align:left; background:none; border:0; cursor:pointer; color:var(--l-txt); font:inherit; }
  .pl-eu:hover, .pl-eu[aria-expanded="true"] { background:var(--l-hover); }
  .pl-av { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font-weight:600; font-size:12.5px; color:#fff;
    background:linear-gradient(135deg,#4E9AC8,#1A4893); flex-shrink:0; }
  .pl-eu b { display:block; font-size:13.5px; font-weight:550; color:var(--l-forte); line-height:1.25; }
  .pl-eu small { display:block; font-size:11.5px; color:var(--l-rot); }
  .pl-eu .pl-ic { margin-left:auto; width:16px; height:16px; }
  .pl-eu .hub-selo { margin-top:2px; }
  .pl-menu { position:absolute; left:12px; right:12px; bottom:calc(100% - 4px); background:#fff; border:1px solid #EAE4D9; border-radius:14px;
    box-shadow:0 2px 4px rgba(16,32,58,.05), 0 24px 48px -20px rgba(16,32,58,.3); padding:6px; display:none; }
  .pl-menu.on { display:block; }
  .pl-menu a { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:9px; font-size:13.5px; color:#10203A; text-decoration:none; }
  .pl-menu a:hover { background:#F6F3EE; }
  .pl-menu a .pl-ic { color:#66717F; width:17px; height:17px; }
  .pl-menu hr { border:0; border-top:1px solid #EAE4D9; margin:5px 4px; }
  .pl-cor { display:flex; align-items:center; gap:6px; padding:8px 10px 0; font-size:11px; color:var(--l-rot); }
  .pl-cor button { width:18px; height:18px; border-radius:50%; border:1.5px solid rgba(16,32,58,.18); cursor:pointer; padding:0; }
  .pl-cor button[aria-pressed="true"] { outline:2px solid #1A4893; outline-offset:2px; }
  .pl-cor .c-clara { background:#fff; } .pl-cor .c-azul { background:#DCE6F1; } .pl-cor .c-escura { background:#26334A; }
  .pl-barra { display:none; }
  .pl-veu { display:none; }
  body.plat #abas { gap:10px; border-bottom:0; margin:4px 0 18px; padding:2px; }
  body.plat #abas .aba { padding:13px 20px; border:1px solid var(--line,#DED7CA); border-radius:14px; background:#fff; font-size:15px; font-weight:550; color:var(--ink,#10203A); margin:0; box-shadow:0 1px 2px rgba(16,32,58,.04); }
  body.plat #abas .aba .n { font-size:12.5px; font-weight:600; background:var(--bg-soft,#F1ECE3); color:var(--ink-2,#54606F); padding:2px 8px; border-radius:999px; }
  body.plat #abas .aba:hover { border-color:#C9C0B0; }
  body.plat #abas .aba.on { background:var(--signal-suave,#EAF1F8); border-color:#9DBBE0; color:var(--signal,#1A4893); }
  body.plat #abas .aba.on .n { background:#fff; color:var(--signal,#1A4893); }
  body.plat #abas .aba.form.on { background:#F1EEF7; border-color:#C9BEE6; color:var(--violet,#5B4B9E); }
  body.plat #abas .aba.form.on .n { background:#fff; color:var(--violet,#5B4B9E); }
  /* o Meu Controle perde a coluna dele: os itens agora estão na coluna da plataforma */
  body.plat .ct-lado { display:none !important; }
  body.plat .ct-app { grid-template-columns:minmax(0,1fr) !important; }
  @media (max-width:960px) {
    body.plat { padding-left:0; padding-top:60px; }
    .pl-lado { transform:translateX(-102%); transition:transform .25s cubic-bezier(.2,.8,.2,1); width:280px; box-shadow:30px 0 60px -30px rgba(16,32,58,.45); }
    .pl-lado.on { transform:none; }
    .pl-barra { display:flex; position:fixed; top:0; left:0; right:0; height:60px; z-index:250; align-items:center; gap:12px; padding:0 14px;
      background:rgba(255,255,255,.9); backdrop-filter:blur(14px); border-bottom:1px solid #EAE4D9; }
    .pl-barra button { width:40px; height:40px; border-radius:12px; border:1px solid #DED7CA; background:#fff; display:grid; place-items:center; color:#10203A; cursor:pointer; }
    .pl-barra a { display:flex; align-items:center; gap:9px; font-weight:600; font-size:15px; color:#10203A; text-decoration:none; }
    .pl-barra img { width:28px; height:28px; }
    .pl-veu { display:block; position:fixed; inset:0; background:rgba(15,29,51,.35); z-index:290; opacity:0; pointer-events:none; transition:opacity .2s; }
    .pl-veu.on { opacity:1; pointer-events:auto; }
  }`;

  function iniciais(nome) {
    const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
    return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }

  function montar() {
    const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);
    document.body.classList.add("plat");
    let meta = {};
    try { meta = JSON.parse(localStorage.getItem("sb-zrqucjktympnwilbvisw-auth-token")).user.user_metadata || {}; } catch (e) {}
    const nome = meta.nome || Acesso.email().split("@")[0];

    const lado = document.createElement("aside");
    lado.className = "pl-lado"; lado.id = "plLado"; lado.dataset.cor = corGuardada();
    lado.setAttribute("aria-label", "Menu do Hub");
    lado.innerHTML = `
      <a class="pl-topo" href="inicio.html" style="text-decoration:none">${marca(30)}<span><b>Home Office Hub</b><small class="pl-area">Área do aluno</small></span></a>
      <a class="pl-volta" href="index.html">${ic("volta")}Voltar para o site</a>
      <nav class="pl-nav">${GRUPOS.map(([g, itens]) => `<div class="pl-grupo">${g ? `<span>${g}</span>` : ""}${itens.map(([id, n, href, icone, sub]) =>
        sub ? `<a class="pl-item pl-sub" data-id="${id}" href="${href}"><span>${n}</span><b class="pl-n" data-conta="${id}"></b></a>`
            : `<a class="pl-item" data-id="${id}" href="${href}">${ic(icone || id)}<span>${n}</span></a>`).join("")}</div>`).join("")}
        <div class="pl-grupo" id="plEquipe" hidden><span>Equipe</span><a class="pl-item" data-id="equipe" href="../painel.html">${ic("equipe")}<span>Painel da equipe</span></a></div>
      </nav>
      <div class="pl-pe">
        <div class="pl-menu" id="plMenu" role="menu">
          <a href="perfil-profissional.html">${ic("perfil")}Perfil profissional</a>
          <a href="perfil.html">${ic("perfil")}Meu perfil público</a>
          <a href="como-funciona.html">${ic("guia")}Como funciona o trabalho</a>
          <a href="controle.html#dados">${ic("dados")}Seus dados</a>
          <hr><a href="#" id="plSair">${ic("sair")}Sair da conta</a>
        </div>
        <button class="pl-eu" id="plEu" aria-expanded="false" aria-controls="plMenu">
          <span class="pl-av">${esc(iniciais(nome))}</span>
          <span style="min-width:0"><b>${esc(nome)}</b><span data-plano-selo="mini">${Acesso.seloPlano(true)}</span></span>
          ${ic("acima")}
        </button>
        <div class="pl-cor" title="Só no teste: para escolher a cor da coluna">Cor (teste):${CORES.map(([k, n]) => `<button class="c-${k}" data-cor="${k}" aria-label="${n}" title="${n}" aria-pressed="${k === lado.dataset.cor}"></button>`).join("")}</div>
      </div>`;
    document.body.prepend(lado);
    const barra = document.createElement("div");
    barra.className = "pl-barra";
    barra.innerHTML = `<button id="plAbrir" aria-label="Abrir o menu">${ic("menu")}</button><a href="inicio.html">${marca(28)}Home Office Hub</a>`;
    document.body.prepend(barra);
    const veu = document.createElement("div"); veu.className = "pl-veu"; document.body.appendChild(veu);

    const marcarAtual = () => { const a = atual(); lado.querySelectorAll(".pl-item").forEach(el => { el.removeAttribute("aria-current"); if (el.dataset.id === a) el.setAttribute("aria-current", "page"); }); };
    marcarAtual();
    window.addEventListener("hashchange", marcarAtual);

    const fechar = () => { lado.classList.remove("on"); veu.classList.remove("on"); };
    barra.querySelector("#plAbrir").addEventListener("click", () => { lado.classList.add("on"); veu.classList.add("on"); });
    veu.addEventListener("click", fechar);
    lado.querySelectorAll(".pl-item").forEach(a => a.addEventListener("click", fechar));

    const eu = lado.querySelector("#plEu"), menu = lado.querySelector("#plMenu");
    eu.addEventListener("click", ev => { ev.stopPropagation(); const on = menu.classList.toggle("on"); eu.setAttribute("aria-expanded", on); });
    document.addEventListener("click", ev => { if (!menu.contains(ev.target)) { menu.classList.remove("on"); eu.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", ev => { if (ev.key === "Escape") { menu.classList.remove("on"); fechar(); } });
    lado.querySelector("#plSair").addEventListener("click", ev => {
      ev.preventDefault();
      try { localStorage.removeItem("sb-zrqucjktympnwilbvisw-auth-token"); } catch (e) {}
      location.href = "entrar.html";
    });
    lado.querySelectorAll("[data-cor]").forEach(b => b.addEventListener("click", () => {
      lado.dataset.cor = b.dataset.cor;
      try { localStorage.setItem("plat-cor", b.dataset.cor); } catch (e) {}
      lado.querySelectorAll(".pl-cor button").forEach(x => x.setAttribute("aria-pressed", x === b));
    }));
    // quantas vagas em cada lista, como a página de vagas conta
    Promise.all([lerVagas(), lerEspecificas()]).then(([g, e]) => {
      const minhas = Acesso.areas() || [], subs = Acesso.subareas();
      const nG = (g.vagas || []).length, nE = (e.vagas || []).length;
      const nV = nG + (e.vagas || []).filter(v => Acesso.vagaDasMinhasAreas(v, minhas, subs)).length;
      const pinta = (id, n) => { const el = lado.querySelector(`[data-conta="${id}"]`); if (el) el.textContent = n; };
      pinta("v-voce", nV); pinta("v-todas", nG); pinta("v-form", nE);
    }).catch(() => {});
    try { if (JSON.parse(localStorage.getItem("hub-equipe") || "null").sim) lado.querySelector("#plEquipe").hidden = false; } catch (e) {}
  }

  return { montar };
})();

/* O site continua com o menu do topo (Início, Vagas, Empresas, Como funciona).
   A coluna aparece só nas páginas da Área do aluno, para quem está na conta. */
const PAGINAS_DO_ALUNO = /^(inicio|controle|cursos|curso-[a-z]+|ferramenta-curriculo|estudo-diretriz|transcricao|perfil-profissional|perfil)\.html$/;
function montarLayout(ativa) {
  const pg = location.pathname.split("/").pop() || "index.html";
  const naArea = PAGINAS_DO_ALUNO.test(pg) && !(pg === "perfil-profissional.html" && /primeira=1/.test(location.search));
  if (!Acesso.logado() || !Acesso.perfilFeito() || !naArea) {
    montarLayoutTopo(ativa === "ferramentas" || ativa === "cursos" ? "aluno" : ativa);
    // a aba da Área do aluno se destaca um pouco das outras
    const s = document.createElement("style");
    s.textContent = 'nav.tabs a[href="inicio.html"]{color:var(--signal);background:var(--signal-suave);font-weight:550}nav.tabs a[href="inicio.html"]:hover{background:#DDE9F5}';
    document.head.appendChild(s);
    return;
  }
  Plataforma.montar(ativa);
}
