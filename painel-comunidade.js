/* ══════════════════════════════════════════════════════════════
   PAINEL DA EQUIPE — aba Comunidade

   Onde a equipe escreve o que os alunos leem em comunidade.html:
   o plano da semana, o resumo do dia (à mão ou montado pela IA a
   partir da conversa exportada do WhatsApp), os encontros, os avisos
   e os materiais, e a aparência da página. Tudo pode ser só para o
   plano Black, só para o Pro, ou para todos. Nada aparece para os
   alunos antes de "Publicar".

   O banco guarda e confere quem pode (banco/comunidade.sql). O
   resumo automático é a função resumir-grupo do Supabase
   (supabase/functions/resumir-grupo), que só funciona depois de a
   chave da Anthropic ser guardada lá.
   ══════════════════════════════════════════════════════════════ */
const PainelComunidade = (function () {
  "use strict";

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const ehData = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const dt = s => new Date(s + "T12:00:00");
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const hoje = () => iso(new Date());
  const somar = (s, n) => { const d = dt(s); d.setDate(d.getDate() + n); return iso(d); };
  const segunda = s => { const d = dt(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
  const br = s => ehData(String(s).slice(0, 10)) ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : "";
  const ddmm = s => ehData(s) ? s.slice(8, 10) + "/" + s.slice(5, 7) : "";
  const DSEM = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const PARA = [["todos", "Todos os alunos"], ["black", "Só plano Black"], ["pro", "Só plano Pro"]];
  const TIPOS_ENC = [["estudo", "Estudo"], ["entrevista", "Entrevista"], ["teste", "Teste"], ["prazo", "Prazo"], ["outro", "Outro"]];
  const linhas = t => String(t || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);

  let cli = null, avisar = () => {}, alvo = null;
  let D = null;                         // o que admin_comunidade entregou
  const S = { sec: "plano", editando: null, iaMsg: "" };

  async function carregar() {
    const r = await cli.rpc("admin_comunidade");
    if (r.error) throw r.error;
    D = r.data || { config: {}, posts: [], encontros: [] };
  }

  /* ── pedaços de formulário ── */
  const campo = (rot, html, larga, dica) => `<label class="pc-campo${larga ? " larga" : ""}"><span>${rot}</span>${html}${dica ? `<small>${dica}</small>` : ""}</label>`;
  const inp = (nome, valor, extra) => `<input class="pn-in" name="${nome}" value="${esc(valor)}" ${extra || ""}>`;
  const area = (nome, valor, extra) => `<textarea class="pn-in" name="${nome}" ${extra || ""}>${esc(valor)}</textarea>`;
  const sel = (nome, opcoes, atual) => `<select class="pn-in" name="${nome}">${opcoes.map(([v, n]) => `<option value="${v}"${v === atual ? " selected" : ""}>${n}</option>`).join("")}</select>`;
  const paraTag = p => p && p !== "todos" ? `<span class="pc-para">${p === "black" ? "Só Black" : "Só Pro"}</span>` : "";
  const estado = x => x.publicado ? `<span class="pill p-aprov">Publicado</span>` : `<span class="pill p-sem">Rascunho</span>`;

  /* ── a aba ── */
  function desenhar() {
    const n = t => (D.posts || []).filter(p => p.tipo === t).length;
    const secoes = [["plano", "Plano da semana", n("plano")], ["resumo", "Resumos do dia", n("resumo")], ["encontro", "Encontros", (D.encontros || []).length],
      ["aviso", "Avisos e materiais", n("aviso") + n("material")], ["config", "Aparência e acesso", ""]];
    alvo.innerHTML = `
      <div class="pc-topo"><p class="pn-sub">O que a equipe publica aqui aparece para os alunos na página Comunidade. Cada publicação pode ser para todos, só para o Black ou só para o Pro, e só aparece depois de publicada.</p>
        <a class="pn-bt" href="comunidade.html">Ver a Comunidade como o aluno vê</a></div>
      <div class="pn-abas2" style="margin-bottom:16px">${secoes.map(([k, nome, q]) =>
        `<button data-pc-sec="${k}" aria-selected="${S.sec === k}">${nome}${q !== "" ? ` <span class="pn-cnt cinza">${q}</span>` : ""}</button>`).join("")}</div>
      <div id="pcCorpo"></div>`;
    alvo.querySelectorAll("[data-pc-sec]").forEach(b => b.onclick = () => { S.sec = b.dataset.pcSec; S.editando = null; S.iaMsg = ""; desenhar(); });
    const corpo = alvo.querySelector("#pcCorpo");
    if (S.sec === "config") { corpo.innerHTML = formConfig(); ligarConfig(corpo); return; }
    if (S.editando) {
      corpo.innerHTML = S.sec === "plano" ? formPlano(S.editando) : S.sec === "resumo" ? formResumo(S.editando)
        : S.sec === "encontro" ? formEncontro(S.editando) : formAviso(S.editando);
      ligarForm(corpo);
      return;
    }
    corpo.innerHTML = listaSecao();
    corpo.querySelectorAll("[data-novo]").forEach(b => b.onclick = () => { S.editando = novo(); desenhar(); window.scrollTo(0, alvo.offsetTop - 80); });
    corpo.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => {
      const x = S.sec === "encontro" ? D.encontros.find(e => e.id === b.dataset.editar) : D.posts.find(p => p.id === b.dataset.editar);
      S.editando = JSON.parse(JSON.stringify(x)); desenhar(); window.scrollTo(0, alvo.offsetTop - 80);
    });
    corpo.querySelectorAll("[data-apagar]").forEach(b => b.onclick = async () => {
      if (!confirm("Apagar de vez? Se estiver publicado, some da Comunidade para todos os alunos.")) return;
      const r = await cli.rpc("admin_comunidade_apagar", { p_tipo: S.sec === "encontro" ? "encontro" : "post", p_id: b.dataset.apagar });
      if (r.error) { console.warn(r.error); avisar("Não deu para apagar agora.", true); return; }
      await recarregar("Apagado.");
    });
  }

  function novo() {
    const h = hoje();
    if (S.sec === "plano") {
      const seg = segunda(h);
      return { tipo: "plano", para: "todos", dia: seg, titulo: "", publicado: false, dados: { meta: "", mensagem: "", dias: [] } };
    }
    if (S.sec === "resumo") return { tipo: "resumo", para: "todos", dia: somar(h, -1), titulo: "", publicado: false,
      dados: { mensagens: 0, duvidas: [{ pergunta: "", resposta: "", tema: "" }], vagas: [], avisos: [], conquistas: [] } };
    if (S.sec === "encontro") return { titulo: "", data: somar(h, 1), inicio: "20:00", fim: "21:00", onde: "", texto: "", tipo: "estudo", para: "todos", publicado: false };
    return { tipo: "aviso", para: "todos", dia: h, titulo: "", publicado: false, dados: { texto: "", link: "" } };
  }

  function listaSecao() {
    const sec = S.sec;
    const itens = sec === "encontro" ? (D.encontros || []).slice().sort((a, b) => b.data.localeCompare(a.data))
      : (D.posts || []).filter(p => sec === "aviso" ? (p.tipo === "aviso" || p.tipo === "material") : p.tipo === sec);
    const botao = { plano: "Novo plano da semana", resumo: "Novo resumo do dia", encontro: "Novo encontro", aviso: "Novo aviso ou material" }[sec];
    const ajuda = {
      plano: "A meta e um cartão para cada dia da semana. Os alunos veem o plano da semana em que estão.",
      resumo: "Dúvidas com a resposta da equipe, vagas citadas, avisos e conquistas do dia. Os 3 últimos ficam no alto da Comunidade e todos ficam guardados no fórum.",
      encontro: "Os alunos veem os encontros de hoje em diante e põem na Agenda do Meu Controle com um clique.",
      aviso: "Ficam guardados no fórum, com busca. Material pode ter um link.",
    }[sec];
    const titulo = x => sec === "encontro" ? x.titulo : x.tipo === "plano" ? (x.titulo || `Semana de ${ddmm(x.dia)} a ${ddmm(somar(x.dia, 6))}`)
      : x.tipo === "resumo" ? `Resumo de ${DSEM[dt(x.dia).getDay()].toLowerCase()}, ${ddmm(x.dia)}` : x.titulo;
    const sub = x => sec === "encontro" ? `${br(x.data)}${x.inicio ? ", " + x.inicio : ""}${x.onde ? " · " + x.onde : ""}`
      : x.tipo === "resumo" ? conta((x.dados.duvidas || []).length, "dúvida", "dúvidas") + " · " + conta((x.dados.vagas || []).length, "vaga", "vagas") : x.tipo === "plano" ? (x.dados.meta ? "Meta: " + x.dados.meta : "") : (x.tipo === "material" ? "Material" : "Aviso") + " · " + br(x.dia);
    return `<div class="pn-cx"><div class="pn-cab"><p class="pn-sub" style="max-width:640px">${ajuda}</p><button class="pn-bt forte" data-novo>+ ${botao}</button></div>
      ${itens.length ? `<div class="pn-rolagem"><table class="pn-t"><tr><th>Publicação</th><th>Para</th><th>Situação</th><th></th></tr>
        ${itens.map(x => `<tr><td class="forte">${esc(titulo(x))}<small>${esc(sub(x))}</small></td><td>${paraTag(x.para) || '<span class="pn-sub">Todos</span>'}</td><td>${estado(x)}</td>
          <td style="text-align:right;white-space:nowrap"><button class="pn-bt" data-editar="${esc(x.id)}">Editar</button> <button class="pn-lnk" data-apagar="${esc(x.id)}" style="color:#8E2233;margin-left:8px">apagar</button></td></tr>`).join("")}</table></div>`
        : `<p class="pn-vazio">Nada aqui ainda.</p>`}</div>`;
  }

  const rodapeForm = x => `<div class="pc-rodape">
      ${campo("Para quem", sel("para", PARA, x.para || "todos"))}
      <div class="pc-acoes"><button type="button" class="pn-bt" data-cancelar-pc>Cancelar</button>
        <button type="submit" class="pn-bt" data-salvar="rascunho">${x.publicado ? "Tirar do ar e salvar como rascunho" : "Salvar rascunho"}</button>
        <button type="submit" class="pn-bt forte" data-salvar="publicar">${x.publicado ? "Salvar e manter publicado" : "Publicar"}</button></div></div>`;

  /* plano da semana: os 7 dias saem da segunda escolhida; dia sem nada não aparece para o aluno */
  function formPlano(x) {
    const d = x.dados || {}, seg = ehData(x.dia) ? x.dia : segunda(hoje());
    const porData = {}; (d.dias || []).forEach(z => { if (z && z.data) porData[z.data] = z; });
    return `<form class="pn-cx pc-form" id="pcForm" novalidate><h2>${x.id ? "Editar" : "Novo"} plano da semana</h2>
      <div class="pc-grade">
        ${campo("Semana que começa na segunda", inp("dia", seg, 'type="date"'), false, "Mudou a data? Os dias embaixo acompanham.")}
        ${campo("Título", inp("titulo", x.titulo, `maxlength="160" placeholder="${ddmm(seg)} a ${ddmm(somar(seg, 6))}"`), false, "Opcional. Sem título, aparecem as datas.")}
        ${campo("Meta da semana", inp("meta", d.meta, 'maxlength="120" placeholder="2 candidaturas por aluno"'), true)}
        ${campo("Mensagem da equipe", area("mensagem", d.mensagem, 'maxlength="2000" rows="4" placeholder="Bom dia, pessoal! Essa semana o foco é..."'), true)}
      </div>
      <h3 class="pc-h3">Os dias</h3><p class="pn-sub" style="margin-top:-4px">Deixe em branco o dia que não tiver nada.</p>
      <div class="pc-dias">${[0, 1, 2, 3, 4, 5, 6].map(i => {
        const data = somar(seg, i), z = porData[data] || {};
        return `<div class="pc-dia" data-dia="${data}"><b>${DSEM[dt(data).getDay()]} <span>${ddmm(data)}</span></b>
          ${inp("d_titulo", z.titulo, 'maxlength="140" placeholder="O que fazer"')}
          ${area("d_texto", z.texto, 'maxlength="600" rows="3" placeholder="Explique em poucas frases"')}
          ${inp("d_quando", z.quando, 'maxlength="60" placeholder="20h, ao vivo · No seu horário"')}</div>`;
      }).join("")}</div>
      ${rodapeForm(x)}</form>`;
  }

  function formResumo(x) {
    const d = x.dados || {};
    const nomes = (D.config && D.config.nomes_equipe) || "";
    return `<form class="pn-cx pc-form" id="pcForm" novalidate><h2>${x.id ? "Editar" : "Novo"} resumo do dia</h2>
      <div class="pc-ia">
        <b>Montar o rascunho com a IA</b>
        <p class="pn-sub">Exporte a conversa do grupo no WhatsApp (Mais opções › Exportar conversa › Sem mídia) e escolha o arquivo .txt aqui. Só as mensagens do dia escolhido embaixo são usadas. Antes de sair do seu computador, cada nome vira "Pessoa 1", "Pessoa 2"..., os nomes da equipe viram "Equipe", e telefones e e-mails somem.</p>
        ${nomes.trim() ? "" : `<p class="pn-sub" style="color:#A85D24">Dica: em Aparência e acesso, escreva os nomes da equipe como aparecem no WhatsApp, para as respostas dela virem marcadas como da equipe.</p>`}
        <div class="pc-ia-linha"><label class="pn-bt" style="cursor:pointer">Escolher a conversa (.txt)<input type="file" accept=".txt,text/plain" data-ia-arquivo hidden></label>
          <span class="pn-sub" data-ia-estado>${esc(S.iaMsg)}</span></div>
      </div>
      <div class="pc-grade">
        ${campo("Dia resumido", inp("dia", x.dia, 'type="date"'))}
        ${campo("Mensagens nos grupos nesse dia", inp("mensagens", d.mensagens || "", 'type="number" min="0" step="1"'), false, "Opcional. A IA preenche sozinha.")}
      </div>
      <h3 class="pc-h3">Dúvidas com a resposta da equipe</h3>
      <p class="pn-sub" style="margin-top:-4px">O tema junta dúvidas parecidas de dias diferentes: quando o mesmo tema aparece em 2 resumos, ele vira pergunta frequente. Use sempre o mesmo jeito de escrever, como "w-8ben" ou "teste telus".</p>
      <div data-duvidas>${(d.duvidas && d.duvidas.length ? d.duvidas : [{}]).map(duvidaHtml).join("")}</div>
      <button type="button" class="pn-bt" data-mais-duvida style="margin-top:8px">+ Outra dúvida</button>
      <datalist id="pcTemas">${temas().map(t => `<option value="${esc(t)}">`).join("")}</datalist>
      <div class="pc-grade" style="margin-top:16px">
        ${campo("Vagas citadas", area("vagas", (d.vagas || []).join("\n"), 'rows="3" placeholder="TELUS Digital · Search Quality Rater (Brazil)"'), false, "Uma por linha: Empresa · Vaga.")}
        ${campo("Avisos", area("avisos", (d.avisos || []).join("\n"), 'rows="3"'), false, "Um por linha.")}
        ${campo("Conquistas", area("conquistas", (d.conquistas || []).join("\n"), 'rows="3" placeholder="3 alunos aprovados no teste da TELUS"'), false, "Uma por linha, sempre em número e sem nome.")}
      </div>
      <p class="pc-regra">Antes de publicar, confira: nenhum nome, telefone ou dado de aluno, e nada que não tenha sido dito no grupo.</p>
      ${rodapeForm(x)}</form>`;
  }
  const duvidaHtml = q => `<div class="pc-duvida">
      ${inp("q_pergunta", q.pergunta, 'maxlength="300" placeholder="A pergunta, como um aluno faria"')}
      ${area("q_resposta", q.resposta, 'maxlength="1200" rows="2" placeholder="A resposta da equipe"')}
      <div class="pc-duvida-pe">${inp("q_tema", q.tema, 'maxlength="40" list="pcTemas" placeholder="tema"')}<button type="button" class="pn-lnk" data-tirar-duvida style="color:#8E2233">tirar</button></div></div>`;
  function temas() {
    const m = {};
    (D.posts || []).filter(p => p.tipo === "resumo").forEach(p => (p.dados.duvidas || []).forEach(q => { const k = norm(q.tema); if (k) m[k] = q.tema.trim(); }));
    return Object.values(m).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function formEncontro(x) {
    return `<form class="pn-cx pc-form" id="pcForm" novalidate><h2>${x.id ? "Editar" : "Novo"} encontro</h2>
      <div class="pc-grade">
        ${campo("Título", inp("titulo", x.titulo, 'maxlength="120" required placeholder="Revisão de currículo em grupo"'), true)}
        ${campo("Dia", inp("data", x.data, 'type="date"'))}
        ${campo("Começa", inp("inicio", x.inicio, 'type="time"'))}
        ${campo("Termina", inp("fim", x.fim, 'type="time"'))}
        ${campo("Tipo na Agenda do aluno", sel("tipo", TIPOS_ENC, x.tipo || "estudo"))}
        ${campo("Onde", inp("onde", x.onde, 'maxlength="200" placeholder="Ao vivo, pelo link que a equipe manda no grupo"'), true, "Pode ser um link começando com https://.")}
        ${campo("O que vai acontecer", area("texto", x.texto, 'maxlength="1500" rows="4"'), true)}
      </div>${rodapeForm(x)}</form>`;
  }

  function formAviso(x) {
    const d = x.dados || {};
    return `<form class="pn-cx pc-form" id="pcForm" novalidate><h2>${x.id ? "Editar" : "Novo"} aviso ou material</h2>
      <div class="pc-grade">
        ${campo("Tipo", sel("tipo", [["aviso", "Aviso"], ["material", "Material"]], x.tipo))}
        ${campo("Dia", inp("dia", x.dia, 'type="date"'))}
        ${campo("Título", inp("titulo", x.titulo, 'maxlength="160" required'), true)}
        ${campo("Texto", area("texto", d.texto, 'maxlength="3000" rows="5"'), true)}
        ${campo("Link", inp("link", d.link, 'maxlength="500" placeholder="https://..."'), true, "Opcional. Só aparece se começar com https://.")}
      </div>${rodapeForm(x)}</form>`;
  }

  /* ── ler o formulário e gravar ── */
  function ligarForm(f) {
    const form = f.querySelector("#pcForm");
    form.querySelector("[data-cancelar-pc]").onclick = () => { S.editando = null; S.iaMsg = ""; desenhar(); };
    // plano: trocar a semana redesenha os dias, guardando o que já foi escrito
    const diaPlano = S.sec === "plano" && form.elements.dia;
    if (diaPlano) diaPlano.onchange = () => { S.editando = lerPlano(form, false); S.editando.dia = segunda(diaPlano.value || hoje()); desenhar(); };
    // resumo: dúvidas que entram e saem
    const caixa = form.querySelector("[data-duvidas]");
    if (caixa) {
      const ligarTirar = () => caixa.querySelectorAll("[data-tirar-duvida]").forEach(b => b.onclick = () => { b.closest(".pc-duvida").remove(); });
      form.querySelector("[data-mais-duvida]").onclick = () => { caixa.insertAdjacentHTML("beforeend", duvidaHtml({})); ligarTirar(); caixa.lastElementChild.querySelector("input").focus(); };
      ligarTirar();
      const arq = form.querySelector("[data-ia-arquivo]");
      // limpa a escolha para o mesmo arquivo poder ser escolhido de novo (por exemplo, depois de ligar a IA)
      if (arq) arq.onchange = () => { const f = arq.files[0]; arq.value = ""; resumirComIa(form, f); };
    }
    let modo = "rascunho";
    form.querySelectorAll("[data-salvar]").forEach(b => b.onclick = () => { modo = b.dataset.salvar; });
    form.onsubmit = async ev => {
      ev.preventDefault();
      const publicar = modo === "publicar";
      let item, rpc, nome;
      try {
        if (S.sec === "encontro") { item = lerEncontro(form); rpc = "admin_comunidade_encontro"; }
        else { item = S.sec === "plano" ? lerPlano(form, true) : S.sec === "resumo" ? lerResumo(form) : lerAviso(form); rpc = "admin_comunidade_post"; }
      } catch (e) { avisar(e.message, true); return; }
      item.publicado = publicar;
      nome = publicar ? "Publicado. Já aparece na Comunidade." : "Rascunho salvo. Os alunos ainda não veem.";
      form.querySelectorAll("button").forEach(b => b.disabled = true);
      const r = await cli.rpc(rpc, { p: item });
      if (r.error) { console.warn(r.error); form.querySelectorAll("button").forEach(b => b.disabled = false); avisar("Não deu para salvar agora. Confira a internet e tente de novo.", true); return; }
      S.editando = null; S.iaMsg = "";
      await recarregar(nome);
    };
  }
  const conta = (n, um, varios) => n + " " + (n === 1 ? um : varios);
  const val = (f, n) => (f.elements[n] ? f.elements[n].value : "").trim();
  function lerPlano(f, validar) {
    const dia = segunda(val(f, "dia") || hoje());
    const dias = [...f.querySelectorAll("[data-dia]")].map(el => ({ data: el.dataset.dia, titulo: el.querySelector('[name="d_titulo"]').value.trim(),
      texto: el.querySelector('[name="d_texto"]').value.trim(), quando: el.querySelector('[name="d_quando"]').value.trim() })).filter(z => z.titulo || z.texto || z.quando);
    const meta = val(f, "meta"), mensagem = val(f, "mensagem");
    if (validar && !meta && !mensagem && !dias.length) throw new Error("Escreva a meta, a mensagem ou pelo menos um dia.");
    return { id: S.editando.id || "", tipo: "plano", para: val(f, "para") || S.editando.para || "todos", dia, titulo: val(f, "titulo"), dados: { meta, mensagem, dias } };
  }
  function lerResumo(f) {
    const dia = val(f, "dia");
    if (!ehData(dia)) throw new Error("Escolha o dia do resumo.");
    const duvidas = [...f.querySelectorAll(".pc-duvida")].map(el => ({ pergunta: el.querySelector('[name="q_pergunta"]').value.trim(),
      resposta: el.querySelector('[name="q_resposta"]').value.trim(), tema: el.querySelector('[name="q_tema"]').value.trim() })).filter(q => q.pergunta || q.resposta);
    if (duvidas.some(q => !q.pergunta || !q.resposta)) throw new Error("Cada dúvida precisa da pergunta e da resposta.");
    const dados = { mensagens: Math.max(0, parseInt(val(f, "mensagens"), 10) || 0), duvidas, vagas: linhas(val(f, "vagas")), avisos: linhas(val(f, "avisos")), conquistas: linhas(val(f, "conquistas")) };
    if (!duvidas.length && !dados.vagas.length && !dados.avisos.length && !dados.conquistas.length) throw new Error("O resumo está vazio.");
    return { id: S.editando.id || "", tipo: "resumo", para: val(f, "para") || "todos", dia, titulo: "", dados };
  }
  function lerEncontro(f) {
    const titulo = val(f, "titulo"), data = val(f, "data");
    if (titulo.length < 2) throw new Error("Escreva o título do encontro.");
    if (!ehData(data)) throw new Error("Escolha o dia do encontro.");
    return { id: S.editando.id || "", titulo, data, inicio: val(f, "inicio"), fim: val(f, "fim"), onde: val(f, "onde"), texto: val(f, "texto"), tipo: val(f, "tipo") || "estudo", para: val(f, "para") || "todos" };
  }
  function lerAviso(f) {
    const titulo = val(f, "titulo"), dia = val(f, "dia");
    if (!titulo) throw new Error("Escreva o título.");
    if (!ehData(dia)) throw new Error("Escolha o dia.");
    return { id: S.editando.id || "", tipo: val(f, "tipo") || "aviso", para: val(f, "para") || "todos", dia, titulo, dados: { texto: val(f, "texto"), link: val(f, "link") } };
  }

  /* ── resumo com a IA: a conversa do dia, sem nomes, vai para a função do Supabase ── */
  /* Lê o .txt do WhatsApp (Android: "01/11/2026 20:15 - Nome: texto"; iPhone: "[01/11/2026, 20:15:03] Nome: texto")
     e devolve as mensagens do dia pedido, com os nomes trocados. */
  function prepararConversa(texto, dia, nomesEquipe) {
    const alvoDia = dia.slice(8, 10) + "/" + dia.slice(5, 7) + "/";
    const ano2 = dia.slice(2, 4), ano4 = dia.slice(0, 4);
    const re = /^‎?\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}:\d{2})(?::\d{2})?\]?\s*(?:-\s*)?([^:]{1,60}):\s([\s\S]*)$/;
    const equipe = new Set(linhas(String(nomesEquipe || "").replace(/,/g, "\n")).map(norm));
    const apelido = {}; let n = 0;
    const msgs = []; let atual = null;
    String(texto).split(/\r?\n/).forEach(l => {
      const m = l.match(re);
      if (m) {
        const dd = m[1].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/";
        const doDia = dd === alvoDia && (m[3] === ano4 || m[3] === ano2);
        const nome = m[5].trim();
        if (!doDia) { atual = null; return; }
        let quem = equipe.has(norm(nome)) ? "Equipe" : (apelido[norm(nome)] = apelido[norm(nome)] || "Pessoa " + (++n));
        atual = { hora: m[4], quem, texto: m[6] };
        msgs.push(atual);
      } else if (atual && l.trim()) atual.texto += "\n" + l;
    });
    const limpa = msgs.filter(x => !/^<?(m[ií]dia oculta|media omitted|arquivo de m[ií]dia oculto|mensagem apagada|this message was deleted|imagem ocultada|áudio ocultado)>?$/i.test(x.texto.trim()))
      .map(x => `${x.hora} ${x.quem}: ${x.texto}`.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]").replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[telefone]"));
    return { texto: limpa.join("\n"), mensagens: limpa.length, pessoas: n };
  }
  async function resumirComIa(form, arquivo) {
    if (!arquivo) return;
    const estadoEl = form.querySelector("[data-ia-estado]");
    const dia = val(form, "dia");
    if (!ehData(dia)) { avisar("Escolha primeiro o dia do resumo.", true); return; }
    let bruto = "";
    try { bruto = await arquivo.text(); } catch (e) { avisar("Não deu para ler o arquivo.", true); return; }
    const c = prepararConversa(bruto, dia, (D.config || {}).nomes_equipe);
    if (!c.mensagens) { estadoEl.textContent = `O arquivo não tem mensagens de ${br(dia)}. Confira o dia escolhido ou exporte de novo.`; return; }
    estadoEl.textContent = `Lendo ${c.mensagens} mensagens de ${c.pessoas} pessoas… pode levar até um minuto.`;
    S.editando = Object.assign({}, S.editando, { dia });
    const r = await cli.functions.invoke("resumir-grupo", { body: { texto: c.texto, dia, temas: temas() } });
    let corpo = r.data;
    if (r.error) {
      try { corpo = await r.error.context.json(); } catch (e) { corpo = null; }
      S.iaMsg = (corpo && corpo.erro) || "A IA ainda não está ligada ou não respondeu. Dá para fazer o resumo à mão, aqui embaixo.";
      estadoEl.textContent = S.iaMsg;
      return;
    }
    const res = corpo && corpo.resumo;
    if (!res) { estadoEl.textContent = "A IA não devolveu o resumo. Tente de novo ou faça à mão."; return; }
    S.editando = Object.assign({}, S.editando, { dia, dados: { mensagens: c.mensagens, duvidas: res.duvidas || [], vagas: res.vagas || [], avisos: res.avisos || [], conquistas: res.conquistas || [] } });
    S.iaMsg = `Rascunho pronto a partir de ${c.mensagens} mensagens. Revise tudo antes de publicar.`;
    desenhar();
  }

  /* ── aparência e acesso ── */
  function formConfig() {
    const c = D.config || {};
    return `<form class="pn-cx pc-form" id="pcConfig" novalidate><h2>Aparência e acesso</h2>
      <div class="pc-grade">
        ${campo("Nome da Comunidade", inp("nome", c.nome || "Comunidade HOD", 'maxlength="60"'), true)}
        <div class="pc-campo larga"><span>Foto da capa</span><div class="pc-img capa" data-ver="capa">${c.capa ? `<img src="${esc(c.capa)}" alt="">` : `<i class="pn-sub">sem foto: aparece um degradê azul</i>`}</div>
          <div class="pc-img-bts"><label class="pn-bt" style="cursor:pointer">Escolher foto<input type="file" accept="image/*" data-img="capa" hidden></label> <button type="button" class="pn-lnk" data-tirar-img="capa">tirar</button></div>
          <small>Depois de escolher, você arrasta a foto e aproxima para mostrar a parte que quiser. Quanto maior a foto, mais nítida fica a capa. Ela é gravada assim que você clica em Usar esta capa.</small></div>
        <div class="pc-campo"><span>Logo do curso</span><div class="pc-img logo" data-ver="logo">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : `<i class="pn-sub">sem logo: aparece a inicial do nome</i>`}</div>
          <div class="pc-img-bts"><label class="pn-bt" style="cursor:pointer">Escolher logo<input type="file" accept="image/*" data-img="logo" hidden></label> <button type="button" class="pn-lnk" data-tirar-img="logo">tirar</button></div>
          <small>Depois de escolher, você arrasta e ajusta o tamanho.</small></div>
        <div class="pc-campo"><span>Quem abre a Comunidade</span>
          <label class="pc-radio"><input type="radio" name="acesso" value="conta"${c.acesso !== "planos" ? " checked" : ""}> Todo mundo com conta no Hub</label>
          <label class="pc-radio"><input type="radio" name="acesso" value="planos"${c.acesso === "planos" ? " checked" : ""}> Só os planos Black e Pro</label>
          <small>Publicações marcadas "Só Black" ou "Só Pro" continuam só para aquele plano.</small></div>
        ${campo("Nomes da equipe no WhatsApp", area("nomes_equipe", c.nomes_equipe, 'rows="3" maxlength="600" placeholder="Lucas Hub&#10;Ana Equipe HOD"'), true,
          "Um por linha, do jeito que aparecem na conversa exportada. No resumo com IA, as mensagens deles viram \"Equipe\".")}
      </div>
      <div class="pc-acoes"><button class="pn-bt forte">Salvar</button></div></form>`;
  }
  /* ── editor da capa e da logo: arrastar, aproximar e ver como fica ──
     A imagem sai sempre recortada da foto original, no tamanho certo (nunca esticada a partir de uma
     versão pequena). Capa: 2400 x 430, o formato dela no computador; no celular ela é mais estreita e
     mostra só uma parte ("foco" diz qual). Logo: 480 x 480, e pode ser afastada até caber inteira. */
  const FORMATOS = {
    capa: { L: 2400, A: 430, cobrir: true, limite: 880000, nitida: 1300, razoavel: 900, nome: "a foto da capa", usar: "Usar esta capa" },
    logo: { L: 480, A: 480, cobrir: false, limite: 190000, nitida: 300, razoavel: 180, nome: "a logo", usar: "Usar esta logo" },
  };
  const CEL = 343 / 150;   // a capa no celular: 343 x 150 na tela
  function abrirImagem(arquivo) {
    return new Promise((ok, falha) => {
      const img = new Image(), url = URL.createObjectURL(arquivo);
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("Não deu para abrir essa imagem.")); };
      img.src = url;
    });
  }
  async function editarImagem(arquivo, qual) {
    const F = FORMATOS[qual], L = F.L, A = F.A, ehCapa = qual === "capa";
    const img = await abrirImagem(arquivo);
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // menor zoom: a capa fica toda coberta; a logo cabe inteira, com sobra branca se precisar
    const kMin = F.cobrir ? Math.max(L / iw, A / ih) : Math.min(L / iw, A / ih);
    const zMax = Math.max(4, 2 * Math.max(L / iw, A / ih) / kMin);
    const E = { z: 1, x: 0, y: 0, tom: false, foco: 50 };   // z: zoom sobre o mínimo; x, y: canto da foto no quadro
    const k = () => kMin * E.z;
    // a foto maior que o quadro não deixa buraco; a menor anda só por dentro dele
    const preso = (v, tam, quadro) => tam >= quadro ? Math.min(0, Math.max(quadro - tam, v)) : Math.max(0, Math.min(quadro - tam, v));
    const prender = () => { E.x = preso(E.x, iw * k(), L); E.y = preso(E.y, ih * k(), A); };
    E.x = (L - iw * k()) / 2; E.y = (A - ih * k()) / 2;
    // desenha o pedaço [vx, vx + vw] do quadro num canvas
    function pintar(g, w, h, vx, vw) {
      const f = w / vw;
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
      g.imageSmoothingQuality = "high";
      g.drawImage(img, (E.x - vx) * f, E.y * f, iw * k() * f, ih * k() * f);
      if (E.tom) {
        const gr = g.createLinearGradient(-vx * f, 0, (L - vx) * f, A * f);
        gr.addColorStop(0, "rgba(26,72,147,.62)"); gr.addColorStop(.55, "rgba(78,154,200,.34)"); gr.addColorStop(1, "rgba(231,201,160,.22)");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
    }
    const veu = document.createElement("div");
    veu.className = "pc-ed-veu";
    veu.innerHTML = `<div class="pc-ed${ehCapa ? "" : " logo"}" role="dialog" aria-modal="true" aria-label="Ajustar ${F.nome}">
      <h3>Ajustar ${F.nome}</h3>
      <p class="pn-sub">${ehCapa ? "Arraste a foto para escolher a parte que aparece. Use o zoom para aproximar."
        : "Arraste a logo para cima, para baixo ou para os lados. Use o zoom para aumentar ou diminuir: com o zoom no mínimo, a logo aparece inteira."}</p>
      ${ehCapa ? `<span class="pc-ed-rot">No computador</span>` : ""}
      <canvas class="pc-ed-tela${ehCapa ? "" : " logo"}" data-tela></canvas>
      <div class="pc-ed-linha">
        <label class="pc-ed-zoom">Zoom <input type="range" min="1" max="${zMax.toFixed(2)}" step="0.01" value="1" data-zoom></label>
        <button type="button" class="pn-lnk" data-centro>Centralizar</button>
        ${ehCapa ? `<label class="pc-radio"><input type="checkbox" data-tom> Pôr o tom azul do Hub por cima</label>` : ""}
      </div>
      <div class="pc-ed-nitidez" data-nitidez></div>
      ${ehCapa ? `<div class="pc-ed-cel">
        <div><span class="pc-ed-rot">No celular</span><canvas class="pc-ed-tela cel" data-cel></canvas></div>
        <label class="pc-ed-zoom">Parte que aparece no celular <input type="range" min="0" max="100" step="1" value="50" data-foco></label>
      </div>` : ""}
      <div class="pc-acoes"><button type="button" class="pn-bt" data-cancelar>Cancelar</button><button type="button" class="pn-bt forte" data-usar>${F.usar}</button></div>
    </div>`;
    document.body.appendChild(veu);
    const tela = veu.querySelector("[data-tela]"), cel = veu.querySelector("[data-cel]");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function medir() {
      const w = tela.clientWidth; tela.width = Math.round(w * dpr); tela.height = Math.round(w * A / L * dpr);
      if (cel) { const cw = cel.clientWidth; cel.width = Math.round(cw * dpr); cel.height = Math.round(cw / CEL * dpr); }
    }
    function nitidez() {
      // quantos pixels da foto original cobrem o quadro: com poucos, a imagem borra
      const px = L / k(), el = veu.querySelector("[data-nitidez]");
      el.className = "pc-ed-nitidez " + (px >= F.nitida ? "bom" : px >= F.razoavel ? "medio" : "ruim");
      el.textContent = px >= F.nitida ? "Boa nitidez." : px >= F.razoavel ? "Nitidez razoável. Com menos zoom ou uma imagem maior, fica melhor."
        : E.z > 1.05 ? "Vai ficar borrada com esse zoom. Diminua o zoom ou escolha uma imagem maior."
        : `Essa imagem é pequena para ${ehCapa ? "a capa" : "a logo"} e vai ficar borrada. Escolha uma imagem maior.`;
    }
    function desenhar() {
      pintar(tela.getContext("2d"), tela.width, tela.height, 0, L);
      if (cel) { const vw = A * CEL; pintar(cel.getContext("2d"), cel.width, cel.height, (L - vw) * E.foco / 100, vw); }
      nitidez();
    }
    medir(); desenhar();
    const aoMudarTamanho = () => { medir(); desenhar(); };
    window.addEventListener("resize", aoMudarTamanho);
    // arrastar (mouse e dedo)
    let arrasto = null;
    tela.addEventListener("pointerdown", ev => { arrasto = { px: ev.clientX, py: ev.clientY, x: E.x, y: E.y }; tela.setPointerCapture(ev.pointerId); });
    tela.addEventListener("pointermove", ev => {
      if (!arrasto) return;
      const f = L / tela.clientWidth;
      E.x = arrasto.x + (ev.clientX - arrasto.px) * f; E.y = arrasto.y + (ev.clientY - arrasto.py) * f;
      prender(); desenhar();
    });
    const soltar = () => { arrasto = null; };
    tela.addEventListener("pointerup", soltar); tela.addEventListener("pointercancel", soltar);
    // setas do teclado também mexem a imagem
    tela.tabIndex = 0;
    tela.addEventListener("keydown", ev => {
      const passo = L / 60, d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[ev.key];
      if (!d) return; ev.preventDefault(); E.x += d[0]; E.y += d[1]; prender(); desenhar();
    });
    // zoom mantendo o centro do quadro no mesmo ponto da foto
    const zoom = veu.querySelector("[data-zoom]");
    function zoomPara(z) {
      const cx = (L / 2 - E.x) / k(), cy = (A / 2 - E.y) / k();
      E.z = Math.min(zMax, Math.max(1, z));
      E.x = L / 2 - cx * k(); E.y = A / 2 - cy * k();
      prender(); zoom.value = E.z; desenhar();
    }
    zoom.oninput = () => zoomPara(+zoom.value);
    tela.addEventListener("wheel", ev => { ev.preventDefault(); zoomPara(E.z * (ev.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
    veu.querySelector("[data-centro]").onclick = () => { E.x = (L - iw * k()) / 2; E.y = (A - ih * k()) / 2; desenhar(); };
    const tom = veu.querySelector("[data-tom]"); if (tom) tom.onchange = () => { E.tom = tom.checked; desenhar(); };
    const foco = veu.querySelector("[data-foco]"); if (foco) foco.oninput = () => { E.foco = +foco.value; desenhar(); };
    return new Promise(ok => {
      const fim = valor => { window.removeEventListener("resize", aoMudarTamanho); document.removeEventListener("keydown", tecla); veu.remove(); ok(valor); };
      const tecla = ev => { if (ev.key === "Escape") fim(null); };
      document.addEventListener("keydown", tecla);
      veu.addEventListener("click", ev => { if (ev.target === veu) fim(null); });
      veu.querySelector("[data-cancelar]").onclick = () => fim(null);
      veu.querySelector("[data-usar]").onclick = () => {
        const c = document.createElement("canvas"); c.width = L; c.height = A;
        pintar(c.getContext("2d"), L, A, 0, L);
        for (const q of [0.9, 0.84, 0.76, 0.66]) {
          const d = c.toDataURL("image/jpeg", q);
          if (d.length <= F.limite) { fim({ imagem: d, foco: E.foco }); return; }
        }
        avisar("A imagem ficou pesada demais. Tente outra.", true);
      };
      veu.querySelector("[data-usar]").focus();
    });
  }
  function ligarConfig(f) {
    const form = f.querySelector("#pcConfig");
    // capa e logo são gravadas na hora, sem esperar o Salvar do formulário
    async function gravarImagem(qual, p, msg) {
      const r = await cli.rpc("admin_comunidade_config", { p });
      if (r.error) { console.warn(r.error); avisar("Não deu para gravar a imagem agora. Confira a internet e tente de novo.", true); return false; }
      D.config = Object.assign({}, D.config, p);
      const c = D.config;
      form.querySelector(`[data-ver="${qual}"]`).innerHTML = c[qual] ? `<img src="${c[qual]}" alt=""${qual === "capa" ? ` style="object-position:${c.capa_foco}% 50%"` : ""}>`
        : `<i class="pn-sub">${qual === "capa" ? "sem foto: aparece um degradê azul" : "sem logo: aparece a inicial do nome"}</i>`;
      avisar(msg);
      return true;
    }
    form.querySelectorAll("[data-img]").forEach(i => i.onchange = async () => {
      const qual = i.dataset.img, arq = i.files[0]; i.value = ""; if (!arq) return;
      try {
        const r = await editarImagem(arq, qual); if (!r) return;
        const p = { [qual]: r.imagem }; if (qual === "capa") p.capa_foco = r.foco;
        await gravarImagem(qual, p, qual === "capa" ? "Capa gravada. Já aparece na Comunidade." : "Logo gravada. Já aparece na Comunidade.");
      } catch (e) { avisar(e.message, true); }
    });
    form.querySelectorAll("[data-tirar-img]").forEach(b => b.onclick = () => {
      const qual = b.dataset.tirarImg;
      if (!(D.config || {})[qual]) return;
      if (!confirm(qual === "capa" ? "Tirar a foto da capa? No lugar dela aparece o degradê azul." : "Tirar a logo? No lugar dela aparece a inicial do nome.")) return;
      gravarImagem(qual, { [qual]: "" }, qual === "capa" ? "Capa tirada." : "Logo tirada.");
    });
    form.onsubmit = async ev => {
      ev.preventDefault();
      const p = { nome: val(form, "nome"), acesso: (form.querySelector('[name="acesso"]:checked') || {}).value || "conta", nomes_equipe: val(form, "nomes_equipe") };
      if (p.acesso === "planos" && (D.config || {}).acesso !== "planos"
          && !confirm("Só os alunos dos planos Black e Pro vão abrir a Comunidade. Quem está sem plano passa a ver um aviso. Continuar?")) return;
      const bt = form.querySelector(".forte"); bt.disabled = true;
      const r = await cli.rpc("admin_comunidade_config", { p });
      if (r.error) { console.warn(r.error); bt.disabled = false; avisar("Não deu para salvar agora.", true); return; }
      await recarregar("Salvo.");
    };
  }

  async function recarregar(msg) {
    try { await carregar(); } catch (e) { console.warn(e); avisar("Salvo, mas não deu para atualizar a lista. Clique em Atualizar.", true); return; }
    desenhar(); if (msg) avisar(msg);
  }

  const CSS = `
    .pc-topo { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:14px; }
    .pc-topo p { max-width:680px; }
    .pc-form h2 { margin-bottom:14px; }
    .pc-grade { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px 16px; }
    .pc-campo { display:flex; flex-direction:column; gap:6px; min-width:0; }
    .pc-campo.larga { grid-column:1 / -1; }
    .pc-campo > span { font-size:13px; font-weight:500; color:var(--ink-2); }
    .pc-campo > small { font-size:12px; color:var(--ink-3); line-height:1.45; }
    .pc-h3 { font-size:14px; font-weight:600; color:var(--ink); margin:20px 0 8px; }
    .pc-dias { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:10px; }
    .pc-dia { display:flex; flex-direction:column; gap:6px; border:1px solid var(--line-soft); border-radius:14px; padding:12px; background:var(--panel-2); }
    .pc-dia b { font-size:14px; color:var(--ink); } .pc-dia b span { font-weight:400; color:var(--ink-3); font-size:12.5px; }
    .pc-dia textarea { min-height:70px; }
    .pc-duvida { display:grid; gap:6px; border:1px solid var(--line-soft); border-radius:14px; padding:12px; background:var(--panel-2); margin-top:8px; }
    .pc-duvida-pe { display:flex; gap:10px; align-items:center; } .pc-duvida-pe input { max-width:240px; }
    .pc-ia { border:1.5px dashed #9DB8DE; background:var(--signal-suave); border-radius:14px; padding:14px 16px; margin-bottom:16px; display:grid; gap:8px; }
    .pc-ia b { font-size:14.5px; color:var(--ink); }
    .pc-ia-linha { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .pc-regra { margin-top:14px; font-size:13px; color:#7A4318; background:#FBF0E4; border:1px solid #F0DCC6; border-radius:12px; padding:9px 12px; }
    .pc-rodape { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-top:18px; padding-top:16px; border-top:1px solid var(--line-soft); }
    .pc-rodape .pc-campo { min-width:200px; }
    .pc-acoes { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; margin-top:14px; }
    .pc-rodape .pc-acoes { margin-top:0; }
    .pc-para { font-size:11.5px; font-weight:600; color:#5B4B9E; background:#F1EEF7; border:1px solid #DFD8EE; border-radius:99px; padding:2px 9px; white-space:nowrap; }
    .pc-img { border:1px dashed var(--line); border-radius:14px; background:var(--panel-2); display:grid; place-items:center; overflow:hidden; }
    .pc-img.capa { aspect-ratio:2400/430; max-height:220px; }
    .pc-ed-veu { position:fixed; inset:0; z-index:300; background:rgba(16,32,58,.5); display:grid; place-items:center; padding:16px; overflow:auto; }
    .pc-ed { background:var(--panel, #fff); border-radius:18px; padding:22px; width:min(980px, 100%); box-shadow:0 30px 60px -30px rgba(16,32,58,.6); }
    .pc-ed h3 { margin:0 0 4px; font-size:18px; color:var(--ink); }
    .pc-ed-rot { display:block; font-size:12px; font-weight:600; color:var(--ink-3); margin:14px 0 6px; }
    .pc-ed-tela { display:block; width:100%; aspect-ratio:2400/430; border-radius:14px; cursor:grab; touch-action:none; background:var(--panel-2); }
    .pc-ed-tela:active { cursor:grabbing; }
    .pc-ed.logo { width:min(520px, 100%); }
    .pc-ed-tela.logo { width:min(320px, 100%); aspect-ratio:1; margin:12px auto 0; border-radius:26px; box-shadow:0 0 0 1px var(--line); }
    .pc-ed-tela.cel { width:240px; aspect-ratio:343/150; border-radius:10px; cursor:default; }
    .pc-ed-linha, .pc-ed-cel { display:flex; align-items:flex-end; gap:12px 28px; flex-wrap:wrap; margin-top:12px; }
    .pc-ed-zoom { display:flex; align-items:center; gap:10px; font-size:13px; } .pc-ed-zoom input { width:200px; }
    .pc-ed-nitidez { margin-top:10px; font-size:13px; } .pc-ed-nitidez.bom { color:#2E7D4F; } .pc-ed-nitidez.medio { color:#A85D24; } .pc-ed-nitidez.ruim { color:#B3261E; font-weight:600; }
    .pc-ed .pc-acoes { margin-top:18px; } .pc-img.logo { width:120px; height:120px; }
    .pc-img img { width:100%; height:100%; object-fit:cover; } .pc-img.logo img { object-fit:contain; }
    .pc-img-bts { display:flex; align-items:center; gap:10px; }
    .pc-radio { display:flex; align-items:center; gap:8px; font-size:14px; color:var(--ink); cursor:pointer; }
    .pc-radio input { accent-color:var(--signal); }`;

  /* chamada pelo painel.html quando a aba abre */
  async function montar(caixa, cliente, aviso) {
    alvo = caixa; cli = cliente; avisar = aviso || avisar;
    if (!document.getElementById("pc-css")) { const s = document.createElement("style"); s.id = "pc-css"; s.textContent = CSS; document.head.appendChild(s); }
    alvo.innerHTML = `<p class="pn-vazio">Abrindo…</p>`;
    try { await carregar(); } catch (e) {
      console.warn(e);
      alvo.innerHTML = `<p class="pn-vazio">Não deu para abrir a Comunidade agora.${/function|does not exist|schema cache/i.test(e.message || "") ? " A parte do banco ainda não foi criada (banco/comunidade.sql)." : ""}</p>`;
      return;
    }
    desenhar();
  }
  async function atualizar() { if (!alvo || !cli) return; await recarregar(); }

  return { montar, atualizar, prepararConversa };
})();
