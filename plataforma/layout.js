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
    if (localStorage.getItem("plat-exemplo-pronto") !== "3") { document.documentElement.style.visibility = "hidden"; location.replace("exemplo.html?voltar=" + encodeURIComponent(paginaAtual() + location.search + location.hash)); return; }
    if (!SO_COM_CONTA || chegandoPorLink()) return;
    if (paginaAtual() === "index.html" && localStorage.getItem("plat-modelo") !== "5" && logado() && perfilFeito()) { document.documentElement.style.visibility = "hidden"; location.replace("inicio.html"); return; }
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
   PLATAFORMA: modelos de tela para comparar (só na cópia de teste;
   é colado no fim do layout.js da cópia)

   As páginas não mudam: só a moldura em volta delas. Cada modelo
   organiza a mesma lista de seções de um jeito:
     1 Coluna completa    coluna clara com tudo aberto
     2 Ícones e menu      trilho de ícones + menu da seção ao lado
     3 Abas no topo       seções em abas no alto e as partes logo abaixo
     4 Coluna compacta    trilho com ícone e nome; no celular vira barra embaixo
     5 Site e Área do aluno  o site com o menu de hoje; a coluna só na área
   O modelo escolhido fica em localStorage "plat-modelo".
   ══════════════════════════════════════════════════════════════ */
/* Quanto do perfil profissional está preenchido, pelas mesmas seis partes da página do perfil.
   Na cópia de teste o perfil fica em localStorage; no site, viria da conta. */
const PerfilHub = {
  PARTES: [["idiomas", "idiomas"], ["formacao", "formação"], ["areas", "áreas"], ["experiencias", "experiências"], ["ferramentas", "ferramentas"], ["mora", "onde mora e horas"]],
  ler() {
    try { const s = JSON.parse(localStorage.getItem("sb-zrqucjktympnwilbvisw-auth-token")); const r = (JSON.parse(localStorage.getItem("teste-porta-perfis")) || {})[s.user.id]; if (r && r.dados) return r.dados; } catch (e) {}
    try { return JSON.parse(localStorage.getItem("hub-perfil-prof-previa")); } catch (e) { return null; }
  },
  partes(P) {
    P = P || this.ler(); if (!P) return null;
    return { idiomas: (P.idiomas || []).length > 0, formacao: (P.formacao || []).length > 0 || !!P.semFormacao, areas: Object.keys(P.areas || {}).length > 0,
      experiencias: (P.experiencias || []).length > 0, ferramentas: (P.ferramentas || []).length > 0, mora: !!String(P.mora || "").trim() && !!String(P.horas || "").trim() };
  },
  quanto() { const x = this.partes(); if (!x) return null; return Math.round(Object.values(x).filter(Boolean).length / 6 * 100); },
  falta() { const x = this.partes(); if (!x) return []; return this.PARTES.filter(([k]) => !x[k]).map(p => p[1]); },
};

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
    controle: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    curriculo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    estudo: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 10.5h6M9 13.5h4"/>',
    transcricao: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    ferramentas: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.7 1.7 0 0 0 2.4 2.4l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-.4-.4-2.2z"/>',
    guia: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8v.2"/>',
    perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    dados: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    acima: '<path d="M7 14l5-5 5 5"/>',
    abaixo: '<path d="M7 10l5 5 5-5"/>',
    volta: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    relogio: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4.5H8"/><path d="M12 8v4l3 2"/>',
    alfinete: '<path d="M9 3.5h6l-1 6.5 3.5 3.5h-11L10 10z"/><path d="M12 13.5V21"/>',
    estrela: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    formacao: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5"/>',
    recolher: '<path d="M11 7l-5 5 5 5M18 7l-5 5 5 5"/>',
  };
  const ic = n => `<svg class="pl-ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ""}</svg>`;

  /* As seções do Hub. Os itens do Meu Controle têm os nomes e a ordem que ele já tem. */
  const SECOES = [
    { id: "inicio", nome: "Início", ic: "inicio", aluno: true, itens: [["inicio", "Seu dia", "inicio.html", "inicio"]] },
    { id: "vagas", nome: "Vagas", ic: "vagas", itens: [["v-voce", "Para você", "vagas.html?ver=voce", "vagas"], ["v-todas", "Abertas a todos", "vagas.html?ver=todas", "vagas"],
      ["v-form", "Pedem formação", "vagas.html?areas=1", "vagas"], ["empresas", "Empresas", "empresas.html", "empresas"]] },
    { id: "controle", nome: "Meu Controle", curto: "Controle", ic: "controle", aluno: true, itens: [["mc-hoje", "Hoje", "controle.html#hoje", "hoje"], ["mc-agenda", "Agenda", "controle.html#agenda", "agenda"],
      ["mc-painel", "Ganhos", "controle.html#painel", "painel"], ["mc-imposto", "Imposto", "controle.html#imposto", "imposto"],
      ["mc-aplicacoes", "Candidaturas", "controle.html#aplicacoes", "candidaturas"], ["mc-trabalhos", "Trabalhos", "controle.html#trabalhos", "trabalhos"]] },
    { id: "aprender", nome: "Aprender", ic: "cursos", aluno: true, itens: [["cursos", "Cursos", "cursos.html", "cursos"], ["guia", "Como funciona", "como-funciona.html", "guia"]] },
    { id: "ferramentas", nome: "Ferramentas", ic: "ferramentas", aluno: true, itens: [["curriculo", "Avaliar currículo", "ferramenta-curriculo.html", "curriculo"],
      ["estudo", "Estudar uma diretriz", "estudo-diretriz.html", "estudo"], ["transcricao", "Transcrição ao vivo", "transcricao.html", "transcricao"]] },
    { id: "voce", nome: "Você", ic: "perfil", aluno: true, itens: [["perfil-prof", "Meu perfil", "perfil-profissional.html", "perfil"]] },
    { id: "equipe", nome: "Equipe", ic: "equipe", aluno: true, soEquipe: true, itens: [["equipe", "Painel da equipe", "../painel.html", "equipe"]] },
  ];
  const MODELOS = { 1: "Ícones e nomes" };   // o modelo 2 (abre com o mouse) saiu em 06/11/2026
  // rodada de 05/11: quatro colunas no estilo dos sistemas de gestão, todas a partir do modelo que o dono escolheu
  function modelo() { try { const m = localStorage.getItem("plat-modelo"); return MODELOS[m] ? +m : 1; } catch (e) { return 1; } }
  const daEquipe = () => { try { return !!JSON.parse(localStorage.getItem("hub-equipe") || "null").sim; } catch (e) { return false; } };
  const secoes = () => SECOES.filter(s => !s.soEquipe || daEquipe());

  function atual() {
    const pg = location.pathname.split("/").pop() || "index.html";
    if (/^curso-/.test(pg)) return "cursos";
    if (pg === "vagas.html") { const q = location.search; return /areas=1|area=/.test(q) ? "v-form" : /ver=todas/.test(q) ? "v-todas" : "v-voce"; }
    if (pg === "controle.html") {
      const t = (location.hash.slice(1).split("/")[0]) || "hoje";
      return t === "trabalho" ? "mc-trabalhos" : t === "dados" ? "conta" : "mc-" + t;
    }
    return { "inicio.html": "inicio", "index.html": "inicio", "vaga.html": "v-voce", "empresas.html": "empresas", "cursos.html": "cursos",
      "ferramenta-curriculo.html": "curriculo", "estudo-diretriz.html": "estudo", "transcricao.html": "transcricao",
      "perfil-profissional.html": "perfil-prof", "perfil.html": "conta", "como-funciona.html": "guia" }[pg] || "";
  }
  const secaoDe = id => SECOES.find(s => s.itens.some(i => i[0] === id)) || null;
  const item = ([id, n, href, icone], semIcone) =>
    `<a class="pl-item" data-id="${id}" href="${href}">${semIcone ? "" : ic(icone)}<span>${n}</span><b class="pl-n" data-conta="${id}"></b></a>`;

  const CSS = `
  body.plat header.site, body.plat footer.site { display:none !important; }
  .pl-ic { width:18px; height:18px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .pl-item { display:flex; align-items:center; gap:11px; padding:8px 10px; border-radius:10px; font-size:14px; color:#4A5666; text-decoration:none; transition:background .15s, color .15s; }
  .pl-item:hover { background:#F4F0EA; color:#10203A; }
  .pl-item[aria-current="page"] { background:#EAF1F8; color:#1A4893; font-weight:550; }
  .pl-item .pl-n { margin-left:auto; font-size:11.5px; font-weight:500; color:#8A929C; }
  .pl-item .pl-n:empty { display:none; }
  .pl-item[aria-current="page"] .pl-n { color:#1A4893; }
  .pl-rot { display:block; font-size:10.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#8A929C; padding:0 10px 6px; }
  .pl-av { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font-weight:600; font-size:12.5px; color:#fff; background:linear-gradient(135deg,#4E9AC8,#1A4893); flex-shrink:0; }
  .pl-eu { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:12px; text-align:left; background:none; border:0; cursor:pointer; color:#4A5666; font:inherit; }
  .pl-eu:hover, .pl-eu[aria-expanded="true"] { background:#F4F0EA; }
  .pl-eu b { display:block; font-size:13.5px; font-weight:550; color:#10203A; line-height:1.25; }
  .pl-eu .hub-selo { margin-top:2px; }
  .pl-menu { position:absolute; background:#fff; border:1px solid #EAE4D9; border-radius:14px; min-width:230px;
    box-shadow:0 2px 4px rgba(16,32,58,.05), 0 24px 48px -20px rgba(16,32,58,.3); padding:6px; display:none; z-index:400; }
  .pl-menu.on { display:block; }
  .pl-menu a { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:9px; font-size:13.5px; color:#10203A; text-decoration:none; }
  .pl-menu a:hover { background:#F6F3EE; }
  .pl-menu a .pl-ic { color:#66717F; width:17px; height:17px; }
  .pl-menu hr { border:0; border-top:1px solid #EAE4D9; margin:5px 4px; }
  .pl-barra, .pl-veu { display:none; }
  body.plat #abas { gap:10px; border-bottom:0; margin:4px 0 18px; padding:2px; }
  body.plat #abas .aba { padding:13px 20px; border:1px solid var(--line,#DED7CA); border-radius:14px; background:#fff; font-size:15px; font-weight:550; color:var(--ink,#10203A); margin:0; box-shadow:0 1px 2px rgba(16,32,58,.04); }
  body.plat #abas .aba .n { font-size:12.5px; font-weight:600; background:var(--bg-soft,#F1ECE3); color:var(--ink-2,#54606F); padding:2px 8px; border-radius:999px; }
  body.plat #abas .aba.on { background:var(--signal-suave,#EAF1F8); border-color:#9DBBE0; color:var(--signal,#1A4893); }
  body.plat #abas .aba.on .n { background:#fff; color:var(--signal,#1A4893); }
  body.plat #abas .aba.form.on { background:#F1EEF7; border-color:#C9BEE6; color:var(--violet,#5B4B9E); }
  body.plat #abas .aba.form.on .n { background:#fff; color:var(--violet,#5B4B9E); }
  /* o Meu Controle perde a coluna dele: os itens dele agora estão na moldura */
  body.plat .ct-lado { display:none !important; }
  body.plat .ct-app { grid-template-columns:minmax(0,1fr) !important; }

  /* ── 1 e 5: coluna ── */
  .m-col { position:fixed; left:0; top:0; bottom:0; width:252px; z-index:300; display:flex; flex-direction:column; background:#fff; border-right:1px solid #EAE4D9; }
  body.m1, body.m5 { padding-left:252px; }
  .m-col .pl-topo { display:flex; align-items:center; gap:10px; padding:20px 20px 12px; color:#10203A; text-decoration:none; }
  .pl-topo b { display:block; font-weight:600; font-size:15px; letter-spacing:-.015em; line-height:1.2; }
  .pl-topo small { display:block; font-size:11.5px; font-weight:500; color:#8A929C; }
  .pl-volta { display:flex; align-items:center; gap:8px; margin:0 12px 4px; padding:7px 10px; border-radius:10px; font-size:13px; color:#8A929C; text-decoration:none; }
  .pl-volta:hover { background:#F4F0EA; color:#10203A; }
  .m-col nav { flex:1; overflow-y:auto; padding:4px 12px 12px; scrollbar-width:thin; }
  .m-col .pl-grupo { margin-top:16px; } .m-col .pl-grupo:first-child { margin-top:4px; }
  .m-col .pl-pe { border-top:1px solid #EAE4D9; padding:10px 12px 12px; position:relative; }
  .m-col .pl-eu { width:100%; }
  .m-col .pl-eu > .pl-ic { margin-left:auto; width:16px; height:16px; }
  .m-col .pl-menu { left:12px; right:12px; bottom:calc(100% - 4px); }

  /* ── 2: trilho de ícones + menu da seção ── */
  body.m2 { padding-left:292px; }
  .m-trilho { position:fixed; left:0; top:0; bottom:0; width:72px; z-index:310; background:#fff; border-right:1px solid #EAE4D9; display:flex; flex-direction:column; align-items:center; padding:16px 0 12px; gap:4px; }
  .m-trilho .r-logo { margin-bottom:14px; }
  .r-bt { width:58px; padding:8px 0 6px; border-radius:12px; border:0; background:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; color:#66717F; font:500 10.5px/1.2 var(--body,'Geist',sans-serif); text-decoration:none; }
  .r-bt .pl-ic { width:21px; height:21px; }
  .r-bt:hover { background:#F4F0EA; color:#10203A; }
  .r-bt[aria-pressed="true"] { background:#EAF1F8; color:#1A4893; }
  .m-trilho .r-pe { margin-top:auto; position:relative; }
  .m-trilho .pl-eu { padding:4px; } .m-trilho .pl-menu { left:8px; bottom:2px; transform:translateX(56px); }
  .m-painel { position:fixed; left:72px; top:0; bottom:0; width:224px; z-index:300; background:#FBF9F5; border-right:1px solid #EAE4D9; padding:22px 12px; overflow-y:auto; }
  .m-painel h2 { font:600 17px/1.2 var(--body,'Geist',sans-serif); color:#10203A; letter-spacing:-.01em; padding:0 10px 14px; }
  .m-painel .pl-item[aria-current="page"] { background:#fff; box-shadow:0 1px 2px rgba(16,32,58,.08), 0 4px 12px -6px rgba(26,72,147,.25); }

  /* ── 3: abas no topo ── */
  body.m3 { padding-top:112px; }
  .m-topo { position:fixed; top:0; left:0; right:0; z-index:300; background:#fff; border-bottom:1px solid #EAE4D9; }
  .m-topo .t-1 { height:60px; display:flex; align-items:center; gap:18px; padding:0 22px; }
  .m-topo .t-logo { display:flex; align-items:center; gap:10px; font-weight:600; font-size:15px; color:#10203A; text-decoration:none; flex-shrink:0; }
  .t-abas { display:flex; gap:2px; height:100%; overflow-x:auto; scrollbar-width:none; }
  .t-abas a { display:flex; align-items:center; gap:8px; padding:0 14px; font-size:14px; font-weight:500; color:#54606F; text-decoration:none; border-bottom:2.5px solid transparent; white-space:nowrap; }
  .t-abas a .pl-ic { width:17px; height:17px; }
  .t-abas a:hover { color:#10203A; }
  .t-abas a[aria-current="page"] { color:#1A4893; border-bottom-color:#1A4893; }
  .m-topo .t-conta { margin-left:auto; position:relative; flex-shrink:0; }
  .m-topo .pl-menu { right:0; top:calc(100% + 6px); }
  .t-sub { display:flex; align-items:center; gap:6px; height:52px; padding:0 22px; background:#FBF9F5; border-top:1px solid #EFEAE1; overflow-x:auto; scrollbar-width:none; }
  .t-sub .pl-item { padding:7px 13px; border-radius:999px; font-size:13.5px; white-space:nowrap; flex-shrink:0; }
  .t-sub .pl-item .pl-ic { width:16px; height:16px; }
  .t-sub .pl-item[aria-current="page"] { background:#fff; border:1px solid #CFE0F1; padding:6px 12px; }
  .t-sub .t-tit { font-size:12px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#8A929C; margin-right:8px; white-space:nowrap; }

  /* ── 4: coluna compacta + partes no alto ── */
  body.m4 { padding-left:88px; padding-top:52px; }
  .m-compacta { position:fixed; left:0; top:0; bottom:0; width:88px; z-index:310; background:#fff; border-right:1px solid #EAE4D9; display:flex; flex-direction:column; align-items:center; padding:16px 0 12px; gap:6px; }
  .m-compacta .r-bt { width:74px; font-size:11.5px; padding:9px 0 7px; }
  .m-compacta .r-bt .pl-ic { width:22px; height:22px; }
  .m-compacta .r-logo { margin-bottom:12px; }
  .m-compacta .r-pe { margin-top:auto; position:relative; }
  .m-compacta .pl-eu { padding:4px; } .m-compacta .pl-menu { left:8px; bottom:2px; transform:translateX(70px); }
  .m4-sub { position:fixed; top:0; left:88px; right:0; z-index:290; border-top:0; border-bottom:1px solid #EAE4D9; background:rgba(251,249,245,.94); backdrop-filter:blur(12px); }

  @media (max-width:960px) {
    body.m1, body.m5, body.m2 { padding-left:0; padding-top:60px; }
    .m-col, .m-trilho, .m-painel { transform:translateX(-340px); transition:transform .25s cubic-bezier(.2,.8,.2,1); box-shadow:30px 0 60px -30px rgba(16,32,58,.45); }
    .m-col.on, .m-trilho.on, .m-painel.on { transform:none; }
    .m-col { width:280px; }
    .pl-barra { display:flex; position:fixed; top:0; left:0; right:0; height:60px; z-index:250; align-items:center; gap:12px; padding:0 14px; background:rgba(255,255,255,.92); backdrop-filter:blur(14px); border-bottom:1px solid #EAE4D9; }
    .pl-barra button { width:40px; height:40px; border-radius:12px; border:1px solid #DED7CA; background:#fff; display:grid; place-items:center; color:#10203A; cursor:pointer; }
    .pl-barra a { display:flex; align-items:center; gap:9px; font-weight:600; font-size:15px; color:#10203A; text-decoration:none; }
    .pl-veu { display:block; position:fixed; inset:0; background:rgba(15,29,51,.35); z-index:290; opacity:0; pointer-events:none; transition:opacity .2s; }
    .pl-veu.on { opacity:1; pointer-events:auto; }
    .m-topo .t-1 { padding:0 14px; gap:10px; } .m-topo .t-logo span { display:none; }
    .t-sub { padding:0 14px; }
    .t-abas a { padding:0 10px; }
    .t-abas a .pl-ic { display:none; }
    /* 4 no celular: as seções numa barra embaixo, como num aplicativo */
    body.m4 { padding-left:0; padding-bottom:76px; }
    .m-compacta { top:auto; right:0; width:auto; height:66px; flex-direction:row; justify-content:space-around; padding:4px 4px calc(4px + env(safe-area-inset-bottom,0px)); border-right:0; border-top:1px solid #EAE4D9; gap:0; }
    .m-compacta .r-logo, .m-compacta .r-pe { display:none; }
    .m-compacta .r-bt { width:auto; flex:1; font-size:10.5px; padding:6px 0; }
    .m4-sub { left:0; }
    body.m4 #faixaTeste { bottom:80px !important; }
  }`;

  function iniciais(nome) {
    const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
    return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }
  function nome() {
    let meta = {};
    try { meta = JSON.parse(localStorage.getItem("sb-zrqucjktympnwilbvisw-auth-token")).user.user_metadata || {}; } catch (e) {}
    return meta.nome || Acesso.email().split("@")[0];
  }
  /* avatar com o menu da conta; "comNome" mostra nome e plano ao lado */
  function conta(comNome, extra) {
    return `<div class="pl-menu" role="menu">
        ${extra || ""}<a href="perfil.html">${ic("perfil")}Meu perfil público</a>
        <a href="#" data-rever-tour>${ic("guia")}Fazer o tour de novo</a>
        <a href="controle.html#dados">${ic("dados")}Seus dados</a>
        <hr><a href="#" data-sair>${ic("sair")}Sair da conta</a>
      </div>
      <button class="pl-eu" aria-expanded="false" title="Minha conta">
        <span class="pl-av">${esc(iniciais(nome()))}</span>
        ${comNome ? `<span style="min-width:0"><b>${esc(nome())}</b><span data-plano-selo="mini">${Acesso.seloPlano(true)}</span></span>${ic("acima")}` : ""}
      </button>`;
  }
  function ligarConta(raiz) {
    raiz.querySelectorAll(".pl-eu").forEach(eu => {
      const menu = eu.parentElement.querySelector(".pl-menu");
      eu.addEventListener("click", ev => { ev.stopPropagation(); const on = menu.classList.toggle("on"); eu.setAttribute("aria-expanded", on); });
      document.addEventListener("click", ev => { if (!menu.contains(ev.target)) { menu.classList.remove("on"); eu.setAttribute("aria-expanded", "false"); } });
    });
    raiz.querySelectorAll("[data-rever-tour]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); if (window.PlatTour) window.PlatTour(); }));
    raiz.querySelectorAll("[data-sair]").forEach(a => a.addEventListener("click", ev => {
      ev.preventDefault();
      try { localStorage.removeItem("sb-zrqucjktympnwilbvisw-auth-token"); } catch (e) {}
      location.href = "entrar.html";
    }));
  }
  function gaveta(...paineis) {   // no celular, os modelos de coluna abrem por um botão
    const barra = document.createElement("div"); barra.className = "pl-barra";
    barra.innerHTML = `<button aria-label="Abrir o menu">${ic("menu")}</button><a href="inicio.html">${marca(28)}Home Office Hub</a>`;
    document.body.prepend(barra);
    const veu = document.createElement("div"); veu.className = "pl-veu"; document.body.appendChild(veu);
    const abrir = on => { paineis.forEach(p => p.classList.toggle("on", on)); veu.classList.toggle("on", on); };
    barra.querySelector("button").addEventListener("click", () => abrir(true));
    veu.addEventListener("click", () => abrir(false));
    document.addEventListener("keydown", ev => { if (ev.key === "Escape") abrir(false); });
  }
  function marcarAtual() {
    const a = atual(), s = secaoDe(a);
    document.querySelectorAll(".pl-item").forEach(el => { el.removeAttribute("aria-current"); if (el.dataset.id === a) el.setAttribute("aria-current", "page"); });
    document.querySelectorAll("[data-sec-link]").forEach(el => { el.removeAttribute("aria-current"); if (s && el.dataset.secLink === s.id) el.setAttribute("aria-current", "page"); });
  }
  function contarVagas() {
    Promise.all([lerVagas(), lerEspecificas()]).then(([g, e]) => {
      const minhas = Acesso.areas() || [], subs = Acesso.subareas();
      const nG = (g.vagas || []).length, nE = (e.vagas || []).length;
      const nV = nG + (e.vagas || []).filter(v => Acesso.vagaDasMinhasAreas(v, minhas, subs)).length;
      const pinta = (id, n) => document.querySelectorAll(`[data-conta="${id}"]`).forEach(el => { el.textContent = n; });
      pinta("v-voce", nV); pinta("v-todas", nG); pinta("v-form", nE);
    }).catch(() => {});
  }

  /* 1 (e 5, só com as seções do aluno): coluna clara com tudo aberto */
  function coluna(soAluno) {
    const el = document.createElement("aside"); el.className = "m-col"; el.setAttribute("aria-label", "Menu do Hub");
    const lista = secoes().filter(s => !soAluno || s.aluno).map(s => soAluno && s.id === "aprender" ? Object.assign({}, s, { itens: s.itens.filter(i => i[0] === "cursos") }) : s);
    el.innerHTML = `<a class="pl-topo" href="inicio.html">${marca(30)}<span><b>Home Office Hub</b>${soAluno ? "<small>Área do aluno</small>" : ""}</span></a>
      ${soAluno ? `<a class="pl-volta" href="index.html">${ic("volta")}Voltar para o site</a>` : ""}
      <nav>${lista.map(s => s.id === "inicio" ? `<div class="pl-grupo">${s.itens.map(i => item(i[0] === "inicio" ? ["inicio", "Início", i[2], "inicio"] : i)).join("")}</div>`
        : `<div class="pl-grupo"><span class="pl-rot">${s.nome}</span>${s.itens.map(i => item(i)).join("")}</div>`).join("")}</nav>
      <div class="pl-pe">${conta(true)}</div>`;
    document.body.prepend(el); gaveta(el); ligarConta(el);
  }

  /* 2: trilho de ícones; o menu ao lado mostra as partes da seção escolhida */
  function trilho() {
    const lista = secoes(), daqui = secaoDe(atual()) || lista[0];
    const t = document.createElement("aside"); t.className = "m-trilho"; t.setAttribute("aria-label", "Seções do Hub");
    t.innerHTML = `<a class="r-logo" href="inicio.html" title="Home Office Hub">${marca(32)}</a>
      ${lista.map(s => `<button class="r-bt" data-sec="${s.id}" aria-pressed="${s.id === daqui.id}">${ic(s.ic)}<span>${s.curto || s.nome}</span></button>`).join("")}
      <div class="r-pe">${conta(false)}</div>`;
    const p = document.createElement("aside"); p.className = "m-painel"; p.setAttribute("aria-label", "Partes da seção");
    const pinta = s => { p.innerHTML = `<h2>${s.nome}</h2>${s.itens.map(i => item(i)).join("")}`; marcarAtual(); contarVagas(); };
    pinta(daqui);
    t.querySelectorAll("[data-sec]").forEach(b => b.addEventListener("click", () => {
      const s = lista.find(x => x.id === b.dataset.sec);
      t.querySelectorAll("[data-sec]").forEach(x => x.setAttribute("aria-pressed", x === b));
      if (s.itens.length === 1) { location.href = s.itens[0][2]; return; }
      pinta(s);
    }));
    document.body.prepend(p); document.body.prepend(t); gaveta(t, p); ligarConta(t);
  }

  /* barra com as partes da seção de agora (modelos 3 e 4) */
  function partes(extraClasse) {
    const s = secaoDe(atual());
    const sub = document.createElement("nav"); sub.className = "t-sub " + (extraClasse || ""); sub.setAttribute("aria-label", "Partes da seção");
    sub.innerHTML = s ? `<span class="t-tit">${s.nome}</span>${s.itens.map(i => item(i)).join("")}` : `<span class="t-tit">Sua conta</span>`;
    return sub;
  }

  /* 3: seções em abas no alto, partes logo abaixo */
  function abasNoTopo() {
    const lista = secoes();
    const topo = document.createElement("header"); topo.className = "m-topo";
    topo.innerHTML = `<div class="t-1"><a class="t-logo" href="inicio.html">${marca(28)}<span>Home Office Hub</span></a>
        <nav class="t-abas" aria-label="Seções do Hub">${lista.map(s => `<a href="${s.itens[0][2]}" data-sec-link="${s.id}">${ic(s.ic)}${s.nome}</a>`).join("")}</nav>
        <div class="t-conta">${conta(false)}</div></div>`;
    topo.appendChild(partes());
    document.body.prepend(topo); ligarConta(topo);
  }

  /* 4: coluna estreita com ícone e nome; partes no alto da página */
  function compacta() {
    const lista = secoes();
    const c = document.createElement("aside"); c.className = "m-compacta"; c.setAttribute("aria-label", "Seções do Hub");
    c.innerHTML = `<a class="r-logo" href="inicio.html" title="Home Office Hub">${marca(34)}</a>
      ${lista.map(s => `<a class="r-bt" href="${s.itens[0][2]}" data-sec-link="${s.id}">${ic(s.ic)}<span>${s.curto || s.nome}</span></a>`).join("")}
      <div class="r-pe">${conta(false)}</div>`;
    const css = document.createElement("style");
    css.textContent = '.m-compacta .r-bt[aria-current="page"]{background:#EAF1F8;color:#1A4893}';
    document.head.appendChild(css);
    document.body.prepend(partes("m4-sub")); document.body.prepend(c); ligarConta(c);
  }

  /* ══════════════════════════════════════════════════════════
     COLUNAS NO ESTILO DOS SISTEMAS DE GESTÃO (05/11)
     Todas partem da coluna que o dono escolheu: ícones de um lado,
     nomes do outro, cada um na mesma linha. Cada linha é um link só,
     com as duas metades, então as colunas nunca desalinham.
       1 Ícones e nomes     sempre aberta; dá para recolher
       2 Abre com o mouse   fica só nos ícones e abre por cima ao passar
                            o mouse; um botão a mantém aberta (HubSpot)
       3 Seções e atalhos   cada seção abre e fecha; a pessoa fixa no alto
                            os lugares que mais usa (favoritos do Attio)
       4 Menu flutuante     faixa de ícones com o nome embaixo; a seção
                            abre um menu ao lado do ícone (Pipedrive)
     Em todos: "Buscar no Hub" (Ctrl+K) leva a qualquer página, vaga
     ou empresa digitando um pedaço do nome.
     Cores: vidro (transparente, como o menu do topo do site), papel,
     azul e noite. Ficam em localStorage plat-cor.
     ══════════════════════════════════════════════════════════ */
  const ICONE_AL = { "v-voce": "estrela", "v-todas": "vagas", "v-form": "formacao", empresas: "empresas" };
  const CORES_AL = { vidro: "Vidro", papel: "Papel", azul: "Azul", noite: "Noite" };
  function corDaColuna() { try { const c = localStorage.getItem("plat-cor"); return CORES_AL[c] ? c : "vidro"; } catch (e) { return "vidro"; } }
  const CSS_AL = `
  body.m1, body.m3 { padding-left:296px; transition:padding-left .22s; }
  body.m2 { padding-left:64px; }
  body.m2.al-fixa { padding-left:296px; }
  body.m1.al-fechado, body.m3.al-fechado { padding-left:64px; }
  body.m4 { padding-left:76px; padding-top:0; }
  body.m3 { padding-top:0; }
  /* tons: as duas colunas (ícones e nomes) e o vão entre elas */
  .al, .fl, .fl-menu { --al-trilho:rgba(255,255,255,.46); --al-vao:rgba(255,255,255,0); --al-painel:rgba(255,255,255,.70); --al-borda:rgba(255,255,255,.75);
    --al-linha:rgba(16,32,58,.08); --al-txt:#3F4C5D; --al-forte:#10203A; --al-rot:#7A8594; --al-ic:#5A6676; --al-hover:rgba(16,32,58,.05);
    --al-pill:#FFFFFF; --al-pill-txt:#1A4893; --al-marca:#1A4893; --al-sombra:0 1px 2px rgba(16,32,58,.06), 0 6px 16px -8px rgba(26,72,147,.28);
    --al-vidro:blur(20px) saturate(1.45); }
  [data-cor="papel"] { --al-trilho:#ECE6DC; --al-vao:#F4F0E9; --al-painel:#F6F2EC; --al-borda:#E2DACD; --al-linha:#E2DACD;
    --al-hover:rgba(16,32,58,.045); --al-vidro:none; }
  [data-cor="azul"] { --al-trilho:#DDE7F3; --al-vao:#EAF0F7; --al-painel:#EEF3F9; --al-borda:#D6E1EE; --al-linha:#D6E1EE;
    --al-ic:#4F6178; --al-hover:rgba(26,72,147,.06); --al-vidro:none; }
  [data-cor="noite"] { --al-trilho:rgba(13,26,46,.84); --al-vao:rgba(13,26,46,.0); --al-painel:rgba(20,38,62,.80); --al-borda:rgba(255,255,255,.08);
    --al-linha:rgba(255,255,255,.08); --al-txt:#C4CEDB; --al-forte:#FFFFFF; --al-rot:#8D9BB0; --al-ic:#9FB1C8; --al-hover:rgba(255,255,255,.07);
    --al-pill:rgba(187,211,242,.95); --al-pill-txt:#0F1D33; --al-marca:#BBD3F2; --al-sombra:none; --al-vidro:blur(20px) saturate(1.3); }

  .al { position:fixed; left:0; top:0; bottom:0; width:296px; z-index:300; display:flex; flex-direction:column; overflow:hidden;
    background:linear-gradient(to right, var(--al-trilho) 0 64px, var(--al-vao) 64px 72px, var(--al-painel) 72px);
    -webkit-backdrop-filter:var(--al-vidro); backdrop-filter:var(--al-vidro); border-right:1px solid var(--al-borda);
    box-shadow:1px 0 0 var(--al-linha); transition:width .22s, box-shadow .22s; font-family:var(--body,'Geist',system-ui,sans-serif); }
  .al.fechado { width:64px; }
  .al-linha { display:grid; grid-template-columns:64px 8px minmax(0,1fr); align-items:center; height:39px; flex-shrink:0; position:relative;
    text-decoration:none; color:var(--al-txt); background:none; border:0; padding:0; width:100%; font:inherit; text-align:left; cursor:pointer; }
  .al-linha .c-ic { position:relative; height:100%; display:grid; place-items:center; color:var(--al-ic); }
  .al-linha .c-ic .pl-ic { width:20px; height:20px; }
  .al-linha .c-tx { grid-column:3; margin-right:10px; height:33px; padding:0 10px 0 12px; border-radius:10px; display:flex; align-items:center; gap:10px;
    font-size:14px; white-space:nowrap; overflow:hidden; transition:background .15s, color .15s; }
  .al-linha .c-tx .pl-ic { width:17px; height:17px; }
  .al-linha:hover .c-tx { background:var(--al-hover); color:var(--al-forte); }
  .al-linha:hover .c-ic { color:var(--al-forte); }
  .al-linha[aria-current="page"] .c-tx { background:var(--al-pill); color:var(--al-pill-txt); font-weight:600; box-shadow:var(--al-sombra); }
  .al-linha[aria-current="page"] .c-ic { color:var(--al-marca); }
  .al-linha[aria-current="page"] .c-ic::after { content:""; position:absolute; right:0; top:9px; bottom:9px; width:3px; border-radius:3px 0 0 3px; background:var(--al-marca); }
  .al-linha .pl-n { margin-left:auto; font-size:11.5px; font-weight:500; color:var(--al-rot); }
  .al-linha .pl-n:empty { display:none; }
  .al-linha .c-tx > span:not([class]) { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; }
  .al-linha .c-tx > .pl-n, .al-linha .c-tx > .al-aviso, .al-linha .c-tx > .al-fixo { margin-left:0; }
  .al-linha .c-tx > .al-aviso + .pl-n { margin-left:-4px; }
  .al-linha .c-tx { position:relative; }
  .al-linha .c-tx > .al-fixo { position:absolute; right:8px; top:50%; margin-top:-12px; }
  .al-linha:hover .al-fixo ~ .al-aviso, .al-linha:hover .al-fixo ~ .pl-n, .al-fixo.on ~ .al-aviso, .al-fixo.on ~ .pl-n { visibility:hidden; }
  .al .pl-item, .al .pl-eu { padding:0; gap:0; border-radius:0; background:none !important; font-weight:inherit; }
  .al .pl-eu { display:grid; }
  .al-grupo { display:grid; grid-template-columns:64px 8px minmax(0,1fr); align-items:end; height:30px; flex-shrink:0; padding-bottom:3px;
    width:100%; border:0; background:none; font:inherit; text-align:left; color:inherit; }
  .al-grupo i { justify-self:center; width:22px; height:1.5px; background:var(--al-linha); margin-bottom:7px; }
  .al-grupo span { grid-column:3; display:flex; align-items:center; gap:6px; padding:0 12px; font-size:10.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--al-rot); white-space:nowrap; }
  .al-topo { height:66px; }
  .al-topo .c-tx { font-weight:600; font-size:15px; color:var(--al-forte); letter-spacing:-.015em; }
  .al-topo:hover .c-tx { background:none; }
  .al-busca .c-tx { color:var(--al-rot); border:1px solid var(--al-linha); background:var(--al-painel); }
  .al-busca kbd { margin-left:auto; font:600 10.5px var(--body,'Geist',sans-serif); color:var(--al-rot); border:1px solid var(--al-linha); border-radius:6px; padding:1px 6px; }
  .al-nav { flex:1; overflow-y:auto; overflow-x:hidden; scrollbar-width:none; padding-bottom:8px; }
  .al-nav::-webkit-scrollbar { display:none; }
  .al-pe { flex-shrink:0; padding:6px 0 10px; border-top:1px solid var(--al-linha); position:relative; }
  .al-pe .pl-av { width:32px; height:32px; font-size:12px; }
  .al-pe .al-eu { height:50px; }
  .al-pe .al-eu .c-tx { height:44px; flex-direction:column; align-items:flex-start; justify-content:center; gap:1px; }
  .al-pe .al-eu [data-plano-selo]:empty { display:none; }
  .al-pe .al-eu b { font-size:13.5px; font-weight:550; color:var(--al-forte); line-height:1.2; }
  .al-pe .pl-menu, .fl .pl-menu { left:72px; bottom:54px; }
  .al.fechado .c-tx, .al.fechado .al-grupo span { display:none; }
  .al.fechado .al-pe .pl-menu { left:58px; }
  .al .al-recolhe .pl-ic { transition:transform .22s; }
  .al.fechado .al-recolhe .c-ic .pl-ic { transform:rotate(180deg); }

  /* 2: fica só nos ícones e abre por cima ao passar o mouse */
  .al.m-hover:not(.fixa) { width:64px; }
  .al.m-hover.aberta:not(.fixa) { width:296px; box-shadow:24px 0 48px -24px rgba(16,32,58,.35); }
  .al.m-hover:not(.fixa):not(.aberta) .c-tx, .al.m-hover:not(.fixa):not(.aberta) .al-grupo span { display:none; }
  /* aberta por cima da página, a coluna fica menos transparente para o texto de trás não atrapalhar */
  [data-cor="vidro"].al.m-hover.aberta:not(.fixa) { --al-trilho:rgba(255,255,255,.78); --al-painel:rgba(255,255,255,.93); }
  [data-cor="noite"].al.m-hover.aberta:not(.fixa) { --al-trilho:rgba(13,26,46,.95); --al-painel:rgba(20,38,62,.95); }
  /* avisos: o número de hoje em laranja, o resto discreto; com a coluna fechada fica só a bolinha no ícone */
  .al-aviso { margin-left:auto; font-style:normal; font-size:11px; font-weight:600; min-width:20px; height:19px; padding:0 6px; border-radius:999px;
    display:inline-grid; place-items:center; background:var(--al-hover); color:var(--al-txt); flex-shrink:0; }
  .al-aviso:empty { display:none; }
  .al-aviso.quente { background:#F6E1CC; color:#94491A; }
  .al-aviso.novas { background:#FBEBDA; color:#A85D24; }
  .al-aviso + .pl-n { margin-left:6px; }
  .al-linha[aria-current="page"] .al-aviso:not(.quente):not(.novas) { background:rgba(26,72,147,.1); color:inherit; }
  .al-ponto { position:absolute; top:8px; right:16px; width:8px; height:8px; border-radius:50%; background:#D0782F; box-shadow:0 0 0 2px rgba(255,255,255,.85); display:none; }
  [data-cor="noite"] .al-ponto { box-shadow:0 0 0 2px rgba(13,26,46,.9); }
  .al.fechado .al-ponto.on, .al.m-hover:not(.fixa):not(.aberta) .al-ponto.on { display:block; }
  .al-kbd { margin-left:auto; font:600 10.5px var(--body,'Geist',sans-serif); color:var(--al-rot); border:1px solid var(--al-linha); border-radius:6px; padding:1px 6px; }
  .al-dica { position:fixed; z-index:420; transform:translateY(-50%); background:#10203A; color:#fff; font:500 12.5px/1 var(--body,'Geist',sans-serif);
    padding:7px 10px; border-radius:8px; pointer-events:none; opacity:0; transition:opacity .12s; white-space:nowrap; box-shadow:0 8px 20px -8px rgba(16,32,58,.5); }
  .al-dica.on { opacity:1; }
  /* tour pela coluna */
  .tr-veu { position:fixed; inset:0; z-index:295; background:rgba(15,29,51,.42); }
  .al.em-tour { z-index:300; }
  .al-linha.tr-alvo .c-tx { background:#fff !important; color:#1A4893 !important; box-shadow:0 0 0 2px #1A4893, 0 10px 24px -10px rgba(26,72,147,.5); }
  .al-linha.tr-alvo .c-ic { color:#1A4893; }
  .tr-cx { position:fixed; z-index:430; width:min(320px, calc(100vw - 24px)); background:#fff; border-radius:16px; padding:16px 18px 14px; border:1px solid #E6DFD3;
    box-shadow:0 30px 60px -20px rgba(16,32,58,.45); font-family:var(--body,'Geist',sans-serif); color:#54606F; }
  .tr-cx small { font-size:11.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#8A929C; }
  .tr-cx b { display:block; font-size:17px; color:#10203A; margin:4px 0 6px; }
  .tr-cx p { font-size:14px; line-height:1.5; margin:0 0 14px; }
  .tr-bts { display:flex; align-items:center; gap:8px; }
  .tr-bts span { flex:1; }
  .tr-bts button { font:500 13.5px var(--body,'Geist',sans-serif); padding:8px 14px; border-radius:999px; border:1px solid #DED7CA; background:#fff; color:#10203A; cursor:pointer; }
  .tr-bts button[data-tr="pular"] { border:0; padding:8px 4px; color:#66717F; }
  .tr-bts button.forte { background:#1A4893; border-color:#1A4893; color:#fff; }
  .al.m-hover .al-fixar .c-tx .pl-ic { transform:rotate(45deg); }
  .al.m-hover.fixa .al-fixar .c-tx .pl-ic { transform:none; color:var(--al-marca); }

  /* 3: seções que abrem e fecham, e atalhos fixados no alto */
  .al-grupo.abre { cursor:pointer; }
  .al-grupo.abre span .pl-ic { width:13px; height:13px; transition:transform .18s; }
  .al-grupo.abre[aria-expanded="false"] span .pl-ic { transform:rotate(-90deg); }
  .al-grupo.abre:hover span { color:var(--al-forte); }
  .al-sec[hidden] { display:none; }
  .al-fixo { width:24px; height:24px; margin-left:auto; border-radius:7px; display:grid; place-items:center; color:var(--al-rot); opacity:0; flex-shrink:0; }
  .al-linha:hover .al-fixo, .al-fixo.on { opacity:1; }
  .al-fixo:hover { background:var(--al-hover); color:var(--al-forte); }
  .al-fixo.on { color:#C98A1B; }
  .al-fixo .pl-ic { width:15px !important; height:15px !important; }
  .al-fixo.on .pl-ic { fill:currentColor; }
  .al-linha .al-fixo + .pl-n { margin-left:6px; }
  .al-vazio { grid-column:3; font-size:12.5px; color:var(--al-rot); padding:2px 12px 8px; line-height:1.4; white-space:normal; }

  /* 4: faixa de ícones com o nome embaixo; menu flutuante ao lado */
  .fl { position:fixed; left:0; top:0; bottom:0; width:76px; z-index:310; display:flex; flex-direction:column; align-items:center; gap:4px; padding:14px 0 10px;
    background:var(--al-trilho); -webkit-backdrop-filter:var(--al-vidro); backdrop-filter:var(--al-vidro); border-right:1px solid var(--al-borda); box-shadow:1px 0 0 var(--al-linha);
    font-family:var(--body,'Geist',system-ui,sans-serif); }
  .fl .r-logo { margin-bottom:10px; }
  .fl-bt { width:64px; padding:8px 0 6px; border-radius:12px; border:0; background:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px;
    color:var(--al-ic); font:500 10.5px/1.2 var(--body,'Geist',sans-serif); text-decoration:none; position:relative; }
  .fl-bt .pl-ic { width:21px; height:21px; }
  .fl-bt:hover, .fl-bt[aria-expanded="true"] { background:var(--al-hover); color:var(--al-forte); }
  .fl-bt[aria-current="page"] { color:var(--al-marca); }
  .fl-bt[aria-current="page"]::after { content:""; position:absolute; right:-6px; top:12px; bottom:12px; width:3px; border-radius:3px 0 0 3px; background:var(--al-marca); }
  .fl .r-pe { margin-top:auto; position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; }
  .fl .pl-eu { padding:4px; }
  .fl-menu { position:fixed; left:84px; z-index:320; min-width:236px; padding:8px; border-radius:16px; display:none;
    background:var(--al-painel); -webkit-backdrop-filter:var(--al-vidro); backdrop-filter:var(--al-vidro); border:1px solid var(--al-borda);
    box-shadow:0 2px 4px rgba(16,32,58,.06), 0 24px 48px -18px rgba(16,32,58,.35); }
  [data-cor="vidro"].fl-menu { background:rgba(255,255,255,.88); }
  .fl-menu.on { display:block; }
  .fl-menu h3 { font:600 11px/1 var(--body,'Geist',sans-serif); letter-spacing:.12em; text-transform:uppercase; color:var(--al-rot); padding:8px 10px 10px; margin:0; }
  .fl-menu .pl-item { color:var(--al-txt); }
  .fl-menu .pl-item:hover { background:var(--al-hover); color:var(--al-forte); }
  .fl-menu .pl-item[aria-current="page"] { background:var(--al-pill); color:var(--al-pill-txt); box-shadow:var(--al-sombra); }

  /* busca rápida (Ctrl+K) */
  .pal-veu { position:fixed; inset:0; z-index:500; background:rgba(15,29,51,.32); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px); display:none; padding:12vh 16px 16px; }
  .pal-veu.on { display:block; }
  .pal { max-width:620px; margin:0 auto; background:#fff; border-radius:18px; border:1px solid #E6DFD3; box-shadow:0 30px 70px -20px rgba(16,32,58,.45); overflow:hidden; font-family:var(--body,'Geist',sans-serif); }
  .pal-cab { display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid #EFEAE1; color:#66717F; }
  .pal-cab input { flex:1; border:0; outline:0; font:400 16px var(--body,'Geist',sans-serif); color:#10203A; background:none; }
  .pal-cab kbd { font:600 11px var(--body,'Geist',sans-serif); border:1px solid #E6DFD3; border-radius:6px; padding:2px 7px; color:#8A929C; }
  .pal-lista { max-height:min(56vh,460px); overflow-y:auto; padding:6px; }
  .pal-lista h4 { font:600 10.5px var(--body,'Geist',sans-serif); letter-spacing:.12em; text-transform:uppercase; color:#8A929C; padding:10px 10px 6px; margin:0; }
  .pal-lista a { display:flex; align-items:center; gap:11px; padding:9px 10px; border-radius:10px; text-decoration:none; color:#10203A; font-size:14px; }
  .pal-lista a small { margin-left:auto; color:#8A929C; font-size:12px; white-space:nowrap; }
  .pal-lista a .pl-ic { color:#66717F; }
  .pal-lista a.on { background:#EAF1F8; color:#1A4893; }
  .pal-lista a.on .pl-ic { color:#1A4893; }
  .pal-nada { padding:18px 12px; color:#66717F; font-size:14px; }
  .pal-pe { display:flex; gap:14px; padding:9px 16px; border-top:1px solid #EFEAE1; font-size:12px; color:#8A929C; }

  @media (max-width:960px) {
    body.m1, body.m2, body.m3, body.m4, body.al-fechado, body.al-fixa { padding-left:0; padding-top:60px; }
    .al, .al.fechado, .al.m-hover:not(.fixa) { width:280px; transform:translateX(-300px); transition:transform .25s cubic-bezier(.2,.8,.2,1); box-shadow:30px 0 60px -30px rgba(16,32,58,.45); }
    .al.on { transform:none; }
    .al .c-tx, .al .al-grupo span { display:flex !important; }
    .al-recolhe, .al-fixar { display:none !important; }
    [data-cor="vidro"].al { --al-trilho:rgba(255,255,255,.80); --al-painel:rgba(255,255,255,.94); }
    .fl { top:auto; right:0; width:auto; height:66px; flex-direction:row; justify-content:space-around; padding:4px 4px calc(4px + env(safe-area-inset-bottom,0px)); border-right:0; border-top:1px solid var(--al-borda); gap:0; }
    body.m4 { padding-top:0; padding-bottom:76px; }
    .fl .r-logo, .fl .r-pe { display:none; }
    .fl-bt { flex:1; width:auto; }
    .fl-bt[aria-current="page"]::after { right:auto; left:30%; width:40%; top:auto; bottom:-2px; height:3px; border-radius:3px 3px 0 0; }
    .fl-menu { left:12px !important; right:12px; bottom:80px; top:auto !important; }
    body.m4 #faixaTeste { bottom:80px !important; }
  }`;

  /* Lugares para a busca rápida: as páginas da coluna, as vagas e as empresas. */
  function buscaRapida() {
    const veu = document.createElement("div"); veu.className = "pal-veu";
    veu.innerHTML = `<div class="pal" role="dialog" aria-label="Buscar no Hub">
      <div class="pal-cab">${ic("busca")}<input id="palBusca" placeholder="Buscar página, vaga ou empresa" autocomplete="off"><kbd>Esc</kbd></div>
      <div class="pal-lista" id="palLista"></div>
      <div class="pal-pe"><span>↑ ↓ para escolher</span><span>Enter para abrir</span></div></div>`;
    document.body.appendChild(veu);
    const inp = veu.querySelector("#palBusca"), lista = veu.querySelector("#palLista");
    const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    let paginas = [], vagas = [], empresas = [], achados = [], sel = 0;
    secoes().forEach(s => s.itens.forEach(([id, n, href, icone]) => paginas.push({ t: n, sub: s.nome, href, ic: ICONE_AL[id] || icone })));
    paginas.push({ t: "Perfil profissional", sub: "Sua conta", href: "perfil-profissional.html", ic: "perfil" }, { t: "Seus dados", sub: "Sua conta", href: "controle.html#dados", ic: "dados" });
    Promise.all([lerVagas(), lerEspecificas(), lerEmpresas()]).then(([g, e, em]) => {
      const nomes = {}; (em.empresas || []).forEach(x => { nomes[x.id] = x.nome; });
      vagas = (g.vagas || []).concat(e.vagas || []).map(v => ({ t: String(v.titulo || "").replace(/^\*/, ""), sub: nomes[v.empresa] || v.empresa, href: "vaga.html?id=" + encodeURIComponent(v.id), ic: "vagas" }));
      empresas = (em.empresas || []).map(x => ({ t: x.nome, sub: "Empresa", href: "vagas.html?empresa=" + encodeURIComponent(x.id), ic: "empresas" }));
      if (veu.classList.contains("on")) pintar();
    }).catch(() => {});
    function pintar() {
      const q = norm(inp.value).trim();
      const casa = x => !q || norm(x.t + " " + x.sub).includes(q);
      const grupos = [["Abertas há pouco", q ? [] : recentes()], ["Páginas", paginas.filter(casa).slice(0, q ? 6 : 8)], ["Empresas", q ? empresas.filter(casa).slice(0, 4) : []], ["Vagas", q ? vagas.filter(casa).slice(0, 6) : []]].filter(g => g[1].length);
      achados = grupos.flatMap(g => g[1]); sel = Math.min(sel, Math.max(0, achados.length - 1));
      let i = 0;
      lista.innerHTML = grupos.length ? grupos.map(([n, xs]) => `<h4>${n}</h4>` + xs.map(x => `<a href="${x.href}" data-i="${i}" class="${i++ === sel ? "on" : ""}">${ic(x.ic)}<span>${esc(x.t)}</span><small>${esc(x.sub || "")}</small></a>`).join("")).join("")
        : `<p class="pal-nada">Nada com "${esc(inp.value)}". Tente outra palavra, como o nome da empresa.</p>`;
    }
    const abrir = () => { veu.classList.add("on"); inp.value = ""; sel = 0; pintar(); setTimeout(() => inp.focus(), 0); };
    const fechar = () => veu.classList.remove("on");
    inp.addEventListener("input", () => { sel = 0; pintar(); });
    inp.addEventListener("keydown", ev => {
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); sel = (sel + (ev.key === "ArrowDown" ? 1 : -1) + achados.length) % Math.max(1, achados.length); pintar(); lista.querySelector("a.on")?.scrollIntoView({ block: "nearest" }); }
      if (ev.key === "Enter" && achados[sel]) location.href = achados[sel].href;
    });
    veu.addEventListener("click", ev => { if (ev.target === veu) fechar(); });
    document.addEventListener("keydown", ev => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); veu.classList.contains("on") ? fechar() : abrir(); }
      if (ev.key === "Escape") fechar();
    });
    document.querySelectorAll("[data-buscar]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); abrir(); }));
  }

  const FIXOS_PADRAO = ["mc-aplicacoes", "v-voce"];
  function fixos() { try { const f = JSON.parse(localStorage.getItem("plat-fixos")); return Array.isArray(f) ? f : FIXOS_PADRAO; } catch (e) { return FIXOS_PADRAO; } }
  function itemPorId(id) { for (const s of SECOES) { const i = s.itens.find(x => x[0] === id); if (i) return i; } return null; }

  /* Melhorias dos modelos 1 e 2 (05/11): avisos na coluna, nome ao lado do
     ícone com a coluna fechada, abrir e fechar com uma pequena espera no 2,
     tecla [ para recolher ou fixar, as páginas abertas há pouco na busca e
     o tour pela coluna para quem acabou de entrar. */
  const diaDeHoje = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  function avisos(el) {
    const pinta = a => {
      const n = (id, v, quente) => {
        const b = el.querySelector(`[data-aviso="${id}"]`), p = el.querySelector(`[data-ponto="${id}"]`);
        if (b) { b.textContent = v || ""; b.classList.toggle("quente", !!quente); }
        if (p) p.classList.toggle("on", !!v && !!quente);
      };
      n("mc-hoje", a.hoje, true); n("mc-agenda", a.agenda, false); n("mc-aplicacoes", a.andando, false);
    };
    const pc = PerfilHub.quanto();
    if (pc !== null) { const b = el.querySelector('[data-aviso="perfil-prof"]'); if (b && pc < 100) { b.textContent = pc + "%"; b.classList.add("novas"); b.title = "O seu perfil está " + pc + "% preenchido"; }
      const p = el.querySelector('[data-ponto="perfil-prof"]'); if (p && pc < 100) p.classList.add("on"); }
    let guardado = {};
    try { guardado = JSON.parse(localStorage.getItem("plat-avisos")) || {}; } catch (e) {}
    if (guardado.dia === diaDeHoje()) pinta(guardado);
    if (typeof Dados !== "undefined" && Dados.abrir) {
      Dados.abrir().then(() => Promise.all([Dados.listar("aplicacoes"), Dados.listar("agenda")])).then(([aps, ag]) => {
        const h = Dados.hoje(), at = ["aplicado", "teste", "prova", "entrevista", "banco"];
        const d7 = new Date(h + "T12:00:00"); d7.setDate(d7.getDate() + 7); const semana = d7.toISOString().slice(0, 10);
        const a = { dia: h,
          hoje: ag.filter(i => i.data === h).length + aps.filter(x => x.proximoEm && x.proximoEm <= h && at.includes(x.estado)).length,
          agenda: ag.filter(i => i.data >= h && i.data <= semana).length,
          andando: aps.filter(x => ["aplicado", "teste", "prova", "entrevista"].includes(x.estado)).length };
        try { localStorage.setItem("plat-avisos", JSON.stringify(a)); } catch (e) {}
        pinta(a);
      }).catch(() => {});
    }
    lerVagas().then(g => {
      const vs = g.vagas || [], ult = vs.reduce((m, v) => (v.data_vista || "") > m ? v.data_vista : m, "");
      const novas = vs.filter(v => (new Date(ult) - new Date(v.data_vista)) / 864e5 <= 7).length;
      if (!novas) return;
      const b = el.querySelector('[data-aviso="v-todas"]'); if (b) { b.textContent = "+" + novas; b.classList.add("novas"); b.title = novas + " vagas novas nesta semana"; }
      const p = el.querySelector('[data-ponto="v-todas"]'); if (p) p.classList.add("on");
    }).catch(() => {});
  }

  /* guarda as páginas visitadas (para o guia saber o que a pessoa já fez)
     e as últimas abertas (para a busca) */
  function lembrarPagina() {
    const pg = location.pathname.split("/").pop() || "index.html";
    try { const v = JSON.parse(localStorage.getItem("plat-visitas")) || []; if (!v.includes(pg)) localStorage.setItem("plat-visitas", JSON.stringify(v.concat(pg))); } catch (e) {}
    window.addEventListener("pagehide", () => {
      const t = String(document.title || "").split(/\s+[·|–—-]\s+/)[0].trim();
      const href = pg + location.search + location.hash;
      if (!t || /^(index|exemplo|entrar)\.html/.test(href)) return;
      let r = []; try { r = JSON.parse(localStorage.getItem("plat-recentes")) || []; } catch (e) {}
      r = [{ t, href }].concat(r.filter(x => x.href !== href)).slice(0, 6);
      try { localStorage.setItem("plat-recentes", JSON.stringify(r)); } catch (e) {}
    });
  }
  function recentes() {
    const aqui = (location.pathname.split("/").pop() || "index.html") + location.search + location.hash;
    try { return (JSON.parse(localStorage.getItem("plat-recentes")) || []).filter(x => x.href !== aqui).slice(0, 4).map(x => ({ t: x.t, sub: "Aberta há pouco", href: x.href, ic: "relogio" })); } catch (e) { return []; }
  }

  /* Tour pela coluna: mostra, um de cada vez, os lugares que mais ajudam quem acabou de chegar. */
  const PASSOS_TOUR = [
    ["v-todas", "Vagas", "As vagas abertas a todos não pedem diploma. As que pedem formação são para quem é da área. Em Para você ficam as duas, de acordo com o seu perfil."],
    ["mc-aplicacoes", "Candidaturas", "Toda vaga em que você se candidatar fica guardada aqui, com a etapa em que está: teste, prova, entrevista."],
    ["mc-hoje", "Hoje", "O seu dia num lugar só: o que está marcado, as horas para lançar e quanto você ganhou."],
    ["cursos", "Cursos", "Aprenda como o trabalho funciona antes do primeiro teste. Comece pelo de Fundamentos."],
    ["curriculo", "Avaliar currículo", "Escolha uma vaga e veja o que ajustar no seu currículo para ela, já escrito em inglês."],
    ["busca", "Buscar no Hub", "Digite um pedaço do nome e vá direto para uma página, uma empresa ou uma vaga. Atalho: Ctrl e K."],
  ];
  function tour(el) {
    let i = 0, alvo = null;
    const estado = { fechado: el.classList.contains("fechado") };
    const veu = document.createElement("div"); veu.className = "tr-veu";
    const cx = document.createElement("div"); cx.className = "tr-cx"; cx.setAttribute("role", "dialog"); cx.setAttribute("aria-live", "polite");
    document.body.append(veu, cx);
    el.classList.remove("fechado"); el.classList.add("aberta", "em-tour"); el.classList.add("on");
    const pega = id => id === "busca" ? el.querySelector(".al-busca") : el.querySelector(`.al-nav .al-linha[data-id="${id}"]`);
    function mostra() {
      if (alvo) alvo.classList.remove("tr-alvo");
      const [id, tit, txt] = PASSOS_TOUR[i];
      alvo = pega(id);
      if (!alvo) { proximo(); return; }
      alvo.scrollIntoView({ block: "nearest" });
      alvo.classList.add("tr-alvo");
      cx.innerHTML = `<small>Passo ${i + 1} de ${PASSOS_TOUR.length}</small><b>${tit}</b><p>${txt}</p>
        <div class="tr-bts"><button data-tr="pular">Pular o tour</button><span></span>${i ? '<button data-tr="voltar">Voltar</button>' : ""}
        <button class="forte" data-tr="seguir">${i === PASSOS_TOUR.length - 1 ? "Terminar" : "Próximo"}</button></div>`;
      requestAnimationFrame(() => {
        const r = alvo.getBoundingClientRect();
        if (innerWidth <= 960) { cx.style.left = "12px"; cx.style.right = "12px"; cx.style.top = "auto"; cx.style.bottom = "16px"; }
        else { cx.style.left = (r.right + 14) + "px"; cx.style.top = Math.min(innerHeight - cx.offsetHeight - 12, Math.max(12, r.top + r.height / 2 - 40)) + "px"; }
        cx.querySelector(".forte").focus();
      });
    }
    function proximo() { if (i < PASSOS_TOUR.length - 1) { i++; mostra(); } else fim(); }
    function fim() {
      if (alvo) alvo.classList.remove("tr-alvo");
      veu.remove(); cx.remove(); el.classList.remove("em-tour", "aberta");
      if (innerWidth <= 960) el.classList.remove("on");
      if (estado.fechado) el.classList.add("fechado");
      try { localStorage.setItem("plat-tour-feito", "1"); } catch (e) {}
      document.dispatchEvent(new CustomEvent("plat:tour-fim"));
    }
    cx.addEventListener("click", ev => { const b = ev.target.closest("[data-tr]"); if (!b) return;
      if (b.dataset.tr === "seguir") proximo(); else if (b.dataset.tr === "voltar") { i--; mostra(); } else fim(); });
    document.addEventListener("keydown", function k(ev) { if (!document.body.contains(cx)) return document.removeEventListener("keydown", k);
      if (ev.key === "Escape") fim(); if (ev.key === "ArrowRight") proximo(); if (ev.key === "ArrowLeft" && i) { i--; mostra(); } });
    veu.addEventListener("click", fim);
    mostra();
  }

  function melhorias(el, ehHover) {
    // o nome de cada item vira dica (e nome para leitor de tela), em vez do title do navegador
    el.querySelectorAll(".al-linha[title]").forEach(a => { a.dataset.tip = a.title; a.setAttribute("aria-label", a.title); a.removeAttribute("title"); });
    if (ehHover) {   // 2: só abre se o mouse ficar um instante, e espera um pouco antes de fechar
      let t;
      const abre = () => { clearTimeout(t); t = setTimeout(() => el.classList.add("aberta"), 140); };
      const fecha = () => { clearTimeout(t); t = setTimeout(() => { if (!el.classList.contains("em-tour") && !el.querySelector(".pl-menu.on") && !el.contains(document.activeElement)) el.classList.remove("aberta"); }, 320); };
      el.addEventListener("mouseenter", abre); el.addEventListener("mouseleave", fecha);
      el.addEventListener("focusin", () => { clearTimeout(t); el.classList.add("aberta"); });
      el.addEventListener("focusout", fecha);
    } else {        // 1 recolhido: o nome aparece ao lado do ícone
      const dica = document.createElement("div"); dica.className = "al-dica"; document.body.appendChild(dica);
      el.addEventListener("mouseover", ev => {
        const a = ev.target.closest(".al-linha");
        if (!a || !el.classList.contains("fechado") || innerWidth <= 960 || !a.dataset.tip) { dica.classList.remove("on"); return; }
        const r = a.getBoundingClientRect();
        dica.textContent = a.dataset.tip; dica.style.top = (r.top + r.height / 2) + "px"; dica.style.left = (r.left + 66) + "px"; dica.classList.add("on");
      });
      el.addEventListener("mouseleave", () => dica.classList.remove("on"));
    }
    document.addEventListener("keydown", ev => {
      if (ev.key !== "[" || ev.ctrlKey || ev.metaKey || ev.altKey || /^(input|textarea|select)$/i.test(ev.target.tagName) || ev.target.isContentEditable) return;
      const b = el.querySelector(".al-recolhe") || el.querySelector(".al-fixar"); if (b) b.click();
    });
    avisos(el);
  }

  function alinhado(m) {
    const css = document.createElement("style"); css.textContent = CSS_AL; document.head.appendChild(css);
    const ehHover = m === 2, comSecoes = m === 3;
    let fechado = false, fixa = false;
    try { fechado = !ehHover && localStorage.getItem("plat-recolhido") === "1" && innerWidth > 960; fixa = ehHover && localStorage.getItem("plat-fixa") === "1"; } catch (e) {}
    const el = document.createElement("aside");
    el.className = "al" + (fechado ? " fechado" : "") + (ehHover ? " m-hover" : "") + (fixa ? " fixa" : "");
    el.dataset.cor = corDaColuna(); el.setAttribute("aria-label", "Menu do Hub");
    document.body.classList.toggle("al-fechado", fechado);
    document.body.classList.toggle("al-fixa", fixa);
    const pins = fixos();
    const linha = ([id, n, href, icone], comEstrela) => { const i = ICONE_AL[id] || icone;
      const estrela = comEstrela ? `<span class="al-fixo${pins.includes(id) ? " on" : ""}" data-fixar="${id}" role="button" title="${pins.includes(id) ? "Tirar dos atalhos" : "Fixar nos atalhos"}">${ic("estrela")}</span>` : "";
      return `<a class="pl-item al-linha" data-id="${id}" href="${href}" title="${n}"><span class="c-ic">${ic(i)}<i class="al-ponto" data-ponto="${id}"></i></span><span class="c-tx">${ic(i)}<span>${n}</span>${estrela}<em class="al-aviso" data-aviso="${id}"></em><b class="pl-n" data-conta="${id}"></b></span></a>`; };
    const daqui = (secaoDe(atual()) || {}).id;
    let abertas = {};
    try { abertas = JSON.parse(localStorage.getItem("plat-secoes") || "{}") || {}; } catch (e) {}
    const lista = secoes();
    const corpo = lista.map(s => {
      if (s.id === "inicio") return linha(["inicio", "Início", "inicio.html", "inicio"]);
      if (!comSecoes) return `<div class="al-grupo"><i></i><span>${s.nome}</span></div>${s.itens.map(x => linha(x)).join("")}`;
      const aberta = s.id === daqui || abertas[s.id] === true;
      return `<button class="al-grupo abre" data-sec="${s.id}" aria-expanded="${aberta}"><i></i><span>${ic("abaixo")}${s.nome}</span></button>
        <div class="al-sec" data-sec-corpo="${s.id}"${aberta ? "" : " hidden"}>${s.itens.map(x => linha(x, true)).join("")}</div>`;
    }).join("");
    const atalhos = comSecoes ? `<div class="al-grupo"><i></i><span>${ic("estrela")}Seus atalhos</span></div><div id="alFixos"></div>` : "";
    el.innerHTML = `
      <a class="al-linha al-topo" href="inicio.html" title="Home Office Hub"><span class="c-ic">${marca(32)}</span><span class="c-tx">Home Office Hub</span></a>
      <a class="al-linha al-busca" href="#" data-buscar title="Buscar no Hub (Ctrl+K)"><span class="c-ic">${ic("busca")}</span><span class="c-tx">${ic("busca")}<span>Buscar no Hub</span><kbd>Ctrl K</kbd></span></a>
      <nav class="al-nav">${atalhos}${corpo}</nav>
      <div class="al-pe">
        ${conta(false).replace('<button class="pl-eu" aria-expanded="false" title="Minha conta">', '<button class="pl-eu al-linha al-eu" aria-expanded="false" title="Minha conta"><span class="c-ic">').replace("</span>\n        \n      </button>", `</span></span><span class="c-tx"><b>${esc(nome())}</b><span data-plano-selo="mini">${Acesso.seloPlano(true)}</span></span></button>`)}
        ${ehHover ? `<button class="al-linha al-fixar" title="Manter o menu aberto"><span class="c-ic">${ic("alfinete")}</span><span class="c-tx">${ic("alfinete")}<span>${fixa ? "Deixar o menu fechar" : "Manter o menu aberto"}</span><kbd class="al-kbd">[</kbd></span></button>`
          : `<button class="al-linha al-recolhe" title="Recolher o menu"><span class="c-ic">${ic("recolher")}</span><span class="c-tx">${ic("recolher")}<span>Recolher o menu</span><kbd class="al-kbd">[</kbd></span></button>`}
      </div>`;
    document.body.prepend(el); gaveta(el); ligarConta(el);
    const recolhe = el.querySelector(".al-recolhe");
    if (recolhe) recolhe.addEventListener("click", () => {
      const f = el.classList.toggle("fechado"); document.body.classList.toggle("al-fechado", f);
      try { localStorage.setItem("plat-recolhido", f ? "1" : "0"); } catch (e) {}
    });
    const fixar = el.querySelector(".al-fixar");
    if (fixar) fixar.addEventListener("click", () => {
      const f = el.classList.toggle("fixa"); document.body.classList.toggle("al-fixa", f);
      fixar.querySelector(".c-tx span").textContent = f ? "Deixar o menu fechar" : "Manter o menu aberto";
      try { localStorage.setItem("plat-fixa", f ? "1" : "0"); } catch (e) {}
    });
    if (comSecoes) {
      const pintaFixos = () => {
        const ps = fixos().map(itemPorId).filter(Boolean);
        el.querySelector("#alFixos").innerHTML = ps.length ? ps.map(x => linha(x)).join("")
          : `<div class="al-linha" style="height:auto;cursor:default"><span></span><span></span><span class="al-vazio">Toque na estrela ao lado de um item para ele ficar aqui.</span></div>`;
        marcarAtual(); contarVagas();
      };
      pintaFixos();
      el.querySelectorAll("[data-sec]").forEach(b => b.addEventListener("click", () => {
        const aberta = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", aberta);
        el.querySelector(`[data-sec-corpo="${b.dataset.sec}"]`).hidden = !aberta;
        abertas[b.dataset.sec] = aberta;
        try { localStorage.setItem("plat-secoes", JSON.stringify(abertas)); } catch (e) {}
      }));
      el.addEventListener("click", ev => {
        const st = ev.target.closest("[data-fixar]"); if (!st) return;
        ev.preventDefault(); ev.stopPropagation();
        let f = fixos(); const id = st.dataset.fixar;
        f = f.includes(id) ? f.filter(x => x !== id) : f.concat(id);
        try { localStorage.setItem("plat-fixos", JSON.stringify(f)); } catch (e) {}
        el.querySelectorAll(`[data-fixar="${id}"]`).forEach(x => { x.classList.toggle("on", f.includes(id)); x.title = f.includes(id) ? "Tirar dos atalhos" : "Fixar nos atalhos"; });
        pintaFixos();
      });
    }
    melhorias(el, ehHover);
    buscaRapida();
  }

  /* 4: faixa de ícones com o nome embaixo; cada seção abre um menu ao lado do ícone */
  function flutuante() {
    const css = document.createElement("style"); css.textContent = CSS_AL; document.head.appendChild(css);
    const cor = corDaColuna(), lista = secoes();
    const fl = document.createElement("aside"); fl.className = "fl"; fl.dataset.cor = cor; fl.setAttribute("aria-label", "Seções do Hub");
    fl.innerHTML = `<a class="r-logo" href="inicio.html" title="Home Office Hub">${marca(34)}</a>
      <button class="fl-bt" data-buscar title="Buscar no Hub (Ctrl+K)">${ic("busca")}<span>Buscar</span></button>
      ${lista.map(s => s.itens.length === 1
        ? `<a class="fl-bt" href="${s.itens[0][2]}" data-sec-link="${s.id}">${ic(s.ic)}<span>${s.curto || s.nome}</span></a>`
        : `<button class="fl-bt" data-sec-link="${s.id}" data-abre="${s.id}" aria-expanded="false">${ic(s.ic)}<span>${s.curto || s.nome}</span></button>`).join("")}
      <div class="r-pe">${conta(false)}</div>`;
    const menu = document.createElement("div"); menu.className = "fl-menu"; menu.dataset.cor = cor;
    document.body.prepend(menu); document.body.prepend(fl); ligarConta(fl);
    let aberto = null;
    const fechar = () => { menu.classList.remove("on"); fl.querySelectorAll("[data-abre]").forEach(b => b.setAttribute("aria-expanded", "false")); aberto = null; };
    fl.querySelectorAll("[data-abre]").forEach(b => b.addEventListener("click", ev => {
      ev.stopPropagation();
      if (aberto === b.dataset.abre) return fechar();
      const s = lista.find(x => x.id === b.dataset.abre);
      menu.innerHTML = `<h3>${s.nome}</h3>` + s.itens.map(x => item([x[0], x[1], x[2], ICONE_AL[x[0]] || x[3]])).join("");
      const r = b.getBoundingClientRect();
      menu.style.top = Math.max(8, Math.min(r.top - 8, innerHeight - 60 - s.itens.length * 40)) + "px";
      menu.classList.add("on"); aberto = s.id;
      fl.querySelectorAll("[data-abre]").forEach(x => x.setAttribute("aria-expanded", x === b));
      marcarAtual(); contarVagas();
    }));
    document.addEventListener("click", ev => { if (!menu.contains(ev.target)) fechar(); });
    document.addEventListener("keydown", ev => { if (ev.key === "Escape") fechar(); });
    buscaRapida();
  }

  function montar(m) {
    const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);
    document.body.classList.add("plat", "m" + m);
    alinhado(m); lembrarPagina();
    if (typeof TourHub !== "undefined") TourHub.retomar();
    marcarAtual(); contarVagas();
    window.addEventListener("hashchange", marcarAtual);
  }

  /* o seletor de modelo, na faixa de teste do pé da página */
  function seletor() {
    const f = document.getElementById("faixaTeste");
    if (!f) return;
    const cor = corDaColuna();
    f.querySelectorAll("[data-cor]").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.cor === cor);
      b.addEventListener("click", () => { try { localStorage.setItem("plat-cor", b.dataset.cor); } catch (e) {} location.reload(); });
    });
    let conta = "nova"; try { const c = localStorage.getItem("plat-conta"); conta = c === "trabalhando" || c === "marina" ? "trabalhando" : c === "procurando" ? c : "nova"; } catch (e) {}
    f.querySelectorAll("[data-conta-teste]").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.contaTeste === conta);
      b.addEventListener("click", () => {
        try { ["plat-exemplo-pronto", "plat-visitas", "plat-recentes", "plat-avisos", "plat-guia-oculto", "plat-tour-feito"].forEach(k => localStorage.removeItem(k));
          localStorage.setItem("plat-conta", b.dataset.contaTeste); } catch (e) {}
        location.href = "index.html";
      });
    });
    const m = modelo();
    f.querySelectorAll("[data-modelo]").forEach(b => {
      b.setAttribute("aria-pressed", +b.dataset.modelo === m);
      b.title = MODELOS[b.dataset.modelo];
      b.addEventListener("click", () => { try { localStorage.setItem("plat-modelo", b.dataset.modelo); } catch (e) {} location.reload(); });
    });
    const n = f.querySelector("[data-modelo-nome]"); if (n) n.textContent = MODELOS[m];
  }
  if (document.readyState === "complete") setTimeout(seletor, 0); else window.addEventListener("load", seletor);

  return { montar, modelo };
})();

/* Modelos 1 a 4: o site inteiro é a plataforma. Modelo 5: o site fica com o menu
   do topo e a coluna aparece só nas páginas da Área do aluno. */
const PAGINAS_DO_ALUNO = /^(inicio|controle|cursos|curso-[a-z]+|ferramenta-curriculo|estudo-diretriz|transcricao|perfil-profissional|perfil)\.html$/;
function montarLayout(ativa) {
  const pg = location.pathname.split("/").pop() || "index.html";
  const m = Plataforma.modelo();
  const dentro = Acesso.logado() && Acesso.perfilFeito() && !(pg === "perfil-profissional.html" && /primeira=1/.test(location.search))
    && !/^(entrar|privacidade|404)\.html$/.test(pg);
  if (dentro && (m !== 5 || PAGINAS_DO_ALUNO.test(pg))) return Plataforma.montar(m);
  montarLayoutTopo(ativa === "ferramentas" || ativa === "cursos" ? "aluno" : ativa);
  if (m === 5) {   // a aba da Área do aluno se destaca um pouco das outras
    const s = document.createElement("style");
    s.textContent = 'nav.tabs a[href="inicio.html"]{color:var(--signal);background:var(--signal-suave);font-weight:550}nav.tabs a[href="inicio.html"]:hover{background:#DDE9F5}';
    document.head.appendChild(s);
  }
}

/* ══════════════════════════════════════════════════════════════
   TOUR DE BOAS-VINDAS (só na cópia de teste; colado depois da plataforma)
   Começa com uma janela de boas-vindas e passa por cada parte do Hub,
   abrindo as páginas: vagas, empresas, as telas do Meu Controle,
   cursos, ferramentas, o perfil e a busca. A parte da tela de que se
   está falando fica acesa e o resto escurece. Dá para voltar, pular e
   continuar depois: o passo fica guardado em localStorage plat-tour.
   ══════════════════════════════════════════════════════════════ */
const TourHub = (function () {
  /* um formulário de exemplo, já preenchido, com a explicação de cada campo
     (o formulário de verdade abre numa janela por cima de tudo, então o tour desenha um igual) */
  const form = (titulo, linhas, dica) => `<div class="tr-form"><div class="tr-form-cab">${titulo}<span>exemplo preenchido</span></div>
    ${linhas.map(([rot, val, exp]) => `<div class="tr-campo"><label>${rot}</label><div class="tr-val">${val}</div><small>${exp}</small></div>`).join("")}</div>${dica ? `<p class="tr-pos">${dica}</p>` : ""}`;
  const P = [
    { pg: "vagas.html?ver=voce", cap: "Vagas", alvo: "col:v-voce", tit: "Para você", txt: "Aqui ficam juntas as vagas abertas a todos e as da sua área de formação. Quando você coloca a sua área no perfil, as dela aparecem aqui também." },
    { pg: "vagas.html?ver=todas", cap: "Vagas", alvo: "col:v-todas", tit: "Abertas a todos", txt: "Não pedem diploma: anotação de dados, avaliação de IA, tradução e QA. É por aqui que a maioria das pessoas começa. O número em laranja mostra as vagas novas da semana." },
    { pg: "vagas.html?areas=1", cap: "Vagas", alvo: "col:v-form", tit: "Pedem formação", txt: "O mesmo tipo de trabalho, para quem é formado numa área, como Direito, Saúde ou Programação. Costumam pagar mais." },
    { cap: "Vagas", pg: "vagas.html?ver=todas", alvo: "#abas", tit: "A página de vagas", txt: "As listas também ficam aqui no alto. A aba Para você aparece aqui quando você marca uma área no perfil. Ao lado, os filtros separam por área, idioma e empresa." },
    { cap: "Vagas", pg: "vagas.html?ver=todas", alvo: [".grupo-titulo:has(.ch-pulso)", "#resultado"], tit: "Em alta", txt: "Vagas que estão chamando gente agora, confirmadas pela equipe do Hub. Vale começar por elas." },
    { cap: "Vagas", pg: "vagas.html?ver=todas", alvo: ["#resultado .vaga", "#resultado"], tit: "Cada vaga", txt: "Clique numa vaga para abrir a página dela. Vamos abrir uma para você ver por dentro." },
    { cap: "Vagas", pg: "vaga.html?id={vaga}", alvo: [".cabeca", "#conteudo"], tit: "A página da vaga", txt: "Tudo em português: o que é a vaga, a empresa, quanto paga, as horas e o idioma. Logo abaixo vêm o que você vai fazer e os requisitos." },
    { cap: "Vagas", pg: "vaga.html?id={vaga}", alvo: [".aplic:has(a[href*='ferramenta-curriculo'])"], tit: "Avaliar o currículo para esta vaga", txt: "Antes de se candidatar, vale conferir o currículo. Este atalho abre a ferramenta já com esta vaga escolhida." },
    { cap: "Vagas", pg: "vaga.html?id={vaga}", alvo: [".barra", ".candidatar"], tit: "Candidatar-se", txt: "Este botão abre a página oficial da vaga, onde você se candidata. Quando voltar para o Hub, aparece esta pergunta:",
      extra: `<div class="tr-mock"><b>Conseguiu se candidatar?</b><span>Guarde a candidatura no Meu Controle.</span><i class="forte">Sim, guardar no Meu Controle</i><i>Agora não</i></div><p class="tr-pos">Um clique e ela fica guardada, na etapa Currículo enviado.</p>` },
    { cap: "Vagas", pg: "vaga.html?id={vaga}", alvo: ["#jaApliquei:not([hidden])", "#jaApliquei"], tit: "Guardar aqui mesmo", txt: "Se preferir, guarde a candidatura direto na vaga, em Marcar como candidatura enviada. Depois você acompanha cada etapa em Meu Controle › Candidaturas." },
    { cap: "Empresas", pg: "empresas.html", alvo: "col:empresas", tit: "Empresas", txt: "As empresas ficam aqui na coluna, junto das vagas." },
    { cap: "Empresas", pg: "empresas.html", alvo: ["#fichas", "main"], tit: "Empresas · a lista", txt: "Todas as empresas com que o Hub trabalha: o que cada uma faz, como paga e que tipo de vaga abre. Clique numa para ver o perfil e as vagas abertas dela." },
    { cap: "Meu Controle", pg: "controle.html#hoje", alvo: "col:mc-hoje", tit: "Meu Controle", txt: "O Meu Controle é onde você organiza o seu trabalho. Cada parte dele fica aqui na coluna. A primeira é o Hoje." },
    { cap: "Meu Controle", pg: "controle.html#hoje", alvo: ["#hoje .h-grade", "#hoje"], tit: "Hoje · o seu dia", txt: "Tudo do seu dia numa tela: as horas para lançar hoje, o que está na agenda hoje e amanhã, e o câmbio do dia, do dólar e do euro, com quanto o seu mês vale em reais." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", alvo: "col:mc-aplicacoes", tit: "Candidaturas", txt: "Toda vaga em que você se candidatou fica aqui, com a etapa em que está: currículo enviado, teste, prova, entrevista, aprovado." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", alvo: ["#aplicacoes [data-nova-ap]", "#aplicacoes button.ct-b.forte", "#aplicacoes .ct-cab-tela"], tit: "Nova candidatura · o botão", txt: "Para guardar uma candidatura, clique em <strong>Nova candidatura</strong>. Vamos abrir para ver como preencher." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["#ui-painel .u-cab"], tit: "Nova candidatura", txt: "Esta é a janela de verdade. Preenchemos com um exemplo para você ver cada campo; nada vai ser salvo." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["campo:titulo"], tit: "Empresa e título da vaga", txt: "Escreva a empresa e copie o nome da vaga exatamente como está no anúncio. Se você chegou pelo botão da vaga no Hub, isso já vem preenchido." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["campo:url"], tit: "Link do anúncio", txt: "Cole o endereço da vaga. Quando a empresa responder, semanas depois, você volta ao anúncio com um clique." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["campo:estado"], tit: "Em que etapa está", txt: "Começa em Currículo enviado. Quando a empresa chamar para teste, prova ou entrevista, você muda aqui." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["campo:email"], tit: "E-mail que você usou", txt: "A empresa vai pedir para entrar com ele. Se você usa mais de um e-mail, este campo salva muita dor de cabeça." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["#ui-painel #pcPdf", "campo:curriculo"], tit: "O currículo que você mandou", txt: "Dê um nome curto ao currículo e anexe o PDF que foi para a empresa. Assim você sabe qual versão mandou para cada vaga." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["campo:proximo"], tit: "Próximo passo e quando", txt: "Escreva o que você precisa fazer agora nesta vaga e até quando. Por exemplo: fazer o teste de qualificação, até 12/11." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["campo:observacoes"], tit: "Observações", txt: "O que for importante: o nome de quem falou com você, o que pediram, o que você respondeu." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candidatura", alvo: ["#ui-painel [data-ok]"], tit: "Registrar", txt: "Depois é só clicar em Registrar. Agora vamos ver como fica uma candidatura salva: abrimos uma de exemplo, só para o tour." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candSalva", alvo: ["#ui-painel .cv-abas"], tit: "Uma candidatura salva", txt: "Toda candidatura que você salva abre assim, com duas abas: A vaga, para acompanhar, e Editar, com os campos que você preencheu." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candSalva", alvo: ["#ui-painel .cv-trilho", "#ui-painel .u-corpo"], tit: "A caminhada da vaga", txt: "Cada etapa da vaga, da candidatura até a aprovação. Quando a empresa chamar para a próxima, clique nela: a data fica guardada embaixo. Se a vaga não tiver alguma etapa, é só pular." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candAjustar", alvo: ["#ui-painel .cv-trilho", "#ui-painel .u-corpo"], tit: "Ajustar etapas", txt: "Cada vaga tem o seu caminho. Em Ajustar etapas você arrasta o teste, a prova e a entrevista para a ordem certa, ou tira no × a etapa que esta vaga não tem. Depois é só clicar em Pronto." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candSalva", alvo: ["#ui-painel .cv-desfechos"], tit: "Quando não der certo", txt: "Embaixo da caminhada ficam os outros finais: Recusado, Sem resposta, Desisti e Banco de talentos. Um clique e a candidatura sai das que estão andando. Em Recusado, você conta em que etapa foi e o motivo, para aprender com cada uma." },
    { cap: "Meu Controle", pg: "controle.html#aplicacoes", antes: "candEditar", alvo: ['#ui-painel .cv-aba[data-aba="editar"]', "#ui-painel .u-corpo"], tit: "A aba Editar", txt: "Aqui ficam os mesmos campos da candidatura, para corrigir ou completar quando quiser: o link, o e-mail, o currículo, as observações." },
    { cap: "Meu Controle", pg: "controle.html#trabalhos", antes: "limparExemplo", alvo: "col:mc-trabalhos", tit: "Trabalhos", txt: "Quando você passa num projeto, ele vira um trabalho aqui. Cada trabalho tem a sua página, onde você lança as horas de cada dia." },
    { cap: "Meu Controle", pg: "controle.html#trabalhos", alvo: ["#trabalhos [data-novo-tr]", "#trabalhos button.ct-b.forte", "#trabalhos .ct-cab-tela"], antes: "limparExemplo", tit: "Novo trabalho · o botão", txt: "Para cadastrar um trabalho, clique em <strong>Novo trabalho</strong>. Vamos abrir." },
    { cap: "Meu Controle", pg: "controle.html#trabalhos", antes: "trabalho", alvo: ["campo:projeto"], tit: "Novo trabalho · empresa e projeto", txt: "A empresa que paga você e o nome do projeto lá dentro. O exemplo está preenchido; nada vai ser salvo." },
    { cap: "Meu Controle", pg: "controle.html#trabalhos", antes: "trabalho", alvo: ["campo:pagamento"], tit: "Como paga", txt: "Escolha na lista: por hora ou por tarefa. Isso muda o que você lança a cada dia." },
    { cap: "Meu Controle", pg: "controle.html#trabalhos", antes: "trabalho", alvo: ["campo:valor"], tit: "Valor e moeda", txt: "O valor do contrato e a moeda em que a empresa paga. O Hub converte para reais pelo dólar do dia." },
    { cap: "Meu Controle", pg: "controle.html#trabalhos", antes: "trabalho", alvo: ["campo:ciclo"], tit: "Quando paga", txt: "Toda semana, a cada duas semanas ou todo mês. Com isso o Hub sabe quando o período fecha e quanto você vai receber." },
    { cap: "Meu Controle", pg: "controle.html#trabalho", antes: "trabalhoExemplo", alvo: ["filhos:#tFixos:2", ".t-cab"], tit: "Dentro do trabalho", txt: "Cada trabalho cadastrado tem a sua página. Este é um trabalho de exemplo, só para o tour: em cima, o dia de hoje e o período, com as horas e quanto já deu." },
    { cap: "Meu Controle", pg: "controle.html#trabalho", antes: "trabalhoExemplo", alvo: ["[data-dia]", ".t-cab-bts"], tit: "Registrar o dia · o botão", txt: "Para lançar um dia de trabalho, clique em <strong>Registrar o dia</strong>. Vamos abrir." },
    { cap: "Meu Controle", pg: "controle.html#trabalho", antes: "dia", alvo: ["campo:horas"], tit: "Registrar o dia · as horas", txt: "Quantas horas você trabalhou. Se o trabalho paga por tarefa, aqui entra o número de tarefas." },
    { cap: "Meu Controle", pg: "controle.html#trabalho", antes: "dia", alvo: ["campo:observacoes"], tit: "Registrar o dia · o que você fez", txt: "Uma anotação do dia: o que fez, uma dúvida, um aviso da equipe. Fica guardada naquele dia, para você achar depois." },
    { cap: "Meu Controle", pg: "controle.html#trabalho", antes: "trabalhoExemplo", alvo: ["#tFixos > :nth-child(n+3)", "#tFixos"], tit: "O resumo do trabalho", txt: "Mais embaixo ficam os dias que você lançou neste período e todos os períodos anteriores, com as horas e o valor de cada um." },
    { cap: "Meu Controle", pg: "controle.html#trabalho", antes: "trabalhoExemplo", alvo: ["#tFixos .pp-cel", "#tFixos"], tit: "Pago pela empresa", txt: "Quando o dinheiro cair, informe quanto a empresa pagou de verdade. Vamos ver isso no Imposto, com um valor de exemplo." },
    { cap: "Meu Controle", pg: "controle.html#trabalho", antes: "trabalhoExemplo", alvo: ["[data-modo]", "#grade"], tit: "A sua página do trabalho", txt: "Em Editar página você acrescenta blocos: anotações, links importantes, os e-mails da equipe do projeto, o que precisar guardar deste trabalho." },
    { cap: "Meu Controle", pg: "controle.html#painel", antes: "garantirExemplo", alvo: "col:mc-painel", tit: "Ganhos", txt: "Os seus ganhos ficam aqui: o Hub soma o que você lança em cada trabalho." },
    { cap: "Meu Controle", pg: "controle.html#painel", antes: "garantirExemplo", alvo: ["#painel .ct-cartao", "#painel"], tit: "Ganhos · o mês", txt: "Soma o que você lança nos trabalhos e mostra quanto ganhou por mês, em dólar e em reais. Aqui aparecem as horas do trabalho de exemplo." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "garantirExemplo", alvo: "col:mc-imposto", tit: "Imposto", txt: "Aqui fica a estimativa do imposto de cada mês." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "garantirExemplo", alvo: ["#imposto .ip-mes ~ div", "#imposto .ct-cab-tela"], tit: "Imposto · a estimativa", txt: "Uma estimativa de quanto pagar por mês, como pessoa física (carnê-leão) ou como MEI, a partir do que você recebeu." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "garantirExemplo", alvo: ["#imposto .ip-pago", "#imposto"], tit: "O valor que caiu na conta", txt: "Para cada período de trabalho, dá para informar quanto a empresa pagou de verdade. Vamos abrir com um valor de exemplo." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "pagoImposto", alvo: ["campos:valor,moeda", "campo:valor", "#ui-painel .u-corpo", "#imposto .ip-pago"], tit: "Valor que a empresa pagou", txt: "O valor que chegou de verdade, já com as taxas, e a moeda. Pode ser em reais, como caiu na sua conta." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "pagoImposto", alvo: ["campo:data", "#ui-painel .u-corpo", "#imposto .ip-pago"], tit: "Dia em que o dinheiro caiu", txt: "O imposto usa este valor no mês em que o dinheiro entrou, e não a conta das horas. Na observação, anote por onde veio, como Payoneer ou Wise." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "garantirExemplo", alvo: ["#imposto [data-nova-renda]", "#imposto"], tit: "Outras rendas", txt: "O imposto não conta só o que vem dos projetos. Se você recebe de outra fonte de renda, clique em <strong>Adicionar outra renda</strong> e ela entra na conta do mês. Vamos abrir." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "outraRenda", alvo: ["campos:origem,valor,moeda", "campo:origem", "#ui-painel .u-corpo"], tit: "Outra renda · de onde veio e quanto", txt: "Escreva de onde veio o dinheiro, quanto entrou e em que moeda." },
    { cap: "Meu Controle", pg: "controle.html#imposto", antes: "outraRenda", alvo: ["campo:tipo", "#ui-painel .u-corpo"], tit: "Outra renda · quem pagou", txt: "Isso muda a conta: o que vem do exterior ou de outra pessoa entra no carnê-leão. Salário e pagamento de empresa no Brasil já vêm com o imposto descontado." },
    { cap: "Meu Controle", pg: "controle.html#agenda", antes: "agendaExemplo", alvo: "col:mc-agenda", tit: "Agenda", txt: "A Agenda fica aqui: o calendário do seu trabalho." },
    { cap: "Meu Controle", pg: "controle.html#agenda", antes: "agendaExemplo", alvo: ["#agenda .ag-mes", "#agenda .ct-cab-tela"], tit: "Agenda · o mês", txt: "Entrevistas, testes, prazos, estudo e as horas que você vai trabalhar, no calendário do mês." },
    { cap: "Meu Controle", pg: "controle.html#agenda", alvo: ["#agenda [data-marcar]"], tit: "Marcar · o botão", txt: "Para marcar alguma coisa, clique em <strong>Marcar</strong>. Também dá para clicar direto num dia do calendário e marcar por ali. Vamos abrir pelo botão." },
    { cap: "Meu Controle", pg: "controle.html#agenda", antes: "marcar", alvo: ["campo:tipo", "#ui-painel .u-corpo"], tit: "Marcar · o que é", txt: "Escolha o tipo: entrevista, teste, prazo, estudo, horas de trabalho ou Outro, para qualquer compromisso. No título você escreve como quiser, por exemplo: reunião com a equipe do projeto." },
    { cap: "Meu Controle", pg: "controle.html#agenda", antes: "marcar", alvo: ["campos:data,inicio", "campo:data", "#ui-painel .u-corpo"], tit: "Marcar · dia e horário", txt: "O dia e, se quiser, o horário. O que estiver marcado aparece no Início, em Para fazer, no dia certo." },
    { cap: "Meu Controle", pg: "controle.html#agenda", antes: "marcar", alvo: ["campo:aplicacaoId", "#ui-painel [data-cand]", "#ui-painel .u-corpo"], tit: "Marcar · de qual vaga é", txt: "Este campo é opcional. Se o compromisso é de uma vaga em que você se candidatou, como uma entrevista, escolha a vaga aqui. Assim, na agenda e no Início, você sabe de qual vaga é." },
    { cap: "Meu Controle", pg: "controle.html#agenda", antes: "marcar", alvo: ["campo:nota"], tit: "Marcar · anotação", txt: "O que você precisa ter à mão nesse dia: o link da chamada, o nome de quem vai falar com você, o que levar pronto." },
    { cap: "Aprender", pg: "cursos.html", alvo: "col:cursos", tit: "Cursos", txt: "Os cursos ficam aqui, em Aprender." },
    { cap: "Aprender", pg: "cursos.html", alvo: ["#livro", "main"], tit: "Cursos · as trilhas", txt: "Aprenda o trabalho antes da primeira vaga: sete cursos em duas trilhas. Comece pelo de Fundamentos." },
    { cap: "Aprender", pg: "como-funciona.html", alvo: "col:guia", tit: "Como funciona", txt: "O guia do trabalho fica aqui, também em Aprender." },
    { cap: "Aprender", pg: "como-funciona.html", alvo: ["#areas", ".bloco", "main"], tit: "Como funciona · o que tem aqui", txt: "Um guia do trabalho, por partes: os tipos de projeto que você vai encontrar, como é a entrada etapa por etapa, o currículo que passa, como o dinheiro chega ao Brasil, imposto e perguntas frequentes." },
    { cap: "Aprender", pg: "como-funciona.html", alvo: ["#golpe", "main"], tit: "Como reconhecer golpe", txt: "As vagas do Hub são de empresas conferidas. Se você achar uma vaga fora daqui, num grupo, numa rede social ou por mensagem, fique atento a estes sinais: pedir dinheiro para começar, contratar só pelo WhatsApp, prometer muito por pouco trabalho." },
    { pg: "ferramenta-curriculo.html?vaga={vaga}", cap: "Ferramentas", alvo: "col:curriculo", tit: "Avaliar currículo", txt: "As ferramentas ficam aqui na coluna. A primeira avalia o seu currículo para uma vaga e mostra o que ajustar, já em inglês." },
    { cap: "Ferramentas", pg: "ferramenta-curriculo.html?vaga={vaga}", alvo: ["#vaga"], tit: "Avaliar currículo · a vaga", txt: "Quando você chega pelo atalho da vaga, ela já vem escolhida. Dá para trocar por outra ou colar o anúncio de uma vaga de fora do Hub." },
    { cap: "Ferramentas", pg: "ferramenta-curriculo.html?vaga={vaga}", alvo: ["#arq"], tit: "Avaliar currículo · o seu currículo", txt: "Mande o PDF do currículo. Ele é lido só para esta avaliação. Para conhecer, dá para usar o currículo de exemplo." },
    { cap: "Ferramentas", pg: "ferramenta-curriculo.html?vaga={vaga}", alvo: ["#perfilCx"], tit: "Avaliar currículo · o seu perfil", txt: "A ferramenta usa também o seu perfil profissional, para lembrar o que você já fez e não está no currículo. Ela nunca inventa nada sobre você." },
    { cap: "Ferramentas", pg: "ferramenta-curriculo.html?vaga={vaga}", alvo: ["#avaliar"], tit: "Avaliar currículo · o resultado", txt: "Aqui sai a nota do currículo para a vaga, o que ajustar em cada parte e o texto pronto em inglês, para copiar." },
    { cap: "Ferramentas", pg: "estudo-diretriz.html", alvo: "col:estudo", tit: "Estudar uma diretriz", txt: "A segunda ferramenta: o professor da diretriz do seu projeto." },
    { cap: "Ferramentas", pg: "estudo-diretriz.html", alvo: ["#solta button", "#solta"], tit: "Estudar uma diretriz · subir o PDF", txt: "Quando passar para um projeto, arraste o PDF da diretriz dele para cá ou clique em <strong>Escolher a diretriz</strong>. A ferramenta divide em partes e vira o seu professor: ensina uma de cada vez e pergunta para ver se você entendeu." },
    { cap: "Ferramentas", pg: "estudo-diretriz.html", alvo: ["#exemplo", "#app"], tit: "Estudar uma diretriz · o exemplo", txt: "Para conhecer antes de ter um projeto, abra a diretriz de exemplo. No fim, a ferramenta monta um guia em PDF com o que você estudou." },
    { cap: "Ferramentas", pg: "transcricao.html", alvo: "col:transcricao", tit: "Transcrição ao vivo", txt: "A terceira ferramenta: o texto do que está sendo falado, na hora." },
    { cap: "Ferramentas", pg: "transcricao.html", alvo: ["#fonte", "#acionar"], tit: "Transcrição ao vivo · o que ouvir", txt: "Para acompanhar por escrito qualquer áudio enquanto ele toca, no computador ou no microfone: uma reunião, uma aula, um vídeo, o que você precisar entender." },
    { cap: "Ferramentas", pg: "transcricao.html", alvo: ["#saida", "#idioma"], tit: "Transcrição ao vivo · o idioma", txt: "Diga o idioma do áudio. Em Mostrar, o texto pode aparecer no idioma original ou já traduzido para o português." },
    { cap: "Ferramentas", pg: "transcricao.html", alvo: ["#acionar"], tit: "Transcrição ao vivo · começar", txt: "Clique e o texto vai aparecendo enquanto a pessoa fala." },
    { cap: "Ferramentas", pg: "transcricao.html", alvo: ["#bFlutuar"], tit: "Transcrição ao vivo · janela flutuante", txt: "Deixa a transcrição numa janelinha por cima do que estiver aberto, como uma legenda." },
    { cap: "Ferramentas", pg: "transcricao.html", alvo: ["#bBaixar"], tit: "Transcrição ao vivo · baixar o texto", txt: "Guarda a transcrição inteira num arquivo .txt. Depois você cola o texto numa IA de conversa e pede um resumo, os pontos principais ou o que ficou para você fazer." },
    { pg: "perfil-profissional.html", cap: "Você", alvo: "col:perfil-prof", tit: "Meu perfil", txt: "O seu perfil profissional fica aqui, com quanto ele está preenchido. Vamos abrir." },
    { cap: "Você", pg: "perfil-profissional.html", alvo: ["#sec-idiomas", "main"], tit: "Meu perfil · idiomas", txt: "Os idiomas que você fala e o nível de cada um." },
    { cap: "Você", pg: "perfil-profissional.html", alvo: ["#sec-areas", "main"], tit: "Meu perfil · áreas", txt: "As áreas em que você tem formação ou experiência. São elas que trazem para você as vagas que pedem formação." },
    { cap: "Você", pg: "perfil-profissional.html", alvo: ["#sec-exp", "main"], tit: "Meu perfil · experiências", txt: "Os trabalhos que você já fez. Os que estão no Meu Controle entram aqui com um clique, no botão Trazer do Meu Controle. A ferramenta de currículo usa isso para lembrar o que falta no seu currículo." },
    { cap: "Você", pg: "perfil-profissional.html", alvo: ["#sec-ferr", "main"], tit: "Vá completando com o tempo", txt: "Um curso novo, um idioma, um trabalho: volte aqui e acrescente. Quanto mais completo o perfil, melhores as vagas para você e as sugestões para o currículo." },
    { cap: "Você", alvo: "busca", tit: "Buscar no Hub", txt: "Digite um pedaço do nome e vá direto para uma página, uma empresa ou uma vaga. Atalho: Ctrl e K." },
  ];
  const CAPS = ["Vagas", "Empresas", "Meu Controle", "Aprender", "Ferramentas", "Você"];
  const ROTEIRO = {
    "Vagas": ["as três listas, uma vaga por dentro e como guardar a candidatura", '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7M3 13h18"/>'],
    "Empresas": ["quem contrata, o que faz e como paga", '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>'],
    "Meu Controle": ["candidaturas, trabalhos, ganhos, agenda e imposto", '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>'],
    "Aprender": ["os cursos e como o trabalho funciona", '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5M8.5 7.5h7"/>'],
    "Ferramentas": ["currículo, diretriz e transcrição, por dentro", '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.7 1.7 0 0 0 2.4 2.4l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-.4-.4-2.2z"/>'],
    "Você": ["o seu perfil e a busca", '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
  };
  const CSS = `
  body.tour-ativo #faixaTeste { display:none !important; }
  .tr-bloq { position:fixed; inset:0; z-index:415; }
  .tr-foco { position:fixed; z-index:420; border-radius:14px; pointer-events:none; box-shadow:0 0 0 2px #1A4893, 0 0 0 9999px rgba(15,29,51,.5);
    transition:top .3s cubic-bezier(.2,.8,.2,1), left .3s cubic-bezier(.2,.8,.2,1), width .3s cubic-bezier(.2,.8,.2,1), height .3s cubic-bezier(.2,.8,.2,1); }
  .tr-cx, .tr-boas { position:fixed; z-index:430; background:#fff; border-radius:18px; border:1px solid #E6DFD3; font-family:var(--body,'Geist',sans-serif); color:#54606F;
    box-shadow:0 30px 60px -20px rgba(16,32,58,.5); }
  .tr-cx { width:min(320px, calc(100vw - 24px)); padding:16px 18px 14px; transition:top .3s, left .3s; }
  .tr-caps { display:flex; gap:4px; margin-bottom:12px; }
  .tr-caps i { flex:1; height:4px; border-radius:2px; background:#E4ECF6; }
  .tr-caps i.feito { background:#9DBBE0; } .tr-caps i.agora { background:#1A4893; }
  .tr-cx small { font-size:11.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#8A929C; }
  .tr-cx b { display:block; font-size:18px; color:#10203A; margin:4px 0 6px; letter-spacing:-.01em; }
  .tr-cx p { font-size:14.5px; line-height:1.55; margin:0 0 14px; }
  .tr-cx p strong { color:#10203A; font-weight:600; }
  .tr-bts { display:flex; align-items:center; gap:8px; }
  .tr-bts span { flex:1; }
  .tr-bts button { font:500 13.5px var(--body,'Geist',sans-serif); padding:8px 14px; border-radius:999px; border:1px solid #DED7CA; background:#fff; color:#10203A; cursor:pointer; }
  .tr-bts button[data-tr="pular"] { border:0; padding:8px 2px; color:#66717F; }
  .tr-bts button.forte { background:#1A4893; border-color:#1A4893; color:#fff; }
  .tr-cx.carregando .tr-bts button:not([data-tr="pular"]) { opacity:.6; cursor:progress; }
  .tr-veu { position:fixed; inset:0; z-index:425; background:rgba(15,29,51,.5); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px); }
  .tr-boas { left:50%; top:50%; transform:translate(-50%,-50%); width:min(500px, calc(100vw - 32px)); padding:30px 30px 24px; text-align:left; }
  .tr-boas .tr-logo { width:46px; height:46px; margin-bottom:16px; }
  .tr-boas h2 { font-family:var(--display,'Hedvig Letters Serif',Georgia,serif); font-weight:400; font-size:30px; line-height:1.12; color:#10203A; letter-spacing:-.02em; margin:0 0 10px; text-wrap:balance; }
  .tr-boas p { font-size:15px; line-height:1.6; margin:0 0 16px; }
  .tr-boas { width:min(580px, calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow-y:auto; }
  .tr-olho { display:block; font-size:11.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#1A4893; margin-bottom:6px; }
  .tr-rot { border:1px solid #E4ECF6; border-radius:14px; background:#F7FAFD; margin:0 0 14px; overflow:hidden; }
  .tr-rot-cab { display:flex; justify-content:space-between; padding:10px 14px; font-size:11.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#7A8594; border-bottom:1px solid #E4ECF6; }
  .tr-rot ol { list-style:none; margin:0; padding:4px 0; }
  .tr-rot li { display:grid; grid-template-columns:34px minmax(0,1fr) auto; gap:12px; align-items:center; padding:8px 14px; }
  .tr-rot li + li { border-top:1px solid #EDF2F8; }
  .tr-ic { width:34px; height:34px; border-radius:10px; background:#fff; border:1px solid #DCE6F1; display:grid; place-items:center; color:#1A4893; }
  .tr-ic svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .tr-rot b { display:block; font-size:14px; font-weight:600; color:#10203A; }
  .tr-rot small { display:block; font-size:12.5px; color:#66717F; line-height:1.4; }
  .tr-rot em { font-style:normal; font-size:12px; color:#7A8594; white-space:nowrap; }
  .tr-nota { font-size:13px !important; color:#7A8594; margin:0 0 18px !important; }
  /* a pergunta que aparece depois de se candidatar, desenhada dentro da caixa do tour */
  .tr-mock { border:1px solid #E6DFD3; border-radius:12px; padding:12px; margin:-4px 0 10px; background:#FBF9F5; display:grid; gap:6px; }
  .tr-mock b { font-family:var(--display,'Hedvig Letters Serif',Georgia,serif); font-weight:400; font-size:16px; color:#10203A; margin:0; }
  .tr-mock span { font-size:12.5px; color:#66717F; }
  .tr-mock i { font-style:normal; text-align:center; font-size:12.5px; font-weight:600; padding:7px; border-radius:999px; border:1px solid #DED7CA; background:#fff; color:#10203A; }
  .tr-mock i.forte { background:#1A4893; border-color:#1A4893; color:#fff; }
  .tr-pos { font-size:13.5px !important; margin:0 0 14px !important; }
  .tr-cx.largo { width:min(470px, calc(100vw - 24px)); }
  .tr-form { border:1px solid #E6DFD3; border-radius:12px; background:#FBF9F5; margin:-4px 0 12px; overflow:hidden; }
  .tr-form-cab { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; font-size:13px; font-weight:600; color:#10203A; border-bottom:1px solid #EAE4D9; background:#fff; }
  .tr-form-cab span { font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#A85D24; }
  .tr-campo { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.05fr); gap:2px 12px; padding:7px 12px; border-top:1px solid #F0EBE2; align-items:baseline; }
  .tr-campo:first-of-type { border-top:0; }
  .tr-campo label { font-size:11.5px; font-weight:600; color:#54606F; }
  .tr-val { font-size:12.5px; color:#10203A; background:#fff; border:1px solid #E6DFD3; border-radius:7px; padding:3px 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tr-campo small { grid-column:1 / -1; font-size:11.5px !important; font-weight:400 !important; letter-spacing:0 !important; text-transform:none !important; color:#7A8594 !important; }
  @media (max-width:960px) { .tr-cx { max-height:calc(100vh - 32px); overflow-y:auto; } }
  @media (max-width:560px) { .tr-rot em { display:none; } .tr-rot li { grid-template-columns:34px minmax(0,1fr); } .tr-boas { padding:22px 20px 18px; } .tr-boas h2 { font-size:25px; } }
  .tr-boas .tr-bts button { padding:11px 20px; font-size:14.5px; }
  @media (max-width:960px) { .tr-cx { left:12px !important; right:12px; top:auto !important; bottom:16px; width:auto; }
    .tr-cx.em-cima { top:12px !important; bottom:auto; } }`;
  let estado = null, foco, cx, bloq, ocupado = false;
  function carregando(sim) {
    ocupado = sim;
    if (!cx) return;
    cx.classList.toggle("carregando", sim);
    const f = cx.querySelector(".forte");
    if (f && sim) { f.dataset.texto = f.dataset.texto || f.textContent; f.textContent = "Abrindo…"; }
  }
  const isoDia = n => { const d = new Date(); d.setDate(d.getDate() + (n || 0)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const janelaAberta = () => document.getElementById("ui-painel");
  async function esperar(sel, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 3000)) { if (document.querySelector(sel)) return true; await pausa(100); } return false; }
  function clicar(sels) { for (const q of sels) { const b = document.querySelector(q); if (b) { b.click(); return true; } } return false; }
  function preencher(vals) {
    const d = janelaAberta(); if (!d) return;
    for (const [n, v] of Object.entries(vals)) {
      const el = d.querySelector(`[name="${n}"]`); if (!el) continue;
      if (el.tagName === "SELECT") { if (![...el.options].some(o => o.value === v)) continue; }
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  function soltar() { [bloq, foco, cx].forEach(x => x && document.body.appendChild(x)); }
  function fecharJanela() { soltar(); const d = janelaAberta(); if (d) { try { d.close(); } catch (e) {} d.remove(); } }
  const NA_JANELA = ["candidatura", "trabalho", "dia", "marcar", "candSalva", "candAjustar", "candEditar", "pagoImposto", "outraRenda"];
  const ACOES = {
    async candidatura() {
      const jn = janelaAberta();   // a janela de Nova candidatura, não a de uma candidatura salva (que tem as abas)
      if (jn && jn.querySelector('[name="titulo"]') && jn.querySelector('[name="proximoEm"]') && !jn.querySelector('.cv-abas')) return;
      fecharJanela(); clicar(["#aplicacoes [data-nova-ap]", "#aplicacoes .ct-b.forte", "#aplicacoes button"]);
      await esperar('#ui-painel [name="titulo"]');
      preencher({ empresa: "TELUS Digital", titulo: "Personalized Internet Assessor - Portuguese (BR)", url: "https://www.telusdigital.com/careers", data: isoDia(0),
        estado: "aplicado", origem: "Home Office Hub", email: "lucas@exemplo.com", remuneracao: "Cerca de US$ 5 por hora", curriculo: "Currículo avaliação 2026",
        proximo: "Fazer o teste de qualificação", proximoEm: isoDia(7), observacoes: "Recrutadora: Carla. Pediram para fazer o teste em até 7 dias." });
    },
    async trabalho() {
      if (janelaAberta() && janelaAberta().querySelector('[name="projeto"]')) return;
      fecharJanela(); clicar(["#trabalhos [data-novo-tr]", "#lado [data-novo-tr]"]);
      await esperar('#ui-painel [name="projeto"]');
      preencher({ empresa: "TELUS Digital", projeto: "Personalized Internet Assessor", plataforma: "TELUS AI Community", inicio: isoDia(0), pagamento: "hora", valor: "5", moeda: "USD", ciclo: "mensal" });
    },
    async criarExemplo() {
      await Dados.abrir();
      let t = (await Dados.listar("trabalhos")).find(x => x.exemploTour);
      if (t) return { t, novo: false };
      t = await Dados.salvar("trabalhos", { empresa: "TELUS Digital", projeto: "Exemplo do tour", plataforma: "TELUS AI Community", pagamento: "hora", valor: 5, moeda: "USD",
        ciclo: "mensal", inicio: isoDia(-20), estado: "ativo", cor: "#1A4893", diaPeriodo: 1, exemploTour: true });
      for (let d = 1; d <= 12; d++) if (d % 3) await Dados.salvar("registros", { trabalhoId: t.id, data: isoDia(-d), horas: 2, observacoes: "" });
      return { t, novo: true };
    },
    async garantirExemplo() {   // para o Ganhos e o Imposto terem números: o exemplo existe, sem sair da página
      if (typeof Dados === "undefined") return;
      const { novo } = await ACOES.criarExemplo();
      if (novo) { location.reload(); await pausa(5000); }
    },
    async trabalhoExemplo() {
      fecharJanela();
      if (typeof Dados === "undefined") return;
      const { t } = await ACOES.criarExemplo();
      if (location.hash.slice(1) !== "trabalho/" + t.id) { location.hash = "trabalho/" + t.id; location.reload(); await pausa(5000); }
    },
    async pagoImposto() {
      if (janelaAberta() && janelaAberta().querySelector('[name="valor"]') && janelaAberta().querySelector('[name="data"]')) return;
      fecharJanela();
      await ACOES.garantirExemplo();
      clicar(["#imposto .ip-pago"]);
      await esperar('#ui-painel [name="valor"]');
      preencher({ valor: "1180", moeda: "BRL", data: isoDia(-1), nota: "Caiu pela Payoneer, já com a taxa." });
    },
    async outraRenda() {
      if (janelaAberta() && janelaAberta().querySelector('[name="origem"]')) return;
      fecharJanela();
      await ACOES.garantirExemplo();
      clicar(["#imposto [data-nova-renda]"]);
      await esperar('#ui-painel [name="origem"]');
      preencher({ origem: "Aulas particulares de inglês", valor: "600", moeda: "BRL", tipo: "pf" });
    },
    async dia() {
      if (janelaAberta() && janelaAberta().querySelector('[name="horas"]')) return;
      fecharJanela();
      await ACOES.trabalhoExemplo(); clicar([".t-cab-bts [data-dia]", "[data-dia]"]);
      await esperar('#ui-painel [name="horas"]');
      preencher({ horas: "2.5", observacoes: "Fiz 40 avaliações. Mandei ao suporte a dúvida sobre a regra 3.2." });
    },
    async marcar() {
      if (janelaAberta() && janelaAberta().querySelector('[name="tipo"]')) return;
      fecharJanela(); clicar(["#agenda [data-marcar]"]);
      await esperar("#ui-painel");
      preencher({ tipo: "entrevista" }); await pausa(300);
      const ex = typeof Dados !== "undefined" ? (await Dados.listar("aplicacoes")).find(x => x.exemploTour) : null;
      preencher({ titulo: "Entrevista com a micro1", data: isoDia(7), inicio: "14:00", nota: "O link da chamada veio no e-mail.", aplicacaoId: ex ? ex.id : "" });
    },
    async candSalva(aba) {
      const d = janelaAberta();
      const certo = d && d.querySelector(".cv-abas") && !d.querySelector(".cv-trilho.ordenando") &&
        (d.querySelector(`.cv-aba[data-aba="${aba || "vaga"}"][aria-selected="true"]`));
      if (certo) return;
      fecharJanela();
      if (typeof Dados === "undefined") return;
      await Dados.abrir();
      let a = (await Dados.listar("aplicacoes")).find(x => x.exemploTour);
      if (!a) {
        a = await Dados.salvar("aplicacoes", { empresa: "TELUS Digital", titulo: "Personalized Internet Assessor (exemplo do tour)", url: "https://www.telusdigital.com/careers",
          data: isoDia(-6), estado: "teste", origem: "Home Office Hub", email: "lucas@exemplo.com", remuneracao: "Cerca de US$ 5 por hora", curriculo: "Currículo avaliação 2026",
          proximo: "Fazer o teste de qualificação", proximoEm: isoDia(3), observacoes: "Recrutadora: Carla.", passos: { aplicado: isoDia(-6), teste: isoDia(-2) }, exemploTour: true });
        location.reload(); await pausa(5000); return;   // a lista de candidaturas é lida de novo
      }
      if (!clicar([`.ct-linha[data-ap="${a.id}"]`])) { location.reload(); await pausa(5000); return; }
      await esperar("#ui-painel .cv-abas");
      if (aba === "editar") { clicar(['#ui-painel .cv-aba[data-aba="editar"]']); await pausa(250); }
    },
    async candAjustar() {
      const d = janelaAberta();
      if (d && d.querySelector(".cv-trilho.ordenando")) return;
      await ACOES.candSalva();
      clicar(["#ui-painel [data-ordem]"]); await pausa(250);
    },
    async candEditar() { await ACOES.candSalva("editar"); },
    async agendaExemplo() {   // na agenda: sem o trabalho de exemplo, mas com uma candidatura de exemplo para o campo "De qual candidatura"
      fecharJanela();
      if (typeof Dados === "undefined") return;
      await Dados.abrir();
      const ex = (await Dados.listar("trabalhos")).filter(x => x.exemploTour);
      for (const t of ex) await Dados.removerTrabalho(t.id);
      let mudou = ex.length > 0;
      if (!(await Dados.listar("aplicacoes")).some(x => x.exemploTour)) {
        await Dados.salvar("aplicacoes", { empresa: "micro1", titulo: "Portuguese Bilingual Expert (exemplo do tour)", data: isoDia(-10), estado: "entrevista",
          origem: "Home Office Hub", passos: { aplicado: isoDia(-10), entrevista: isoDia(-2) }, exemploTour: true });
        mudou = true;
      }
      if (mudou) { location.reload(); await pausa(5000); }   // a tela do Meu Controle lê tudo de novo
    },
    async limparExemplo(semRecarregar) {
      fecharJanela();
      if (typeof Dados === "undefined") return;
      await Dados.abrir();
      const ex = (await Dados.listar("trabalhos")).filter(x => x.exemploTour);
      for (const t of ex) await Dados.removerTrabalho(t.id);
      const ca = (await Dados.listar("aplicacoes")).filter(x => x.exemploTour);
      for (const a of ca) await Dados.remover("aplicacoes", a.id);
      if ((ex.length || ca.length) && !semRecarregar) { location.reload(); await pausa(5000); }   // a tela do Meu Controle lê tudo de novo
    },
  };
  const guardar = () => { try { estado ? localStorage.setItem("plat-tour", JSON.stringify(estado)) : localStorage.removeItem("plat-tour"); } catch (e) {} };
  const coluna = () => document.querySelector(".al");
  const nomePessoa = () => { try { return String(JSON.parse(localStorage.getItem("sb-zrqucjktympnwilbvisw-auth-token")).user.user_metadata.nome || "").split(/\s+/)[0]; } catch (e) { return ""; } };
  function css() { if (document.getElementById("trCss")) return; const s = document.createElement("style"); s.id = "trCss"; s.textContent = CSS; document.head.appendChild(s); }
  function limpar() { [foco, cx, bloq].forEach(x => x && x.remove()); foco = cx = bloq = null; document.querySelectorAll(".tr-veu, .tr-boas").forEach(x => x.remove()); }
  function colunaAberta(sim) {
    const c = coluna(); if (!c) return;
    c.classList.toggle("em-tour", sim);
    if (sim) { c.classList.remove("fechado"); c.classList.add("aberta"); if (innerWidth <= 960) c.classList.add("on"); }
    else { c.classList.remove("aberta"); if (innerWidth <= 960) c.classList.remove("on"); }
  }
  function janela(html, botoes) {
    limpar(); css(); document.body.classList.add("tour-ativo");
    const v = document.createElement("div"); v.className = "tr-veu";
    const j = document.createElement("div"); j.className = "tr-boas"; j.setAttribute("role", "dialog"); j.setAttribute("aria-modal", "true");
    j.innerHTML = html + `<div class="tr-bts">${botoes}</div>`;
    document.body.append(v, j);
    setTimeout(() => { const f = j.querySelector(".forte"); if (f) f.focus(); }, 30);
    return j;
  }
  function boasVindas() {
    const n = nomePessoa();
    const j = janela(`<img class="tr-logo" src="logo.svg" alt="">
      <small class="tr-olho">Primeiro acesso</small>
      <h2>Boas-vindas ao Hub${n ? ", " + esc(n) : ""}!</h2>
      <p>Agora eu vou te mostrar como navegar pela plataforma. Vamos passar por cada parte, abrindo as próprias páginas, para você ver onde fica cada coisa e para que serve.</p>
      <div class="tr-rot"><div class="tr-rot-cab"><span>O roteiro</span><span>uns 5 minutos</span></div>
        <ol>${CAPS.map((c, k) => { const q = P.filter(x => x.cap === c).length;
          return `<li><span class="tr-ic"><svg viewBox="0 0 24 24">${ROTEIRO[c][1]}</svg></span><div><b>${k + 1}. ${c}</b><small>${ROTEIRO[c][0]}</small></div><em>${q} ${q === 1 ? "parada" : "paradas"}</em></li>`; }).join("")}</ol></div>
      <p class="tr-nota">Dá para parar quando quiser e continuar depois. O tour fica no menu da sua conta, para ver de novo.</p>`,
      `<button data-tr="agoranao">Agora não</button><span></span><button class="forte" data-tr="comecar">Começar o tour</button>`);
    j.addEventListener("click", ev => { const b = ev.target.closest("[data-tr]"); if (!b) return;
      if (b.dataset.tr === "comecar") { comecar(); }
      else terminar(false); });
  }
  async function comecar() {
    let vaga = "";
    try {
      const [g, pu] = await Promise.all([lerVagas(), fetch("pulso.json?v=" + Date.now()).then(r => r.json()).catch(() => ({}))]);
      const ids = (g.vagas || []).map(v => v.id);
      vaga = ((pu.destaques || []).map(d => d.id).find(id => ids.includes(id))) || ids[0] || "";
    } catch (e) {}
    estado = { passo: 0, vaga, fechado: !!(coluna() && coluna().classList.contains("fechado")) }; guardar(); passo();
  }
  function final() {
    const n = nomePessoa();
    const j = janela(`<img class="tr-logo" src="logo.svg" alt="">
      <h2>Pronto${n ? ", " + esc(n) : ""}!</h2>
      <p>Agora você sabe onde fica cada coisa. No Início, os primeiros passos mostram por onde começar, e cada um se marca sozinho quando você faz.</p>`,
      `<button data-tr="rever">Ver o tour de novo</button><span></span><button class="forte" data-tr="inicio">Ir para o Início</button>`);
    j.addEventListener("click", ev => { const b = ev.target.closest("[data-tr]"); if (!b) return;
      if (b.dataset.tr === "rever") comecar(); else { limpar(); location.href = "inicio.html"; } });
  }
  function noLugar(pg) {
    if (!pg) return true;
    const [arq, h] = pg.split("#"), aqui = location.pathname.split("/").pop() || "index.html";
    const q = arq.includes("?") ? "?" + arq.split("?")[1] : "";
    return aqui === arq.split("?")[0] && (!q || location.search === q) && (!h || location.hash.slice(1).split("/")[0] === h);
  }
  function achar(alvo, tempo) {
    const lista = Array.isArray(alvo) ? alvo : [alvo];
    return new Promise(res => {
      const t0 = Date.now();
      (function olhar() {
        for (const a of lista) {
          let el = null;
          if (a === "busca") el = document.querySelector(".al .al-busca");
          else if (a.startsWith("col:")) el = document.querySelector(`.al .al-nav .al-linha[data-id="${a.slice(4)}"]`);
          else if (a.startsWith("campo:")) { const c = document.querySelector(`#ui-painel [name="${a.slice(6)}"]`); el = c && (c.closest(".d-linha") || c); }
          else if (a.startsWith("filhos:")) {
            const [sel, n] = [a.slice(7, a.lastIndexOf(":")), +a.slice(a.lastIndexOf(":") + 1)];
            const pai = document.querySelector(sel), fs = pai ? [...pai.children].slice(0, n) : [];
            if (fs.length) { el = fs[0]; if (fs.length > 1) el._junto = fs.slice(1); }
          }
          else if (a.startsWith("campos:")) {
            const cs = a.slice(7).split(",").map(n => document.querySelector(`#ui-painel [name="${n}"]`)).filter(Boolean).map(c => c.closest(".d-linha") || c);
            if (cs.length > 1) { el = cs[0]; el._junto = cs.slice(1); }
          }
          else { try { el = document.querySelector(a); } catch (e) { el = null; } }
          if (el && el.getBoundingClientRect().height > 0) return res(el);
        }
        if (Date.now() - t0 > tempo) return res(null);
        setTimeout(olhar, 120);
      })();
    });
  }
  async function passo() {
    if (!estado) return;
    const i = estado.passo, s = P[i];
    document.querySelectorAll(".tr-veu, .tr-boas").forEach(x => x.remove());   // sai a janela de boas-vindas
    document.body.classList.add("tour-ativo");
    if (!s) { terminar(true); return; }
    const pg = s.pg && s.pg.replace("{vaga}", encodeURIComponent(estado.vaga || ""));
    if (!noLugar(pg)) {
      guardar(); limpar();
      const [arq, h] = pg.split("#");
      if ((location.pathname.split("/").pop() || "index.html") === arq.split("?")[0] && h) { location.hash = h; setTimeout(passo, 400); }
      else location.href = pg;
      return;
    }
    if (!NA_JANELA.includes(s.antes)) fecharJanela();
    if (s.antes && ACOES[s.antes]) { try { await ACOES[s.antes](); } catch (e) { console.warn("tour", e); } }
    if (!estado || estado.passo !== i) return;
    const naColuna = typeof s.alvo === "string" && (s.alvo.startsWith("col:") || s.alvo === "busca");
    colunaAberta(naColuna || innerWidth > 960);
    if (!naColuna && innerWidth <= 960) { const c = coluna(); if (c) c.classList.remove("on"); }
    const el = await achar(s.alvo, 5000);
    if (!estado || estado.passo !== i) return;
    if (!el) { estado.passo = Math.max(0, estado.passo + (estado.dir || 1)); guardar(); passo(); return; }
    css();
    if (!bloq) { bloq = document.createElement("div"); bloq.className = "tr-bloq"; document.body.appendChild(bloq); }
    if (!foco) { foco = document.createElement("div"); foco.className = "tr-foco"; document.body.appendChild(foco); }
    if (!cx) {
      cx = document.createElement("div"); cx.className = "tr-cx"; cx.setAttribute("role", "dialog"); cx.setAttribute("aria-live", "polite"); document.body.appendChild(cx);
      cx.addEventListener("click", ev => { const b = ev.target.closest("[data-tr]"); if (!b || !estado) return;
        if (b.dataset.tr === "pular") { ocupado = false; terminar(false); return; }
        if (ocupado) return;   // a próxima parada ainda está abrindo
        if (b.dataset.tr === "seguir") { estado.dir = 1; estado.passo++; guardar(); carregando(true); passo(); }
        else if (b.dataset.tr === "voltar") { estado.dir = -1; estado.passo = Math.max(0, estado.passo - 1); guardar(); carregando(true); passo(); }
        });
    }
    const casa = janelaAberta() && janelaAberta().contains(el) ? janelaAberta() : document.body;   // a janela fica por cima de tudo: o tour entra nela
    [bloq, foco, cx].forEach(x => { if (x.parentNode !== casa) casa.appendChild(x); });
    const naJanela = casa !== document.body;
    if (naColuna) el.scrollIntoView({ block: innerWidth <= 960 ? "start" : "nearest", behavior: "instant" });
    else if (naJanela) el.scrollIntoView({ block: el.getBoundingClientRect().width > innerWidth * 0.45 && innerWidth > 960 ? "start" : "center", behavior: "instant" });   // larga: sobe, e a caixa fica embaixo
    const capAgora = CAPS.indexOf(s.cap);
    const doCap = P.filter(x => x.cap === s.cap), n = doCap.indexOf(s) + 1;
    cx.classList.toggle("largo", !!s.largo);
    cx.innerHTML = `<div class="tr-caps">${CAPS.map((c, k) => `<i class="${k < capAgora ? "feito" : k === capAgora ? "agora" : ""}" title="${c}"></i>`).join("")}</div>
      <small>${s.cap} · ${n} de ${doCap.length}</small><b>${s.tit}</b><p>${s.txt}</p>${s.extra || ""}
      <div class="tr-bts"><button data-tr="pular">Sair do tour</button><span></span>${i ? '<button data-tr="voltar">Voltar</button>' : ""}
      <button class="forte" data-tr="seguir">${i === P.length - 1 ? "Terminar" : "Próximo"}</button></div>`;
    await new Promise(r => setTimeout(r, naColuna ? 260 : 120));
    const W = innerWidth, H = innerHeight, cw = cx.offsetWidth, ch = cx.offsetHeight, celular = W <= 960;
    if (!naColuna && !naJanela) {
      const r0 = el.getBoundingClientRect();
      if (celular) { window.scrollBy({ top: r0.top - 72, behavior: "instant" }); }   // no celular a caixa fica embaixo: a parte vai para o alto
      else if (r0.width > W * 0.45) {
        // parte larga: a caixa vai em cima dela, sobre o que a pessoa já viu; a parte desce para dar lugar
        const desejado = ch + 40, livre = H - desejado - 12;
        const topo = r0.height <= livre ? desejado + (livre - r0.height) / 2 : desejado;
        window.scrollBy({ top: r0.top - topo, behavior: "instant" });
      } else el.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise(r => setTimeout(r, 60));
    }
    let r = el.getBoundingClientRect(); const m = 6;
    if (el._junto) {   // a caixa acesa cobre todos os campos juntos
      const rs = [r].concat(el._junto.map(x => x.getBoundingClientRect()));
      const l = Math.min(...rs.map(x => x.left)), t = Math.min(...rs.map(x => x.top)), rt = Math.max(...rs.map(x => x.right)), b = Math.max(...rs.map(x => x.bottom));
      r = { left: l, top: t, right: rt, bottom: b, width: rt - l, height: b - t };
    }
    // parte maior que a tela: acende só o que aparece, para a caixa ter onde ficar
    // no celular a caixa fica embaixo; se a parte acesa está embaixo e não dá para subir, a caixa vai para o alto
    let emCima = false;
    if (celular) { const r1 = el.getBoundingClientRect(); emCima = r1.bottom > H - ch - 28 && r1.top > ch + 28; }
    cx.classList.toggle("em-cima", emCima);
    const fim = celular && !emCima ? H - ch - 28 : H - 8;
    if (r.bottom > fim) r = { left: r.left, right: r.right, width: r.width, top: r.top, bottom: Math.max(r.top + 60, fim), height: Math.max(60, fim - r.top) };
    const top = Math.max(4, r.top - m), alt = Math.min(r.height + m * 2, innerHeight - top - 4);
    Object.assign(foco.style, { top: top + "px", left: Math.max(4, r.left - m) + "px", width: Math.min(r.width + m * 2, innerWidth - 8) + "px", height: alt + "px" });
    if (!celular) {
      // a caixa procura um lado livre, sem cobrir a parte acesa: direita, esquerda, em cima, embaixo
      const M = 18, livreDoAlvo = (x, y) => x + cw <= r.left - 8 || x >= r.right + 8 || y + ch <= r.top - 8 || y >= r.bottom + 8;
      const dentro = (x, y) => x >= 12 && y >= 12 && x + cw <= W - 12 && y + ch <= H - 12 && livreDoAlvo(x, y);
      const meioY = Math.min(H - ch - 12, Math.max(12, r.top + r.height / 2 - ch / 2));
      const lados = {
        direita: [r.right + M, meioY], esquerda: [r.left - M - cw, meioY],
        cima: [Math.min(W - cw - 12, Math.max(12, r.left)), r.top - M - ch], baixo: [Math.min(W - cw - 12, Math.max(12, r.left)), r.bottom + M],
      };
      const larga = r.width > W * 0.45;
      const ordem = [s.lado].concat(naColuna ? ["direita"] : larga ? ["cima", "esquerda", "direita", "baixo"] : ["direita", "esquerda", "cima", "baixo"]).filter(Boolean);
      let pos = null;
      for (const k of ordem) if (lados[k] && dentro(...lados[k])) { pos = lados[k]; break; }
      if (!pos && r.top + 120 < H - ch - 30) {
        // sem lado livre: a parte acesa encolhe por baixo e a caixa fica logo abaixo dela, sem cobrir nada aceso
        const corte = H - ch - 30;
        r = { left: r.left, right: r.right, width: r.width, top: r.top, bottom: corte, height: corte - r.top };
        foco.style.height = Math.max(40, r.height + m * 2) + "px";
        pos = [Math.min(W - cw - 12, Math.max(12, r.left + r.width / 2 - cw / 2)), H - ch - 12];
      }
      if (!pos) pos = [W - cw - 16, H - ch - 16];   // último caso: o canto de baixo
      cx.style.left = pos[0] + "px"; cx.style.top = pos[1] + "px";
    }
    carregando(false);
    const f = cx.querySelector(".forte"); if (f) f.focus({ preventScroll: true });
  }
  function terminar(completo) {
    const fechado = estado && estado.fechado;
    estado = null; ocupado = false; guardar(); fecharJanela(); limpar(); colunaAberta(false); document.body.classList.remove("tour-ativo");
    ACOES.limparExemplo(completo).catch(() => {});   // no fim do tour, sem recarregar: a tela de encerramento fica
    if (fechado && coluna()) coluna().classList.add("fechado");
    try { localStorage.setItem("plat-tour-feito", "1"); } catch (e) {}
    if (completo) final();
  }
  document.addEventListener("keydown", ev => {
    if (!estado || !cx) return;
    if (ev.key === "Escape") terminar(false);
    if (ocupado) return;
    if (ev.key === "ArrowRight") { estado.dir = 1; estado.passo++; guardar(); carregando(true); passo(); }
    if (ev.key === "ArrowLeft" && estado.passo) { estado.dir = -1; estado.passo--; guardar(); carregando(true); passo(); }
  });
  addEventListener("resize", () => { if (estado && cx) passo(); });
  // continua o tour depois que uma página nova abre
  function retomar() {
    try { estado = JSON.parse(localStorage.getItem("plat-tour")); } catch (e) { estado = null; }
    if (estado && typeof estado.passo === "number") setTimeout(passo, 500);
  }
  window.PlatTour = boasVindas;
  return { boasVindas, retomar };
})();
