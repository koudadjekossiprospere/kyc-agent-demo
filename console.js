// Static replay of the KYC supervision console (app.py). Same texts, same routing rule, pre-computed reviews.
// Everything the visitor does stays in this tab's memory, as in the Streamlit demo.
(() => {
  const D = window.DEMO;
  const HUMAN_ACTIONS = ["approve", "request_documents", "reject"];
  const REC_COLOR = { approve: "green", request_documents: "orange", reject: "red", escalate: "violet" };
  const RISK_COLOR = { low: "green", medium: "orange", high: "red" };
  const S = {
    lang: "fr", run: Object.keys(D.runs)[0], paused: false, blind: false, tab: "queue", inner: "findings",
    pick: { queue: null, all: null }, comment: "", reason: "", warn: null, stopWarn: false, toast: "",
    timer: { id: null, start: 0 }, runs: {},
  };
  for (const k of Object.keys(D.runs)) S.runs[k] = { human: {}, events: [] };

  const t = () => D.T[S.lang];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  const badge = (color, text) => `<span class="badge ${color}">${esc(text)}</span>`;
  const stBadge = (s) => { const m = /^:(\w+)-badge\[(.*)\]$/.exec(s); return m ? badge(m[1], m[2]) : esc(s); };
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const pct = (x) => `${Math.round(x * 100)}%`;
  const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const money = (v) => (S.lang === "fr" ? `${v.toFixed(3).replace(".", ",")} $` : `$${v.toFixed(3)}`);
  const now = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };

  const results = () => D.runs[S.run];
  const human = () => S.runs[S.run].human;
  const events = () => S.runs[S.run].events;
  const applicant = (id) => { const f = D.applications[id].form; return `${f.first_name} ${f.last_name}`; };
  // The stop button sets an unreachable threshold, exactly like the Python console.
  const threshold = () => (S.paused ? Infinity : D.rules.auto_approval_min_confidence);
  const needsHuman = (d, thr) => !(d.recommendation === "approve" && d.risk_level === "low" && d.confidence >= thr
    && d.findings.every((f) => f.status === "ok"));
  const status = (id) => {
    const r = results()[id];
    if (!r) return "not_reviewed";
    if (human()[id]) return "human";
    return S.blind || needsHuman(r.agent.decision, threshold()) ? "waiting" : "auto_approved";
  };
  const statusLabel = (id) => (status(id) === "human" ? fmt(t().status.human, { action: t().rec[human()[id].action] }) : t().status[status(id)]);
  const event = (application, actor, name, detail, at, pv) => ({ at: at || now(), application, actor, event: name, detail: detail || "", policy_version: pv || D.version });
  const reviewEvent = (id, r) => event(id, "agent", r.decision.recommendation,
    `risk=${r.decision.risk_level} confidence=${r.decision.confidence.toFixed(2)} model=${r.model}`, r.reviewed_at, r.policy_version);

  function lists() {
    const reviewed = D.order.filter((i) => results()[i]);
    const decided = reviewed.filter((i) => human()[i]);
    const overrides = decided.filter((i) => HUMAN_ACTIONS.includes(results()[i].agent.decision.recommendation)
      && human()[i].action !== results()[i].agent.decision.recommendation);
    const queue = reviewed.filter((i) => status(i) === "waiting");
    return { reviewed, decided, overrides, queue };
  }

  // ---------- sidebar ----------
  function sidebar() {
    const T = t(), runKeys = Object.keys(D.runs);
    const model = Object.values(results())[0].agent.model;
    const radio = (name, value, label, checked) => `<label class="radio"><input type="radio" name="${name}" value="${value}"${checked ? " checked" : ""}><span>${esc(label)}</span></label>`;
    return `
      <fieldset><legend>Language / Langue</legend><div class="row">
        ${radio("lang", "en", "English", S.lang === "en")}${radio("lang", "fr", "Français", S.lang === "fr")}</div></fieldset>
      <div class="alert info">${esc(T.demo_notice)}</div>
      <fieldset><legend>${esc(T.demo_run)}</legend>
        ${runKeys.map((k) => radio("run", k, `${T.runs[k]} · ${fmt(T.reviewed_count, { n: Object.keys(D.runs[k]).length })}`, S.run === k)).join("")}</fieldset>
      <p><b>${esc(T.institution)}</b> · ${esc(D.institution)}<br><b>${esc(T.policy_version)}</b> · <code>${D.version}</code><br>
        <b>${esc(T.model)}</b> · <code>${esc(model)}</code></p>
      <p class="caption">${esc(S.paused ? T.paused_caption : fmt(T.threshold, { pct: pct(D.rules.auto_approval_min_confidence) }))}</p>
      <form class="form" data-form="stop"><b>${esc(T.kill_title)}</b>
        <label class="field" for="reason">${esc(T.kill_reason)}</label>
        <input type="text" id="reason" value="${esc(S.reason)}">
        <p></p><button class="btn wide" type="submit">${esc(S.paused ? T.resume : T.pause)}</button></form>
      ${S.stopWarn ? `<div class="alert warn">${esc(T.kill_reason_required)}</div>` : ""}
      <label class="switch"><input type="checkbox" id="blind"${S.blind ? " checked" : ""}><span>${esc(T.blind)}</span></label>
      <p class="caption">${esc(T.blind_help)}</p>
      <details class="policy"><summary>${esc(T.policy_view)}</summary><div>
        <p class="caption">${esc(fmt(T.policy_help, { id: D.institution_id }))}</p>${D.policy_html}
        <pre>${esc(JSON.stringify(D.rules, null, 2))}</pre></div></details>`;
  }

  // ---------- one application ----------
  function reviewView(id) {
    const T = t(), r = results()[id].agent, d = r.decision, u = r.usage;
    const tokens = u ? ` · ${thousands(u.input_tokens + u.output_tokens)} ${T.tokens}` : "";
    const cost = u && u.cost_usd !== null && u.cost_usd !== undefined ? ` · ${money(u.cost_usd)}` : "";
    const inner = [["findings", T.findings], ["trace", T.trace], ["data", T.data]];
    let panel = "";
    if (S.inner === "findings") {
      panel = d.findings.map((f) => `<p class="finding">${stBadge(T.badge[f.status])} <b>${esc(f.check)}</b> — ${esc(f.detail)}</p>`).join("")
        + (d.questions_for_reviewer.length ? `<p><b>${esc(T.questions)}</b></p><ul>${d.questions_for_reviewer.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : "");
    } else if (S.inner === "trace") {
      panel = r.trace.map((s) => `<p><code>${esc(s.tool)}(${esc(JSON.stringify(s.input))})</code></p><pre>${esc(s.output)}</pre>`).join("");
    } else {
      panel = `<pre>${esc(JSON.stringify(D.applications[id], null, 2))}</pre>`;
    }
    return `
      <p>${esc(T.recommendation)} ${badge(REC_COLOR[d.recommendation], T.rec[d.recommendation])} · ${esc(T.risk)}
        ${badge(RISK_COLOR[d.risk_level], T.risk_levels[d.risk_level])} · ${esc(T.confidence)} <b>${pct(d.confidence)}</b></p>
      <p class="caption">${esc(T.model)} <code>${esc(r.model)}</code> · ${esc(T.policy_version)} <code>${esc(r.policy_version)}</code> · ${Math.round(r.duration_s)} s${tokens}${cost}</p>
      <p><b>${esc(T.summary)}</b><br>${esc(d.summary)}</p>
      <div class="tabs" role="tablist">${inner.map(([k, label]) => `<button type="button" role="tab" data-inner="${k}" aria-selected="${S.inner === k}">${esc(label)}</button>`).join("")}</div>
      ${panel}`;
  }

  function caseView(id, editable) {
    const T = t(), hidden = editable && S.blind;
    if (editable && S.timer.id !== id) S.timer = { id, start: performance.now() }; // the review clock starts on opening
    let out = hidden ? `<div class="alert info">${esc(T.blind_notice)}</div><pre>${esc(JSON.stringify(D.applications[id], null, 2))}</pre>` : reviewView(id);
    if (editable) {
      out += `<h3>${esc(T.decide)}</h3><form class="form" data-form="decide" data-id="${id}">
        <label class="field" for="comment">${esc(T.comment)}</label><textarea id="comment">${esc(S.comment)}</textarea>
        <div class="actions">${HUMAN_ACTIONS.map((a) => `<button class="btn" type="submit" data-act="${a}">${esc(T.rec[a])}</button>`).join("")}</div></form>
        ${S.warn === id ? `<div class="alert warn">${esc(T.comment_required)}</div>` : ""}`;
    }
    return out;
  }

  function picker(options, key) {
    const T = t();
    if (!options.includes(S.pick[key])) S.pick[key] = options[0];
    const label = (i) => `${i} · ${applicant(i)}` + (S.blind ? "" : ` · ${T.rec[results()[i].agent.decision.recommendation]}`);
    return `<label class="field" for="pick-${key}">${esc(T.pick)}</label><select id="pick-${key}" data-pick="${key}">
      ${options.map((i) => `<option value="${i}"${i === S.pick[key] ? " selected" : ""}>${esc(label(i))}</option>`).join("")}</select>`;
  }

  // ---------- tabs ----------
  function queueTab(L) {
    const T = t();
    if (!L.reviewed.length) return `<div class="alert info">${esc(T.not_reviewed)}</div>`;
    if (!L.queue.length) return `<div class="alert ok">${esc(T.queue_empty)}</div>`;
    return picker(L.queue, "queue") + caseView(S.pick.queue, true);
  }

  function allTab(L) {
    const T = t(), c = T.cols;
    const rows = D.order.map((i) => {
      const d = results()[i] && results()[i].agent.decision;
      return `<tr><td>${i}</td><td>${esc(applicant(i))}</td><td>${d ? esc(T.rec[d.recommendation]) : ""}</td>
        <td>${d ? esc(T.risk_levels[d.risk_level]) : ""}</td><td>${d ? pct(d.confidence) : ""}</td><td>${esc(statusLabel(i))}</td></tr>`;
    }).join("");
    return `<div class="table"><table><thead><tr><th>${c.id}</th><th>${c.name}</th><th>${c.agent}</th><th>${c.risk}</th><th>${c.confidence}</th><th>${c.status}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>` + (L.reviewed.length ? picker(L.reviewed, "all") + caseView(S.pick.all, false) : "");
  }

  function perfTab(L) {
    const T = t();
    if (!L.reviewed.length) return `<div class="alert info">${esc(T.not_reviewed)}</div>`;
    const reviews = L.reviewed.map((i) => results()[i].agent);
    const judged = L.decided.filter((i) => HUMAN_ACTIONS.includes(results()[i].agent.decision.recommendation));
    const costs = reviews.map((r) => (r.usage ? r.usage.cost_usd : null));
    const measured = costs.every((c) => c !== null && c !== undefined);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const auto = L.reviewed.filter((i) => status(i) === "auto_approved").length;
    const metric = (label, value) => `<div class="metric"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
    let out = `<div class="metrics">${metric(T.p_auto, `${auto} / ${L.reviewed.length}`)}
      ${metric(T.p_override, judged.length ? pct(L.overrides.length / judged.length) : "–")}
      ${metric(T.p_failsafe, String(reviews.filter((r) => r.decision.fail_safe).length))}
      ${metric(T.p_duration, `${Math.round(sum(reviews.map((r) => r.duration_s)) / reviews.length)} s`)}
      ${metric(T.p_cost, measured ? money(sum(costs)) : T.not_measured)}
      ${metric(T.p_cost_avg, measured ? money(sum(costs) / costs.length) : T.not_measured)}`;
    const timed = L.decided.map((i) => human()[i]).filter((h) => h.review_seconds !== undefined);
    if (timed.length) {
      for (const [label, shown] of [[T.p_review_with, true], [T.p_review_without, false]]) {
        const secs = timed.filter((h) => h.with_agent === shown).map((h) => h.review_seconds);
        out += metric(label, secs.length ? `${Math.round(sum(secs) / secs.length)} s (${secs.length})` : "–");
      }
    }
    const c = T.perf_cols;
    const rows = L.reviewed.map((i) => {
      const r = results()[i].agent, u = r.usage;
      return `<tr><td>${i}</td><td>${esc(r.model)}</td><td>${esc(T.rec[r.decision.recommendation])}</td><td>${Math.round(r.duration_s)} s</td>
        <td>${u ? `${thousands(u.input_tokens)} / ${thousands(u.output_tokens)}` : esc(T.not_measured)}</td>
        <td>${u && u.cost_usd !== null ? money(u.cost_usd) : esc(T.not_measured)}</td></tr>`;
    }).join("");
    return out + `</div><p class="caption">${esc(T.perf_help)}</p><div class="table"><table><thead><tr><th>${c.id}</th><th>${c.model}</th>
      <th>${c.agent}</th><th>${c.duration}</th><th>${c.tokens}</th><th>${c.cost}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function auditTab() {
    const T = t(), c = T.audit_cols;
    const all = Object.entries(results()).map(([i, r]) => reviewEvent(i, r.agent)).concat(events())
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).reverse();
    if (!all.length) return `<div class="alert info">${esc(T.audit_empty)}</div>`;
    const keys = ["at", "application", "actor", "event", "detail", "policy_version"];
    return `<div class="table"><table><thead><tr>${keys.map((k) => `<th>${esc(c[k])}</th>`).join("")}</tr></thead>
      <tbody>${all.map((e) => `<tr>${keys.map((k) => `<td>${esc(e[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  // ---------- page ----------
  function render() {
    const T = t(), L = lists();
    document.documentElement.lang = S.lang;
    const metricRows = [[T.m_total, D.order.length], [T.m_reviewed, L.reviewed.length],
      [T.m_auto, L.reviewed.filter((i) => status(i) === "auto_approved").length], [T.m_waiting, L.queue.length],
      [T.m_human, L.decided.length], [T.m_overrides, L.overrides.length]];
    // Study mode keeps only the queue: the counters and the other tabs would reveal the agent's opinions.
    const tabs = S.blind ? [["queue", T.tab_queue]] : [["queue", T.tab_queue], ["all", T.tab_all], ["perf", T.tab_perf], ["audit", T.tab_audit]];
    if (!tabs.some(([k]) => k === S.tab)) S.tab = "queue";
    const panel = { queue: queueTab, all: allTab, perf: perfTab, audit: auditTab }[S.tab](L);
    const footer = S.lang === "fr"
      ? "Version web statique de la démo : les examens de l'agent ont été calculés à l'avance, avec Claude Opus 5.5 et avec Qwen 3.5 9B exécuté en local. Données entièrement fictives. Le code source de l'agent est privé."
      : "Static web version of the demo: the agent's reviews were computed in advance, with Claude Opus 5.5 and with Qwen 3.5 9B run locally. Entirely fictional data. The agent's source code is private.";
    document.getElementById("app").innerHTML = `<aside>${sidebar()}</aside><main>
      <h1>${esc(T.title)}</h1><p>${md(T.context)}</p><p class="caption">${esc(T.synthetic)}</p>
      ${S.paused ? `<div class="alert warn">${esc(T.paused_banner)}</div>` : ""}
      ${S.blind ? "" : `<div class="metrics">${metricRows.map(([l, v]) => `<div class="metric"><span>${esc(l)}</span><b>${v}</b></div>`).join("")}</div>`}
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${esc(l)}</button>`).join("")}</div>
      ${panel}<footer>${esc(footer)}</footer></main>${S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ""}`;
  }

  // ---------- interactions ----------
  const root = document.getElementById("app");
  const resetCase = () => { S.comment = ""; S.warn = null; };
  root.addEventListener("input", (e) => {
    if (e.target.id === "comment") S.comment = e.target.value;
    if (e.target.id === "reason") S.reason = e.target.value;
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.name === "lang") S.lang = el.value;
    else if (el.name === "run") { S.run = el.value; S.pick = { queue: null, all: null }; resetCase(); }
    else if (el.id === "blind") { S.blind = el.checked; resetCase(); }
    else if (el.dataset.pick) { S.pick[el.dataset.pick] = el.value; resetCase(); }
    else return;
    render();
  });
  root.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]"), inner = e.target.closest("[data-inner]");
    if (tab) { S.tab = tab.dataset.tab; render(); }
    if (inner) { S.inner = inner.dataset.inner; render(); }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.dataset.form === "stop") {
      if (!S.reason.trim()) { S.stopWarn = true; render(); return; }
      S.paused = !S.paused;
      events().push(event("-", "human", S.paused ? "auto_approval_paused" : "auto_approval_resumed", S.reason.trim()));
      S.reason = ""; S.stopWarn = false;
    } else if (form.dataset.form === "decide") {
      const id = form.dataset.id, action = e.submitter && e.submitter.dataset.act;
      if (!action) return;
      const hidden = S.blind, rec = results()[id].agent.decision.recommendation;
      // In study mode the reviewer cannot see the agent, so disagreeing with it needs no justification.
      if (!hidden && action !== rec && !S.comment.trim()) { S.warn = id; render(); return; }
      const timing = { review_seconds: Math.round((performance.now() - S.timer.start) / 1000), with_agent: !hidden };
      human()[id] = { action, comment: S.comment.trim(), at: now(), ...timing };
      const detail = [S.comment.trim(), `review_seconds=${timing.review_seconds} with_agent=${timing.with_agent ? "True" : "False"}`].filter(Boolean).join(" | ");
      events().push(event(id, "human", action, detail));
      resetCase(); S.timer = { id: null, start: 0 };
      S.toast = t().saved; setTimeout(() => { S.toast = ""; render(); }, 2500);
    }
    render();
  });
  render();
})();
