/* SÓ NA CÓPIA DE TESTE: troca o Supabase por contas de mentira, guardadas
   só neste navegador. Não guarda senha nenhuma: qualquer senha entra numa
   conta de teste que já exista. Nada sai do navegador. */
(function () {
  const SESSAO = "sb-zrqucjktympnwilbvisw-auth-token";
  const CONTAS = "teste-porta-contas";
  const PERFIS = "teste-porta-perfis";
  const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) || padrao; } catch (e) { return padrao; } };
  const gravar = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const atraso = v => new Promise(r => setTimeout(() => r(v), 250));
  const erro = m => ({ data: { user: null, session: null }, error: { message: m } });

  function abrirSessao(u) {
    const s = { access_token: "teste-" + u.id, refresh_token: "teste", expires_at: Math.floor(Date.now() / 1000) + 30 * 86400, user: u };
    gravar(SESSAO, s);
    return s;
  }

  const auth = {
    async getSession() { return { data: { session: ler(SESSAO, null) }, error: null }; },
    async getUser() { const s = ler(SESSAO, null); return { data: { user: s && s.user }, error: null }; },
    async signUp({ email, options }) {
      const contas = ler(CONTAS, {});
      const k = String(email).toLowerCase();
      if (contas[k]) return atraso({ data: { user: { identities: [] }, session: null }, error: null });
      const u = { id: "teste-" + Math.random().toString(36).slice(2, 10), email: k, identities: [{}],
        user_metadata: Object.assign({}, (options && options.data) || {}) };
      contas[k] = u; gravar(CONTAS, contas);
      return atraso({ data: { user: u, session: abrirSessao(u) }, error: null });
    },
    async signInWithPassword({ email }) {
      const u = ler(CONTAS, {})[String(email).toLowerCase()];
      if (!u) return atraso(erro("Invalid login credentials"));
      return atraso({ data: { user: u, session: abrirSessao(u) }, error: null });
    },
    async updateUser({ data }) {
      const s = ler(SESSAO, null);
      if (!s) return erro("not logged");
      const contas = ler(CONTAS, {});
      const u = contas[s.user.email] || s.user;
      u.user_metadata = Object.assign({}, u.user_metadata, data || {});
      contas[u.email] = u; gravar(CONTAS, contas);
      s.user = u; gravar(SESSAO, s);
      return atraso({ data: { user: u }, error: null });
    },
    async signOut() { localStorage.removeItem(SESSAO); return { error: null }; },
    async resetPasswordForEmail() { return atraso({ data: {}, error: null }); },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
  };

  function consulta(tabela) {
    const filtros = {};
    let dados = null, modo = "select";
    const q = {
      select() { return q; }, order() { return q; }, range() { return q; }, limit() { return q; },
      eq(c, v) { filtros[c] = v; return q; },
      upsert(linha) { modo = "upsert"; dados = linha; return q; },
      insert(linha) { modo = "upsert"; dados = linha; return q; },
      update(linha) { modo = "upsert"; dados = linha; return q; },
      delete() { modo = "delete"; return q; },
      maybeSingle() { modo = modo === "select" ? "um" : modo; return q; },
      single() { return q.maybeSingle(); },
      then(ok, falha) { return Promise.resolve(rodar()).then(ok, falha); },
    };
    function rodar() {
      if (tabela !== "perfil_profissional") return modo === "um" ? { data: null, error: null } : { data: [], error: null };
      const perfis = ler(PERFIS, {});
      if (modo === "upsert") { (Array.isArray(dados) ? dados : [dados]).forEach(l => { perfis[l.user_id] = l; }); gravar(PERFIS, perfis); return { data: null, error: null }; }
      const l = perfis[filtros.user_id] || null;
      return modo === "um" ? { data: l, error: null } : { data: l ? [l] : [], error: null };
    }
    return q;
  }

  window.supabase = {
    createClient() {
      return {
        auth, from: consulta,
        rpc: async () => ({ data: null, error: null }),
        storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ data: null, error: null }),
          upload: async () => ({ data: null, error: { message: "Na cópia de teste não dá para enviar PDF." } }),
          createSignedUrl: async () => ({ data: null, error: { message: "Na cópia de teste não há PDF." } }) }) },
      };
    },
  };

  // aviso fixo no pé da página
  document.addEventListener("DOMContentLoaded", () => {
    const b = document.createElement("div");
    b.id = "faixaTeste";
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:12px;z-index:950;background:#10203A;color:#fff;font:500 12.5px/1.4 Geist,system-ui,sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 10px 30px -10px rgba(16,32,58,.6);max-width:calc(100% - 24px);text-align:center";
    b.innerHTML = '<span style="opacity:.75">Modelo</span> ' + [1,2].map(n => '<button data-modelo="' + n + '" style="font:600 12px Geist,system-ui;width:24px;height:24px;border-radius:50%;border:0;margin:0 1px;cursor:pointer;background:rgba(255,255,255,.14);color:#fff">' + n + '</button>').join('') + ' <b data-modelo-nome style="margin:0 12px 0 4px;font-weight:600"></b><span style="opacity:.75">Cor</span> ' + [['vidro','Vidro'],['papel','Papel'],['azul','Azul'],['noite','Noite']].map(c => '<button data-cor="' + c[0] + '" style="font:600 12px Geist,system-ui;height:24px;padding:0 10px;border-radius:999px;border:0;margin:0 1px;cursor:pointer;background:rgba(255,255,255,.14);color:#fff">' + c[1] + '</button>').join('') + ' <span style="opacity:.75;margin-left:10px">Conta</span> ' + [['nova','Nova'],['procurando','Procurando vaga'],['marina','Já trabalhando']].map(c => '<button data-conta-teste="' + c[0] + '" style="font:600 12px Geist,system-ui;height:24px;padding:0 10px;border-radius:999px;border:0;margin:0 1px;cursor:pointer;background:rgba(255,255,255,.14);color:#fff">' + c[1] + '</button>').join('') + ' <a href="#" style="color:#BBD3F2;margin-left:10px" id="testeZerar">Recomeçar</a>';
    document.body.appendChild(b);
    b.querySelector("#testeZerar").addEventListener("click", ev => {
      ev.preventDefault();
      [SESSAO, CONTAS, PERFIS, "hub-equipe", "hub-plano", "hub-controle:dono", "hub-perfil-prof-previa", "plat-exemplo-pronto", "plat-visitas", "plat-recentes", "plat-avisos", "plat-guia-oculto", "plat-tour-feito"].forEach(k => localStorage.removeItem(k));
      location.href = "index.html";
    });
  });
})();

/* o botão do modelo escolhido fica em destaque */
(function(){ const st = document.createElement("style"); st.textContent = '#faixaTeste button[aria-pressed="true"]{background:#fff!important;color:#10203A!important}@media(max-width:600px){#faixaTeste [data-modelo-nome]{display:none}#faixaTeste{white-space:nowrap;padding:6px 10px!important;overflow-x:auto;scrollbar-width:none}}'; document.head.appendChild(st); })();
