/* SÓ NO TESTE: troca o Supabase por dados de exemplo no formato do banco (admin_painel). */
(function () {
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const dia = n => { const d = new Date(hoje); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pick = a => a[Math.floor(r() * a.length)];
  const nomes = ["Ana Beatriz Rocha", "Bruno Teixeira", "Camila Duarte", "Diego Fernandes", "Elisa Moura", "Felipe Antunes", "Gabriela Lins", "Henrique Prado",
    "Maria Eduarda Albuquerque Cavalcanti de Vasconcelos", "João Pedro Lima", "Larissa Gomes", "Marcos Vieira", "Natália Souza", "Otávio Freitas", "Paula Ribeiro"];
  const vagas = [["Alignerr", "Portuguese AI Trainer", "v1"], ["TELUS Digital", "Search Quality Rater (Brazil)", ""], ["micro1", "AI Trainer (Portuguese)", ""],
    ["Meridial", "Language Alignment Partner", ""], ["OneForma", "Transcrição de áudio", ""], ["Mercor", "Portuguese Language Expert", ""],
    ["Welocalize", "Project Cursa - Robot Manipulation Video Annotator (V2)", "aaf9c821e4"], ["Appen", "Coleta de voz PT-BR", ""]];
  const PDF = { caminho: "11111111-2222-3333-4444-555555555555/abc.pdf", nome: "CV-voz-2026.pdf", tamanho: 53952 };
  const alunos = nomes.map((nome, i) => {
    const id = "aluno-" + i, cand = [];
    const n = i === 13 ? 0 : 1 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) {
      const [empresa, titulo, vagaId] = vagas[(i + j * 3) % vagas.length];
      const estado = pick(["aplicado", "aplicado", "teste", "prova", "entrevista", "aprovado", "recusado", "recusado", "semresposta", "desisti", "banco"]);
      const data = dia(Math.floor(r() * 40));
      const ap = { empresa, titulo, vagaId, url: "https://exemplo.com/vaga/" + j, data, estado, origem: "Home Office Hub", email: "trabalho" + i + "@exemplo.com",
        remuneracao: r() < 0.5 ? "US$ 12/h" : "", curriculo: "CV voz 2026", proximo: estado === "entrevista" ? "Entrevista em inglês" : "", proximoEm: estado === "entrevista" ? dia(-2) : "",
        observacoes: r() < 0.5 ? "A recrutadora pediu exemplos de gravação." : "" };
      if (r() < 0.6) ap.curriculoPdf = PDF;
      if (r() < 0.7) { ap.passos = { aplicado: data }; if (["prova", "entrevista", "aprovado"].includes(estado)) { ap.passos.teste = "?"; } if (estado === "entrevista") ap.passos.entrevista = dia(1); if (estado === "aprovado") ap.passos.aprovado = dia(0); if (estado === "prova") ap.passos.prova = dia(2); }
      if (estado === "recusado") { ap.recusaEtapa = pick(["teste", "prova", "entrevista", "antes", ""]); ap.recusaMotivo = pick(["Inglês", "Diretrizes", "Tempo do teste", "Outros", "Não sei"]);
        if (ap.recusaMotivo === "Outros") ap.recusaMotivoOutro = "Pediram experiência com gravação"; ap.relato = "O teste era todo em inglês e não entendi algumas perguntas."; }
      if (estado === "semresposta") ap.relato = "Fiz o teste e não tive mais resposta.";
      if (i === 1 && j === 0) { ap.ordem = ["entrevista", "teste"]; }
      cand.push(Object.assign(ap, { id: id + "-c" + j, atualizado_em: data + "T10:00:00Z" }));
    }
    const trab = cand.filter(c => c.estado === "aprovado").map((c, k) => ({ id: id + "-t" + k, empresa: c.empresa, projeto: "Avaliação de respostas", estado: "ativo", inicio: c.data, ultimo_dia: dia(1) }));
    const plano = [0, 2, 7, 9].includes(i) ? "black" : [1, 4, 11].includes(i) ? "pro" : "";
    return { id, plano, plano_por: plano ? "Lucas" : "", plano_em: plano ? dia(10 + i) : "", tem_foto: i % 4 === 1, nome: i === 12 ? "" : nome, email: nome.split(" ")[0].toLowerCase() + i + "@exemplo.com", criado_em: dia(60) + "T10:00:00Z",
      perfil: i < 3 ? { telefone: "(31) 99876-5432", cidade: "Belo Horizonte, MG", ingles: "Avançado (C1)", foco: "Avaliação de IA", horas: "20 h por semana", obs: "Passou no teste da Alignerr." } : {},
      contatos: i % 3 === 0 ? [{ id: "k" + i, tipo: "Mensagem", texto: "Conversa de acompanhamento.", criado_em: dia(i % 10) + "T10:00:00Z", por: "Lucas" }] : [],
      candidaturas: cand, trabalhos: trab };
  });
  window.__chamadas = [];
  const espera = [{ email: "joana.lima@exemplo.com", plano: "black", por: "Lucas", criado_em: dia(3) + "T10:00:00Z" }];
  const porEmail = e => alunos.find(a => a.email.toLowerCase() === e);
  /* SÓ NO TESTE: a caixinha que simula a pessoa criando a conta com um e-mail que estava à espera */
  window.__simularConta = email => {
    const i = espera.findIndex(x => x.email === email); if (i < 0) return;
    const x = espera.splice(i, 1)[0];
    const nome = x.email.split("@")[0].split(/[._-]/).map(p => p[0].toUpperCase() + p.slice(1)).join(" ");
    alunos.push({ id: "novo-" + Date.now(), plano: x.plano, plano_por: x.por, plano_em: dia(0), tem_foto: false, nome, email: x.email, criado_em: new Date().toISOString(),
      perfil: {}, contatos: [], candidaturas: [], trabalhos: [] });
  };
  const RPC = {
    admin_painel: () => { window.__esperaAtual = espera.map(e => e.email); return { gerado_em: new Date().toISOString(), alunos, espera: espera.slice() }; },
    admin_plano_definir: a => { const x = alunos.find(y => y.id === a.p_aluno); x.plano = a.p_plano; x.plano_por = "Lucas"; x.plano_em = dia(0); return null; },
    admin_espera_cadastrar: a => { const x = porEmail(a.p_email); if (x) { x.plano = a.p_plano; x.plano_por = "Lucas"; x.plano_em = dia(0); return { ja_tem_conta: true, nome: x.nome || x.email }; }
      const i = espera.findIndex(e => e.email === a.p_email); if (i >= 0) espera.splice(i, 1);
      espera.push({ email: a.p_email, plano: a.p_plano, por: "Lucas", criado_em: new Date().toISOString() }); return { ja_tem_conta: false }; },
    admin_espera_tirar: a => { const i = espera.findIndex(e => e.email === a.p_email); if (i >= 0) espera.splice(i, 1); window.__esperaAtual = espera.map(e => e.email); return null; },
    painel_totais: () => ({ contas: { total: 15, novas_7d: 2, novas_30d: 6, ativas_30d: 9, ativas_7d: 4, confirmadas: 14 }, uso: { com_candidaturas: 14, com_trabalhos: 3, com_registros: 3 },
      trabalhos: { total: 4, ativos: 3 }, por_origem: [{ origem: "Home Office Hub", n: 30 }, { origem: "LinkedIn", n: 4 }], por_mes: [{ mes: "2026-10", n: 25 }, { mes: "2026-11", n: 9 }],
      contas_por_semana: [{ semana: "2026-10-26", n: 3 }] }),
    admin_equipe: () => ({ sou_dono: true, pessoas: [{ id: "eu", dono: true, eu: true, nome: "Lucas", email: "lucas@exemplo.com" }, { id: "p2", dono: false, eu: false, nome: "", email: "equipe2@exemplo.com" }] }),
    admin_perfil_salvar: () => null,
    admin_painel_fotos: () => Object.fromEntries(alunos.filter(x => x.tem_foto).map(x => [x.id, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAB/ElEQVR4nO2bwU0EMRAEfYjMyIA34fEmA9LgSQIkwcMSQpyOZu3pthdVfRHnmVLv7O4xXN7ePxrc5m51AbuDIAGCBAgSIEiAIAGCBAgSIEiAIAGCBAgSIEiAIAGCBPerC2itteeX11s/enp8SFZyzWXhF2a/eLlmlak1gg6p+U5e04IZNGxn8nfHSAua7zDsKCqoqreko5yg2q5ijkKCHP1kHCUE+ToJOLILcvfg/nxeNQReQZkxYT2FBAkQJDAKSj7O+c4iQQIECRAkQJAAQQIECRAkQJDAKCj5BbvvLBIkQJDAKyhzlVlPIUECuyB3iNyfn0iQr4fAJRy6xBydZAZcbgbV9hN7yIoO6aquko+g6bvYfG/hDZgFt/mZDvP7QWyYCVYK+oIdxRPDq4YAQYL1e9JyVK8dQ6wBC6KCCv+CHjMVEmRaLghosgsK7HhYNRkFhTe+TZpct/n8/wyYTrQIytvxnVsvaJUd0+mVM2itmh9UjaSyBG1lp9XVw7uYoEbQbvHplFRVIGhPO5352mYF7WynM1nhlKD97XRm6mRIC8YFnSU+neFqSZBgUNC54tMZq5kECUYEnTE+nYHKSZDgsKDzxqdztH4SJECQ4Jigs19fnUNdkCABggQIEhwQ9D8GUOfvvZAgAYIECBIgSIAgAYIECBIgSIAgwSc72rPR/scPegAAAABJRU5ErkJggg=="])),
    admin_contato_registrar: () => ({ id: "novo", criado_em: new Date().toISOString() }),
  };

  /* ── Comunidade (banco/comunidade.sql), guardada no navegador para o Painel e a página verem o mesmo ── */
  const CK = "falso-comunidade";
  const seg = (() => { const d = new Date(hoje); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
  const mais = n => { const d = new Date(seg + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const SEMENTE = () => ({
    config: { nome: "Comunidade HOD", capa: "", logo: "", acesso: "conta", nomes_equipe: "Lucas Hub\nAna Equipe" },
    posts: [
      { id: "p1", tipo: "plano", para: "todos", dia: seg, titulo: "", publicado: true, publicado_em: seg + "T11:00:00Z", dados: { meta: "2 candidaturas por aluno",
        mensagem: "Bom dia, pessoal! Essa semana o foco é passar nos testes de entrada. Vamos revisar as diretrizes com calma antes de abrir qualquer teste novo.",
        dias: [{ data: mais(0), titulo: "Revisar as diretrizes do teste de busca", texto: "Leia as seções 2 e 3 do material, com calma. Anote o que ficou confuso.", quando: "Material no Cursos" },
               { data: mais(1), titulo: "Simulado com tempo marcado", texto: "Faça o simulado de 40 minutos sem pausa e confira o gabarito.", quando: "No seu horário" },
               { data: mais(2), titulo: "Revisão de currículo em grupo", texto: "Traga o seu currículo em PDF. Vamos ver três por vez, ao vivo.", quando: "20h, ao vivo" },
               { data: mais(3), titulo: "Entrevista em inglês", texto: "As perguntas que mais caem e como falar da sua experiência sem travar.", quando: "20h30, ao vivo" },
               { data: mais(4), titulo: "Dúvidas sobre pagamento e W-8BEN", texto: "Mande a sua dúvida até quinta para entrar na lista.", quando: "19h, no grupo" }] } },
      { id: "p2", tipo: "resumo", para: "todos", dia: dia(3), publicado: true, publicado_em: dia(2) + "T11:00:00Z", dados: { mensagens: 168,
        duvidas: [{ pergunta: "O que é o W-8BEN e preciso preencher?", resposta: "É o formulário que informa que você não mora nos EUA. Quase toda plataforma pede antes do primeiro pagamento.", tema: "w-8ben" },
                  { pergunta: "O teste da TELUS tem prazo?", resposta: "Tem. O prazo vem no e-mail de convite. Comece com folga.", tema: "teste telus" }],
        vagas: ["TELUS Digital · Search Quality Rater (Brazil)"], avisos: ["Novo grupo de estudo das diretrizes, às quintas."], conquistas: ["2 alunos passaram no teste de entrada."] } },
      { id: "p3", tipo: "resumo", para: "black", dia: dia(2), publicado: true, publicado_em: dia(1) + "T11:00:00Z", dados: { mensagens: 121,
        duvidas: [{ pergunta: "Onde preencho o W-8BEN na Alignerr?", resposta: "No cadastro de pagamento, antes do primeiro saque. No número de identificação, use o CPF.", tema: "w-8ben" }],
        vagas: ["Alignerr · Portuguese AI Trainer"], avisos: [], conquistas: ["1 aluno começou um projeto novo."] } },
      { id: "p4", tipo: "resumo", para: "todos", dia: dia(1), publicado: true, publicado_em: dia(0) + "T11:00:00Z", dados: { mensagens: 147,
        duvidas: [{ pergunta: "Quanto tempo eu tenho para o teste da TELUS?", resposta: "O prazo vem no convite e costuma ser de poucos dias.", tema: "teste telus" },
                  { pergunta: "Posso usar tradutor no teste de escrita?", resposta: "Não é recomendado: o teste avalia a sua escrita.", tema: "tradutor" }],
        vagas: [], avisos: ["O encontro de quinta passou para 20h30."], conquistas: [] } },
      { id: "p5", tipo: "material", para: "todos", dia: dia(6), titulo: "Como preencher o W-8BEN, passo a passo", publicado: true, publicado_em: dia(6) + "T11:00:00Z",
        dados: { texto: "Onde encontrar o formulário em cada plataforma, o que pôr em cada campo e onde usar o CPF.", link: "https://exemplo.com/w8ben" } },
      { id: "p6", tipo: "aviso", para: "pro", dia: dia(4), titulo: "Plantão de dúvidas só para o Pro", publicado: true, publicado_em: dia(4) + "T11:00:00Z", dados: { texto: "Toda terça, 19h, no grupo do Pro.", link: "" } },
      { id: "p7", tipo: "aviso", para: "todos", dia: dia(0), titulo: "Rascunho que ainda não saiu", publicado: false, dados: { texto: "Não deve aparecer para os alunos.", link: "" } },
    ],
    encontros: [
      { id: "e1", titulo: "Revisão de currículo em grupo", data: mais(2), inicio: "20:00", fim: "21:00", onde: "https://meet.exemplo.com/hod", texto: "Traga o seu currículo em PDF.", tipo: "estudo", para: "todos", publicado: true },
      { id: "e2", titulo: "Mentoria só do Black", data: mais(3), inicio: "19:00", fim: "20:00", onde: "Ao vivo", texto: "Encontro fechado do plano Black.", tipo: "estudo", para: "black", publicado: true },
      { id: "e3", titulo: "Encontro que já passou", data: dia(10), inicio: "20:00", fim: "", onde: "", texto: "", tipo: "outro", para: "todos", publicado: true },
    ],
  });
  const C = () => { try { return JSON.parse(localStorage.getItem(CK)) || SEMENTE(); } catch (e) { return SEMENTE(); } };
  const salvarC = c => localStorage.setItem(CK, JSON.stringify(c));
  const quemVe = () => new URLSearchParams(location.search).get("plano") || localStorage.getItem("falso-plano") || "";
  Object.assign(RPC, {
    comunidade_ler: () => {
      const c = C(), plano = quemVe() === "sem" ? "" : quemVe();
      if (c.config.acesso === "planos" && !plano) throw { message: "A Comunidade é para os alunos dos planos Black e Pro.", code: "42501", hint: "sem_plano" };
      const pode = ["todos", plano];
      return { nome: c.config.nome, capa: c.config.capa, capa_foco: c.config.capa_foco, logo: c.config.logo, plano, equipe: false, membros: 128,
        time: [{ nome: "Lucas", foto: "", dono: true }, { nome: "Ana", foto: "", dono: false }],
        posts: c.posts.filter(p => p.publicado && pode.includes(p.para)).sort((a, b) => b.dia.localeCompare(a.dia)),
        encontros: c.encontros.filter(e => e.publicado && pode.includes(e.para) && e.data >= dia(0)).sort((a, b) => a.data.localeCompare(b.data)) };
    },
    admin_comunidade: () => { const c = C(); return { config: c.config, posts: c.posts.slice().sort((a, b) => b.dia.localeCompare(a.dia)), encontros: c.encontros }; },
    admin_comunidade_post: a => { const c = C(), p = a.p; const id = p.id || "p" + Date.now(); const velho = c.posts.find(x => x.id === id);
      const novo = Object.assign({}, p, { id, publicado_em: p.publicado ? ((velho && velho.publicado_em) || new Date().toISOString()) : null });
      c.posts = c.posts.filter(x => x.id !== id).concat([novo]); salvarC(c); return id; },
    admin_comunidade_encontro: a => { const c = C(), e = a.p; const id = e.id || "e" + Date.now(); c.encontros = c.encontros.filter(x => x.id !== id).concat([Object.assign({}, e, { id })]); salvarC(c); return id; },
    admin_comunidade_apagar: a => { const c = C(); c.posts = c.posts.filter(x => x.id !== a.p_id); c.encontros = c.encontros.filter(x => x.id !== a.p_id); salvarC(c); return null; },
    admin_comunidade_config: a => { const c = C(); Object.keys(a.p).forEach(k => { if (a.p[k] !== undefined) c.config[k] = a.p[k]; }); salvarC(c); return null; },
  });
  const cliente = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "eu", email: "lucas@exemplo.com", user_metadata: {} } } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    rpc: async (nome, args) => { window.__chamadas.push([nome, args]); if (window.__falhar === nome) return { data: null, error: { message: "falhou", code: "500" } };
      if (RPC[nome]) { try { return { data: RPC[nome](args), error: null }; } catch (e) { return { data: null, error: e }; } } return { data: null, error: { message: "Somente a administração.", code: "42501" } }; },
    storage: { from: () => ({ download: async c => { window.__baixou = c; return { data: await fetch("curriculo-exemplo.pdf").then(x => x.blob()), error: null }; } }) },
    from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    functions: { invoke: async (nome, op) => { window.__ia = op && op.body;
      if (localStorage.getItem("falso-ia") !== "ligada") return { data: null, error: { context: { json: async () => ({ erro: "A IA ainda não está ligada: falta guardar a chave da Anthropic no Supabase.", sem_chave: true }) } } };
      return { data: { resumo: { duvidas: [{ pergunta: "Como funciona o pagamento da Alignerr?", resposta: "O pagamento cai toda semana, depois que as horas são aprovadas.", tema: "pagamento" }],
        vagas: ["Alignerr · Portuguese AI Trainer"], avisos: ["Encontro de sexta às 19h."], conquistas: ["2 alunos aprovados no teste."] } }, error: null }; } },
  };
  window.supabase = { createClient: () => cliente };
})();

