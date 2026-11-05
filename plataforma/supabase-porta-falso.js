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
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:12px;z-index:950;background:#10203A;color:#fff;font:500 12.5px/1.4 Geist,system-ui,sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 10px 30px -10px rgba(16,32,58,.6);max-width:calc(100% - 24px);text-align:center";
    b.innerHTML = 'Cópia de teste com dados de exemplo. Nada sai deste navegador. <a href="#" style="color:#BBD3F2" id="testeZerar">Recomeçar o exemplo</a>';
    document.body.appendChild(b);
    b.querySelector("#testeZerar").addEventListener("click", ev => {
      ev.preventDefault();
      [SESSAO, CONTAS, PERFIS, "hub-equipe", "hub-plano", "hub-controle:dono", "hub-perfil-prof-previa"].forEach(k => localStorage.removeItem(k));
      location.href = "index.html";
    });
  });
})();
