/* Malhas Acabadas v2 - encomenda > artigos > guias (HTML + JS + Supabase) */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ETAPAS = ["producao", "tinturaria", "estamparia", "entrega", "concluida"];
const NOMES = {
  producao: "1 · Produção", tinturaria: "2 · Tinturaria", estamparia: "3 · Estamparia",
  entrega: "4 · Entrega", concluida: "Concluída"
};
const CORES = {
  producao: "var(--producao)", tinturaria: "var(--tinturaria)", estamparia: "var(--estamparia)",
  entrega: "var(--entrega)", concluida: "var(--concluida)"
};

let encomendas = [];
let filtro = "ativas";
let atual = null;     // encomenda aberta
let artAtual = null;  // artigo aberto (null = novo)

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hoje = () => new Date().toISOString().slice(0, 10);
const fmtData = (d) => (d ? d.split("-").reverse().slice(0, 2).join("/") + "/" + d.slice(2, 4) : "—");

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2500);
}

/* ---------- Autenticação ---------- */
async function arrancar() {
  const { data } = await db.auth.getSession();
  mostrar(!!data.session);
  db.auth.onAuthStateChange((_e, s) => mostrar(!!s));
}
function mostrar(logado) {
  $("#login").classList.toggle("hidden", logado);
  $("#app").classList.toggle("hidden", !logado);
  if (logado) carregar();
}
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginErro").textContent = "";
  const { error } = await db.auth.signInWithPassword({
    email: $("#loginEmail").value.trim(), password: $("#loginPass").value
  });
  if (error) $("#loginErro").textContent = "Email ou palavra-passe incorretos.";
});
$("#btnSair").addEventListener("click", () => db.auth.signOut());

/* ---------- Dados ---------- */
async function carregar() {
  const { data, error } = await db.from("encomendas").select("*, artigos(*)").order("criado_em", { ascending: false });
  if (error) { toast("Erro a carregar: " + error.message); return; }
  data.forEach((e) => { e.artigos = (e.artigos || []).sort((a, b) => a.criado_em.localeCompare(b.criado_em)); });
  // ordena pela data pedida pelo cliente mais próxima (artigos não concluídos)
  const prox = (e) => e.artigos.filter((a) => a.estado !== "concluida" && a.data_pedida_cliente)
    .map((a) => a.data_pedida_cliente).sort()[0] || "9999";
  data.sort((a, b) => prox(a).localeCompare(prox(b)));
  encomendas = data;
  if (atual) atual = encomendas.find((e) => e.id === atual.id) || atual;
  desenhar();
  refrescarModal();
}

const idx = (a) => ETAPAS.indexOf(a.estado);
// a partir de que posição da etapa cada data já está "cumprida"
const FEITO_A_PARTIR = {
  data_prev_fim_malha: 1, data_prev_envio_tinturaria: 1,
  data_prev_rececao_tinturaria: 2, data_prev_rececao_estamparia: 3, data_prev_entrega_cliente: 4
};
const feitoCampo = (a, c) => idx(a) >= FEITO_A_PARTIR[c];
const feitoEntrega = (a) => idx(a) >= 4;
function atrasado(a, campo) {
  return !feitoCampo(a, campo) && a[campo] && a[campo] < hoje();
}
function foraDoPedido(a) {
  return !feitoEntrega(a) && a.data_pedida_cliente && a.data_prev_entrega_cliente && a.data_prev_entrega_cliente > a.data_pedida_cliente;
}
const artComAtraso = (a) => Object.keys(FEITO_A_PARTIR).some((c) => atrasado(a, c));
const encComAtraso = (e) => e.artigos.some(artComAtraso);

/* ---------- Lista ---------- */
function desenhar() {
  const arts = (e) => e.artigos;
  const ativa = (e) => !arts(e).length || arts(e).some((a) => a.estado !== "concluida");
  const concluida = (e) => arts(e).length > 0 && arts(e).every((a) => a.estado === "concluida");
  const naEtapa = (s) => (e) => s === "concluida" ? concluida(e) : arts(e).some((a) => a.estado === s);
  // filtro por cliente (a lista de clientes é construída a partir das encomendas)
  const selCli = $("#filtroCliente"), cliAtual = selCli.value;
  const clientes = [...new Set(encomendas.map((e) => e.cliente))].sort((a, b) => a.localeCompare(b, "pt"));
  selCli.innerHTML = `<option value="">Todos os clientes</option>` + clientes.map((c) => `<option>${esc(c)}</option>`).join("");
  selCli.value = clientes.includes(cliAtual) ? cliAtual : "";
  const base = selCli.value ? encomendas.filter((e) => e.cliente === selCli.value) : encomendas;
  const conta = (f) => base.filter(f).length;

  const tabs = [
    { id: "ativas", nome: "Ativas", cor: "#374151", f: ativa },
    ...ETAPAS.map((s) => ({ id: s, nome: NOMES[s], cor: CORES[s], f: naEtapa(s) }))
  ];
  $("#tabs").innerHTML = tabs.map((t) =>
    `<button class="tab ${filtro === t.id ? "ativo" : ""}" style="--c:${t.cor}" data-tab="${t.id}">${t.nome} (${conta(t.f)})</button>`).join("");

  const fTab = tabs.find((t) => t.id === filtro).f;
  const q = $("#pesquisa").value.trim().toLowerCase();
  const so = $("#soAtrasadas").checked;
  const lista = base.filter((e) => {
    if (!fTab(e)) return false;
    if (so && !encComAtraso(e)) return false;
    if (!q) return true;
    const txt = [e.numero, e.ref_cliente, e.cliente, ...e.artigos.flatMap((a) => [a.descricao, a.cor, a.malharia, a.tinturaria, a.estamparia])];
    return txt.some((v) => (v || "").toLowerCase().includes(q));
  });
  const ord = $("#ordem").value;
  const porNum = (a, b) => (a.numero || "").localeCompare(b.numero || "", "pt", { numeric: true });
  const proxPedida = (e) => e.artigos.filter((a) => a.estado !== "concluida" && a.data_pedida_cliente)
    .map((a) => a.data_pedida_cliente).sort()[0] || "9999";
  lista.sort(ord === "num_asc" ? porNum : ord === "pedida" ? (a, b) => proxPedida(a).localeCompare(proxPedida(b)) || porNum(a, b) : (a, b) => porNum(b, a));
  $("#lista").innerHTML = lista.length ? lista.map(cartao).join("") : `<div class="vazio">Sem encomendas.</div>`;
}

function passo(a, titulo, campo, cor) {
  const feito = feitoCampo(a, campo);
  const mau = atrasado(a, campo) || (campo === "data_prev_entrega_cliente" && foraDoPedido(a));
  return `<div class="passo ${feito ? "feito" : mau ? "atraso" : ""}" style="--c:${cor}"><b>${titulo}</b><span class="d">${fmtData(a[campo])}</span></div>`;
}

function rota(a) {
  const p = [`Malha: ${a.origem_malha === "subcontratada" ? esc(a.malharia || "subcontratada") : "interna"}`];
  p.push(`Tint.: ${esc(a.tinturaria || "—")}`);
  if (a.tem_estamparia) p.push(`Est.: ${esc(a.estamparia || "—")}`);
  return p.join(" → ");
}

function ondeEsta(a) {
  if (a.estado === "producao") return a.origem_malha === "subcontratada" ? (a.malharia || "Malha subcontratada") : "Malha interna";
  if (a.estado === "tinturaria") return a.tinturaria || "Tinturaria";
  if (a.estado === "estamparia") return a.estamparia || "Estamparia";
  if (a.estado === "entrega") return "A entregar ao cliente";
  return "Concluída";
}

function blocoArtigo(a) {
  const detalhe = [a.cor, a.quantidade_kg ? a.quantidade_kg + " kg" : ""].filter(Boolean).map(esc).join(" · ");
  return `<div class="art estado-${a.estado}" data-art="${a.id}">
    <div class="linha1"><span class="art-nome">${esc(a.descricao)}${detalhe ? ` <span class="muted">· ${detalhe}</span>` : ""}</span>
      <span class="badge">${NOMES[a.estado]}</span></div>
    <div class="rota">📍 ${rota(a)}</div>
    <div class="compacto ${artComAtraso(a) || foraDoPedido(a) ? "mau" : ""}">
      <span>📍 ${esc(ondeEsta(a))}</span>
      <span>Pedido ${fmtData(a.data_pedida_cliente)} · Entrega <b>${fmtData(a.data_prev_entrega_cliente)}</b>${artComAtraso(a) || foraDoPedido(a) ? " ⚠" : ""}</span>
    </div>
    <div class="passos">
      <div class="passo pedida"><b>Cliente quer</b><span class="d">${fmtData(a.data_pedida_cliente)}</span></div>
      ${passo(a, "Fim malha", "data_prev_fim_malha", "var(--producao)")}
      ${passo(a, "Envio tint.", "data_prev_envio_tinturaria", "var(--tinturaria)")}
      ${passo(a, "Receção tint.", "data_prev_rececao_tinturaria", "var(--tinturaria)")}
      ${a.tem_estamparia ? passo(a, "Receção estamp.", "data_prev_rececao_estamparia", "var(--estamparia)") : ""}
      ${passo(a, "Entrega", "data_prev_entrega_cliente", "var(--entrega)")}
    </div>
    ${a.estado !== "concluida" ? `<div class="rodape"><button class="btn small" data-avancar="${a.id}">Avançar etapa →</button></div>` : ""}
  </div>`;
}

function cartao(e) {
  // resumo: quantos artigos em cada etapa
  const chips = ETAPAS.map((s) => {
    const n = e.artigos.filter((a) => a.estado === s).length;
    return n ? `<span class="chip" style="--c:${CORES[s]}">${n} ${NOMES[s].replace(/^\d · /, "")}</span>` : "";
  }).join("");
  return `<div class="card ${encComAtraso(e) ? "tem-atraso" : ""}" data-id="${e.id}">
    <div class="card-head" data-enc="${e.id}">
      <div class="linha1"><span class="ref">${esc(e.numero)}${e.ref_cliente ? ` <span class="muted">· Ref. ${esc(e.ref_cliente)}</span>` : ""}</span>
        ${encComAtraso(e) ? `<span class="alerta">⚠ atraso</span>` : ""}</div>
      <div class="sub">${esc(e.cliente)} · ${e.artigos.length} artigo${e.artigos.length === 1 ? "" : "s"}</div>
      <div class="chips">${chips}</div>
    </div>
    ${e.artigos.length ? e.artigos.map(blocoArtigo).join("") : `<div class="vazio-art">Sem artigos – toque para adicionar.</div>`}
  </div>`;
}

$("#lista").addEventListener("click", (ev) => {
  const av = ev.target.closest("[data-avancar]");
  if (av) return avancar(av.dataset.avancar);
  const art = ev.target.closest("[data-art]");
  if (art) {
    const e = encomendas.find((x) => x.id === art.closest(".card").dataset.id);
    atual = e; return abrirArt(e.artigos.find((a) => a.id === art.dataset.art));
  }
  const card = ev.target.closest(".card");
  if (card) abrirEnc(encomendas.find((x) => x.id === card.dataset.id));
});

async function avancar(id) {
  const a = encomendas.flatMap((e) => e.artigos).find((x) => x.id === id);
  let i = ETAPAS.indexOf(a.estado) + 1;
  if (ETAPAS[i] === "estamparia" && !a.tem_estamparia) i++;
  const { error } = await db.from("artigos").update({ estado: ETAPAS[i] }).eq("id", id);
  if (error) return toast("Erro: " + error.message);
  toast("Passou para: " + NOMES[ETAPAS[i]]);
  carregar();
}

$("#pesquisa").addEventListener("input", desenhar);
$("#soAtrasadas").addEventListener("change", desenhar);
$("#filtroCliente").addEventListener("change", desenhar);
$("#ordem").addEventListener("change", desenhar);

/* ---------- Encomenda (cabeçalho) ---------- */
const formEnc = $("#formEnc");
const CAMPOS_ENC = ["numero", "ref_cliente", "cliente", "notas"];

function abrirEnc(e) {
  atual = e || null;
  formEnc.reset();
  $("#formErro").textContent = "";
  $("#modalTitulo").textContent = e ? "Encomenda " + e.numero : "Nova encomenda";
  if (e) CAMPOS_ENC.forEach((c) => formEnc[c].value = e[c] ?? "");
  $("#btnApagar").classList.toggle("hidden", !e);
  $("#artBox").classList.toggle("hidden", !e);
  $("#guiasBox").classList.toggle("hidden", !e);
  if (!$("#modal").open) $("#modal").showModal();
  if (e) { $("#guiaForm").data.value = hoje(); refrescarModal(); carregarGuias(); }
}
$("#btnNova").onclick = () => abrirEnc(null);
$("#btnFechar").onclick = () => $("#modal").close();

formEnc.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const dados = {};
  CAMPOS_ENC.forEach((c) => { const v = formEnc[c].value.trim(); dados[c] = v === "" ? null : v; });
  $("#btnGuardar").disabled = true;
  const novo = !atual;
  const q = novo ? db.from("encomendas").insert(dados).select().single()
                 : db.from("encomendas").update(dados).eq("id", atual.id).select().single();
  const { data, error } = await q;
  $("#btnGuardar").disabled = false;
  if (error) { $("#formErro").textContent = error.message; return; }
  toast("Guardado");
  atual = { ...data, artigos: [] };
  await carregar();
  if (novo) { abrirEnc(atual); abrirArt(null); } // segue logo para o 1.º artigo
  else $("#modal").close();
});

$("#btnApagar").onclick = async () => {
  if (!atual || !confirm("Apagar esta encomenda, os seus artigos e guias?")) return;
  const { error } = await db.from("encomendas").delete().eq("id", atual.id);
  if (error) return toast("Erro: " + error.message);
  atual = null; $("#modal").close(); toast("Apagada"); carregar();
};

/* artigos listados dentro da encomenda + select das guias */
function refrescarModal() {
  if (!atual || !$("#modal").open) return;
  $("#artLista").innerHTML = atual.artigos.length
    ? atual.artigos.map((a) => `<div class="art estado-${a.estado} clic" data-art="${a.id}">
        <div class="linha1"><span class="art-nome">${esc(a.descricao)}${a.cor ? ` <span class="muted">· ${esc(a.cor)}</span>` : ""}</span><span class="badge">${NOMES[a.estado]}</span></div>
        <div class="rota">📍 ${rota(a)}</div></div>`).join("")
    : `<p class="muted">Ainda sem artigos.</p>`;
  const sel = $("#guiaForm").artigo_id, v = sel.value;
  sel.innerHTML = `<option value="">Toda a encomenda</option>` +
    atual.artigos.map((a) => `<option value="${a.id}">${esc(a.descricao)}${a.cor ? " · " + esc(a.cor) : ""}</option>`).join("");
  sel.value = v || (atual.artigos.length === 1 ? atual.artigos[0].id : "");
}
$("#artLista").addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-art]");
  if (el) abrirArt(atual.artigos.find((a) => a.id === el.dataset.art));
});
$("#btnNovoArt").onclick = () => abrirArt(null);

/* ---------- Artigo ---------- */
const formArt = $("#formArt");
function ajustarCampos() {
  $("#lblMalharia").classList.toggle("hidden", formArt.origem_malha.value !== "subcontratada");
  $("#boxEstamparia").classList.toggle("hidden", !formArt.tem_estamparia.checked);
}
formArt.origem_malha.addEventListener("change", ajustarCampos);
formArt.tem_estamparia.addEventListener("change", ajustarCampos);

const CAMPOS_ART = ["descricao", "cor", "quantidade_kg", "data_pedida_cliente", "estado", "origem_malha", "malharia",
  "data_prev_fim_malha", "tinturaria", "data_prev_envio_tinturaria", "data_prev_rececao_tinturaria",
  "estamparia", "data_prev_rececao_estamparia", "data_prev_entrega_cliente", "notas"];

function abrirArt(a) {
  artAtual = a || null;
  formArt.reset();
  $("#artErro").textContent = "";
  $("#artTitulo").textContent = a ? "Artigo – " + a.descricao : "Novo artigo" + (atual ? " · enc. " + atual.numero : "");
  if (a) {
    CAMPOS_ART.forEach((c) => formArt[c].value = a[c] ?? "");
    formArt.tem_estamparia.checked = !!a.tem_estamparia;
  } else if (atual && atual.artigos.length) {
    // novo artigo: sugere a data pedida do artigo anterior (editável)
    formArt.data_pedida_cliente.value = atual.artigos[atual.artigos.length - 1].data_pedida_cliente ?? "";
  }
  $("#btnApagarArt").classList.toggle("hidden", !a);
  ajustarCampos();
  if (!$("#modalArt").open) $("#modalArt").showModal();
}
$("#btnFecharArt").onclick = () => $("#modalArt").close();

formArt.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const dados = {};
  CAMPOS_ART.forEach((c) => { const v = formArt[c].value; dados[c] = v === "" ? null : v; });
  dados.quantidade_kg = dados.quantidade_kg === null ? null : Number(dados.quantidade_kg);
  dados.tem_estamparia = formArt.tem_estamparia.checked;
  if (dados.origem_malha !== "subcontratada") dados.malharia = null;
  if (!dados.tem_estamparia) { dados.estamparia = null; dados.data_prev_rececao_estamparia = null; }
  if (dados.estado === "estamparia" && !dados.tem_estamparia) {
    $("#artErro").textContent = "Marque 'tem estamparia' ou escolha outro estado."; return;
  }
  $("#btnGuardarArt").disabled = true;
  const q = artAtual ? db.from("artigos").update(dados).eq("id", artAtual.id)
                     : db.from("artigos").insert({ ...dados, encomenda_id: atual.id });
  const { error } = await q;
  $("#btnGuardarArt").disabled = false;
  if (error) { $("#artErro").textContent = error.message; return; }
  toast("Artigo guardado");
  $("#modalArt").close();
  await carregar();
  if (!$("#modal").open) abrirEnc(atual); // veio do cartão: mostra a encomenda
});

$("#btnApagarArt").onclick = async () => {
  if (!artAtual || !confirm("Apagar este artigo?")) return;
  const { error } = await db.from("artigos").delete().eq("id", artAtual.id);
  if (error) return toast("Erro: " + error.message);
  $("#modalArt").close(); toast("Artigo apagado"); carregar();
};

/* ---------- Guias ---------- */
async function carregarGuias() {
  const { data, error } = await db.from("guias").select("*").eq("encomenda_id", atual.id).order("data", { ascending: false });
  if (error) { $("#guiasLista").textContent = error.message; return; }
  const nome = (id) => { const a = atual.artigos.find((x) => x.id === id); return a ? a.descricao : "Toda a encomenda"; };
  $("#guiasLista").innerHTML = data.length ? data.map((g) => `
    <div class="guia d-${g.destino}">
      <span><span class="tag">→ ${esc(g.destino)}</span><b>${esc(g.tipo === "remessa" ? "Remessa" : "Transporte")} ${esc(g.numero)}</b>
      · ${g.data.split("-").reverse().join("/")} · ${esc(nome(g.artigo_id))}${g.quantidade_kg ? " · " + g.quantidade_kg + " kg" : ""}${g.notas ? " · " + esc(g.notas) : ""}</span>
      <button class="btn small danger" data-gdel="${g.id}">✕</button>
    </div>`).join("") : `<p class="muted">Ainda sem guias.</p>`;
  document.querySelectorAll("[data-gdel]").forEach((b) => b.onclick = async () => {
    if (!confirm("Apagar esta guia?")) return;
    await db.from("guias").delete().eq("id", b.dataset.gdel); carregarGuias();
  });
}
$("#guiaForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const { error } = await db.from("guias").insert({
    encomenda_id: atual.id, artigo_id: f.artigo_id.value || null, tipo: f.tipo.value, destino: f.destino.value,
    numero: f.numero.value.trim(), data: f.data.value,
    quantidade_kg: f.quantidade_kg.value === "" ? null : Number(f.quantidade_kg.value),
    notas: f.notas.value.trim() || null
  });
  if (error) return toast("Erro: " + error.message);
  f.numero.value = ""; f.quantidade_kg.value = ""; f.notas.value = "";
  toast("Guia adicionada"); carregarGuias();
  await atualizarEstadoPorGuia(f.artigo_id.value, f.destino.value);
});

// Guia para tinturaria/estamparia => o(s) artigo(s) passa(m) automaticamente a essa etapa
// (só avança; nunca recua um artigo que já esteja mais adiante)
async function atualizarEstadoPorGuia(artigoId, destino) {
  if (destino !== "tinturaria" && destino !== "estamparia") return;
  const alvo = artigoId ? atual.artigos.filter((a) => a.id === artigoId) : atual.artigos;
  const ids = alvo.filter((a) => ETAPAS.indexOf(a.estado) < ETAPAS.indexOf(destino)).map((a) => a.id);
  if (!ids.length) return;
  const upd = destino === "estamparia" ? { estado: destino, tem_estamparia: true } : { estado: destino };
  const { error } = await db.from("artigos").update(upd).in("id", ids);
  if (error) return toast("Guia guardada, mas o estado não mudou: " + error.message);
  toast(`Estado → ${NOMES[destino]} (${ids.length} artigo${ids.length > 1 ? "s" : ""})`);
  await carregar();
}

/* ---------- Cópia de segurança ---------- */
$("#btnBackup").onclick = () => $("#modalBackup").showModal();
$("#btnFecharBackup").onclick = () => $("#modalBackup").close();

function descarregar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const carimbo = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1_$2");

async function lerTudo() {
  const out = {};
  for (const t of ["encomendas", "artigos", "guias"]) {
    let todos = [], de = 0;
    for (;;) { // o Supabase devolve no máximo 1000 linhas por pedido
      const { data, error } = await db.from(t).select("*").order("id").range(de, de + 999);
      if (error) throw new Error(t + ": " + error.message);
      todos = todos.concat(data);
      if (data.length < 1000) break;
      de += 1000;
    }
    out[t] = todos;
  }
  return out;
}

$("#btnExportJson").onclick = async () => {
  try {
    const d = await lerTudo();
    descarregar(`malhas_copia_${carimbo()}.json`,
      JSON.stringify({ app: "malhas-acabadas", versao: 2, criado_em: new Date().toISOString(), ...d }, null, 1), "application/json");
    toast(`Cópia guardada: ${d.encomendas.length} encomendas, ${d.artigos.length} artigos, ${d.guias.length} guias`);
  } catch (e) { toast("Erro: " + e.message); }
};

$("#btnExportCsv").onclick = () => {
  const cab = ["N.º Encomenda", "Ref. Cliente", "Cliente", "Artigo", "Cor", "Kg", "Estado", "Origem malha", "Malharia", "Tinturaria",
    "Estamparia", "Data pedida cliente", "Fim malha", "Envio tinturaria", "Receção tinturaria", "Receção estamparia", "Entrega", "Notas"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = [cab.map(q).join(";")];
  encomendas.forEach((e) => e.artigos.forEach((a) => linhas.push([
    e.numero, e.ref_cliente, e.cliente, a.descricao, a.cor, a.quantidade_kg, NOMES[a.estado], a.origem_malha, a.malharia, a.tinturaria,
    a.estamparia, a.data_pedida_cliente, a.data_prev_fim_malha, a.data_prev_envio_tinturaria, a.data_prev_rececao_tinturaria,
    a.data_prev_rececao_estamparia, a.data_prev_entrega_cliente, a.notas].map(q).join(";"))));
  descarregar(`malhas_${carimbo()}.csv`, "﻿" + linhas.join("\r\n"), "text/csv;charset=utf-8");
};

$("#ficheiroRestaurar").addEventListener("change", async (ev) => {
  const f = ev.target.files[0]; ev.target.value = "";
  if (!f) return;
  let d;
  try { d = JSON.parse(await f.text()); } catch { return toast("Ficheiro inválido."); }
  if (!Array.isArray(d.encomendas) || !Array.isArray(d.artigos) || !Array.isArray(d.guias)) return toast("Este ficheiro não é uma cópia desta app.");
  const subst = $("#restSubstituir").checked;
  const resumo = `${d.encomendas.length} encomendas, ${d.artigos.length} artigos e ${d.guias.length} guias`;
  if (!confirm(`Repor ${resumo}?` + (subst ? "\n\nATENÇÃO: tudo o que existe agora será apagado primeiro." : "\n\nRegistos com o mesmo ID serão substituídos pelos da cópia."))) return;
  const limpa = (r) => { const { criado_por, ...resto } = r; return resto; };
  try {
    if (subst) { // apagar encomendas apaga também artigos e guias (cascade)
      const { error } = await db.from("encomendas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error("apagar: " + error.message);
    }
    for (const [t, rows] of [["encomendas", d.encomendas], ["artigos", d.artigos], ["guias", d.guias]]) {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await db.from(t).upsert(rows.slice(i, i + 200).map(limpa), { onConflict: "id" });
        if (error) throw new Error(t + ": " + error.message);
      }
    }
    toast("Cópia reposta: " + resumo);
    $("#modalBackup").close();
    carregar();
  } catch (e) { toast("Erro ao repor: " + e.message); }
});

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

arrancar();
