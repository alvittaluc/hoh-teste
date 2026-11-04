/* ══════════════════════════════════════════════════════════
   Lembrete de candidatura

   Quando a pessoa clica em "Candidatar-se a esta vaga", a página
   oficial abre em outra aba e, na aba do Hub, a pergunta
   "Conseguiu se candidatar?" já fica aberta, esperando a pessoa
   voltar, com um clique para guardar a candidatura no Meu Controle.
   Se ela fechar a aba do Hub, a pergunta aparece quando voltar ao
   site por qualquer página.

   - Não pergunta se a candidatura já está no Meu Controle.
   - "Ainda não terminei" pergunta de novo na próxima volta, até 3 vezes.
   - "Não me candidatei" esquece a vaga.
   - A anotação vale por 3 dias.
   Usa Dados (controle-dados.js); sem ele, não faz nada.
   ══════════════════════════════════════════════════════════ */
(function () {
  const CHAVE = "hub-lembrete-candidatura";
  const VALIDADE = 3 * 24 * 3600 * 1000;        // 3 dias
  const MAX_VEZES = 3;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const lerTodos = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { return []; } };
  const gravarTodos = l => { try { localStorage.setItem(CHAVE, JSON.stringify(l)); } catch (e) {} };
  const tirar = id => gravarTodos(lerTodos().filter(r => r.vagaId !== id));
  const atualizar = (id, mudar) => gravarTodos(lerTodos().map(r => r.vagaId === id ? Object.assign(r, mudar) : r));

  let vagaDaPagina = null, aberto = false;

  /* A página da vaga avisa qual vaga está mostrando. */
  function vaga(v, nomeEmpresa) {
    vagaDaPagina = { v, empresa: nomeEmpresa };
    document.addEventListener("click", ev => {
      const a = ev.target.closest && ev.target.closest("a.candidatar");
      if (!a || typeof Dados === "undefined") return;
      const lista = lerTodos().filter(r => r.vagaId !== v.id);
      lista.push({
        vagaId: v.id, empresa: nomeEmpresa, titulo: v.titulo, url: v.url,
        remuneracao: (v.resumo && v.resumo.remuneracao) || "",
        foto: Dados.fotoDaVaga(v), saiu: Date.now(), vezes: 0,
      });
      gravarTodos(lista);
      setTimeout(() => verificar(true), 300);   // a pergunta já fica aberta para quando ela voltar
    });
  }

  async function jaGuardada(r) {
    try { return !!(await Dados.procurarAplicacao({ vagaId: r.vagaId, empresa: r.empresa, titulo: r.titulo })); }
    catch (e) { return false; }
  }

  /* agoraMesmo: logo depois do clique em Candidatar-se, com a página oficial já na frente.
     voltou: a pessoa trocou de aba e voltou para o Hub; aí até a vaga adiada com
     "Ainda não terminei" é perguntada de novo. Ao abrir outra página do Hub, não. */
  async function verificar(agoraMesmo, voltou) {
    if (aberto || (!agoraMesmo && document.visibilityState !== "visible") || typeof Dados === "undefined") return;
    const agora = Date.now();
    let lista = lerTodos().filter(r => agora - r.saiu < VALIDADE && r.vezes < MAX_VEZES);
    if (voltou) lista.forEach(r => { r.adiada = false; });
    gravarTodos(lista);
    lista = lista.filter(r => !r.adiada);
    // a vaga desta página vem primeiro; depois a mais recente
    lista = lista.sort((a, b) => (vagaDaPagina && b.vagaId === vagaDaPagina.v.id) - (vagaDaPagina && a.vagaId === vagaDaPagina.v.id) || b.saiu - a.saiu);
    for (const r of lista) {
      if (await jaGuardada(r)) { tirar(r.vagaId); continue; }
      perguntar(r);
      return;
    }
  }

  function estilo() {
    if (document.getElementById("lc-estilo")) return;
    const s = document.createElement("style");
    s.id = "lc-estilo";
    s.textContent = `
.lc-veu { position:fixed; inset:0; z-index:900; background:rgba(15,29,51,.45); display:flex; align-items:center; justify-content:center; padding:16px; animation:lcVeu .2s ease; }
.lc-cx { background:var(--panel,#fff); border-radius:20px; width:min(440px,100%); box-shadow:0 30px 60px -30px rgba(16,32,58,.6); padding:24px; position:relative; animation:lcSobe .25s cubic-bezier(.2,.8,.2,1); font-family:var(--body,system-ui); }
.lc-fecha { position:absolute; top:12px; right:12px; width:32px; height:32px; border-radius:50%; border:0; background:var(--bg-soft,#F1ECE3); color:var(--ink-2,#54606F); font-size:18px; cursor:pointer; line-height:1; }
.lc-ic { width:44px; height:44px; border-radius:12px; background:var(--signal-suave,#EAF1F8); color:var(--signal,#1A4893); display:grid; place-items:center; margin-bottom:12px; }
.lc-cx h2 { font-family:var(--display,Georgia); font-weight:400; font-size:25px; line-height:1.15; color:var(--ink,#10203A); margin:0 0 8px; }
.lc-cx p { font-size:14.5px; color:var(--ink-2,#54606F); line-height:1.55; margin:0; }
.lc-vaga { margin:14px 0 18px; border:1px solid var(--line-soft,#EAE4D9); border-radius:12px; padding:11px 14px; background:var(--panel-2,#FBF9F5); }
.lc-vaga b { display:block; font-size:14.5px; color:var(--ink,#10203A); line-height:1.35; }
.lc-vaga small { font-size:13px; color:var(--ink-3,#66717F); }
.lc-bts { display:grid; gap:8px; }
.lc-bt { font:inherit; font-size:15px; font-weight:500; padding:12px 16px; border-radius:999px; border:1px solid var(--line,#DED7CA); background:var(--panel,#fff); color:var(--ink,#10203A); cursor:pointer; text-align:center; text-decoration:none; }
.lc-bt:hover { border-color:var(--ink-3,#66717F); }
.lc-bt.forte { background:var(--signal,#1A4893); border-color:var(--signal,#1A4893); color:#fff; }
.lc-bt.forte:hover { filter:brightness(1.08); }
.lc-bt[disabled] { opacity:.6; cursor:default; }
.lc-par { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.lc-ok .lc-ic { background:#E1F0E5; color:#2F6B3F; }
@keyframes lcVeu { from { opacity:0 } }
@keyframes lcSobe { from { opacity:0; transform:translateY(14px) scale(.98) } }
@media (max-width:420px) { .lc-par { grid-template-columns:1fr; } .lc-cx { padding:22px 18px; } }
@media (prefers-reduced-motion: reduce) { .lc-veu, .lc-cx { animation:none; } }`;
    document.head.appendChild(s);
  }

  const ICONE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12l2 2 4-4"/></svg>`;

  function perguntar(r) {
    estilo();
    aberto = true;
    const antes = document.activeElement;
    const veu = document.createElement("div");
    veu.className = "lc-veu";
    veu.innerHTML = `<div class="lc-cx" role="dialog" aria-modal="true" aria-labelledby="lc-tit">
      <button class="lc-fecha" aria-label="Fechar" data-lc="depois">×</button>
      <div class="lc-ic">${ICONE}</div>
      <h2 id="lc-tit">Conseguiu se candidatar?</h2>
      <p>Guarde a candidatura no Meu Controle. Assim você acompanha cada etapa e não fica em dúvida depois se já mandou para esta vaga.</p>
      <div class="lc-vaga"><b>${esc(r.titulo)}</b><small>${esc(r.empresa)}</small></div>
      <div class="lc-bts">
        <button class="lc-bt forte" data-lc="sim">Sim, guardar no Meu Controle</button>
        <div class="lc-par"><button class="lc-bt" data-lc="depois">Ainda não terminei</button><button class="lc-bt" data-lc="nao">Não me candidatei</button></div>
      </div>
    </div>`;
    document.body.appendChild(veu);
    const cx = veu.querySelector(".lc-cx");
    veu.querySelector("[data-lc=sim]").focus();

    function fechar() {
      veu.remove(); aberto = false;
      document.removeEventListener("keydown", tecla);
      if (antes && antes.focus) antes.focus();
    }
    function depois() { atualizar(r.vagaId, { saiu: Date.now(), vezes: (r.vezes || 0) + 1, adiada: true }); fechar(); }
    function tecla(ev) {
      if (ev.key === "Escape") { ev.preventDefault(); depois(); }
      if (ev.key === "Tab") {   // o foco fica dentro da janela
        const f = [...cx.querySelectorAll("button, a")];
        const i = f.indexOf(document.activeElement);
        if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener("keydown", tecla);
    veu.addEventListener("click", ev => { if (ev.target === veu) depois(); });

    cx.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-lc]");
      if (!b) return;
      const o = b.dataset.lc;
      if (o === "depois") return depois();
      if (o === "nao" || o === "fim") { tirar(r.vagaId); return fechar(); }
      if (o === "sim") {
        b.disabled = true; b.textContent = "Guardando…";
        try {
          await Dados.abrir();
          await Dados.salvar("aplicacoes", {
            vagaId: r.vagaId, empresa: r.empresa, titulo: r.titulo, url: r.url,
            data: Dados.hoje(), estado: "aplicado", origem: "Home Office Hub",
            remuneracao: r.remuneracao, proximo: "", proximoEm: "", observacoes: "", email: "", curriculo: "",
            vaga: r.foto,
          });
          if (typeof Pulso !== "undefined" && Pulso.enviar) Pulso.enviar(r.vagaId, "aplicou");
          tirar(r.vagaId);
          document.dispatchEvent(new CustomEvent("hub:candidatura-salva", { detail: { vagaId: r.vagaId } }));
          cx.classList.add("lc-ok");
          cx.innerHTML = `<button class="lc-fecha" aria-label="Fechar" data-lc="fim">×</button>
            <div class="lc-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
            <h2 id="lc-tit">Pronto, está guardada</h2>
            <p>A candidatura está no Meu Controle com a data de hoje. Lá você pode anotar o e-mail que usou, o currículo que mandou e marcar quando chegar o teste.</p>
            <div class="lc-vaga"><b>${esc(r.titulo)}</b><small>${esc(r.empresa)} · Currículo enviado</small></div>
            <div class="lc-bts"><a class="lc-bt forte" href="meu-controle-teste.html">Abrir no Meu Controle</a><button class="lc-bt" data-lc="fim">Continuar vendo vagas</button></div>`;
          cx.querySelector("a").focus();
        } catch (err) {
          console.error(err);
          b.disabled = false; b.textContent = "Não deu para guardar. Tentar de novo";
        }
      }
    });
  }

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") verificar(false, true); });
  window.addEventListener("pageshow", () => setTimeout(verificar, 300));

  window.LembreteCandidatura = { vaga, verificar };
})();
