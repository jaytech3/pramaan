/* app.js — Pramaan UI. All decisions live in engine.js; this file only renders and wires events. */
(function () {
  const $ = id => document.getElementById(id);
  const E = window.MFEngine, C = window.MF_CORPUS;
  const app = $('app'), thread = $('thread'), scroll = $('scroll'), input = $('input'), form = $('form'), sendBtn = $('send');
  let ctx = {};                                   // conversation memory (last scheme, pending topic)
  let llm = { on: false, provider: 'gemini', key: '' };
  let busy = false;
  const selected = new Set();                     // schemes ticked for comparison

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const scrollDown = () => requestAnimationFrame(() => (scroll.scrollTop = scroll.scrollHeight));
  const shortUrl = u => decodeURIComponent(u).replace(/^https?:\/\/(www\.)?/, '').replace(/\?.*$/, m => m.length > 24 ? m.slice(0, 22) + '…' : m);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Riskometer gauge (SVG). SEBI's six levels drawn as arc segments; the needle points at the scheme's level. ── */
  function gauge(level, big) {
    const segs = [], N = 6, cx = 50, cy = 46, r = 36;
    for (let i = 0; i < N; i++) {
      const a0 = Math.PI - (i / N) * Math.PI, a1 = Math.PI - ((i + 1) / N) * Math.PI + 0.06;
      const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
      const lit = i < level ? ' lit' + (i >= 4 ? ' hot' : i >= 2 ? ' warn' : '') : '';
      segs.push(`<path class="seg${lit}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`);
    }
    const ang = Math.PI - ((level - 0.5) / N) * Math.PI;
    const nx = cx + (r - 10) * Math.cos(ang), ny = cy - (r - 10) * Math.sin(ang);
    return `<svg class="gauge${big ? ' big' : ''}" viewBox="0 0 100 56" role="img" aria-label="Riskometer: ${C.RISK_LEVELS[level - 1]}"><g>${segs.join('')}</g><line class="needle" x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"/><circle cx="${cx}" cy="${cy}" r="2.4" fill="var(--ink)"/><text x="6" y="55">Low</text><text x="72" y="55">V.High</text></svg>`;
  }

  /* ── Scheme explorer rail ── */
  function renderRail() {
    const list = $('scheme-list'); list.innerHTML = '';
    for (const s of Object.values(C.SCHEMES)) {
      const f = C.FACTS[s.key];
      const el = document.createElement('article'); el.className = 'scheme' + (selected.has(s.key) ? ' selected' : ''); el.dataset.key = s.key;
      el.innerHTML = `<div><div class="name">${esc(s.name)}</div><div class="cat">${esc(f.category)}</div></div>${gauge(f.risk)}
        <div class="facts"><div><small>TER Reg / Dir</small><b>${f.ter_regular} / ${f.ter_direct}</b></div><div><small>Exit load</small><b title="${esc(f.exit_load)}">${esc(f.exit_load.replace(/ within 1 year, nil after/, ' <1y').replace(/^Graded.*$/, 'Graded ≤6d').replace(/^15% of units free.*$/, '15% free, 1%'))}</b></div><div><small>Min SIP</small><b>${f.min_sip}</b></div></div>
        <div class="acts"><button class="btn ask" type="button">Ask about it</button><button class="btn cmp${selected.has(s.key) ? ' on' : ''}" type="button">${selected.has(s.key) ? 'Selected' : 'Compare'}</button></div>`;
      el.querySelector('.ask').onclick = () => { input.value = `Overview of ${s.name}`; input.focus(); autosize(); if (window.innerWidth <= 1100) setView('chat'); submit(input.value); };
      el.querySelector('.cmp').onclick = () => { selected.has(s.key) ? selected.delete(s.key) : selected.size < 5 && selected.add(s.key); renderRail(); };
      list.appendChild(el);
    }
    const bar = $('compare-bar'), go = $('compare-go');
    bar.classList.toggle('show', selected.size > 0);
    $('compare-text').textContent = selected.size < 2 ? `${selected.size} selected — pick ${2 - selected.size} more` : `${selected.size} schemes selected`;
    go.hidden = selected.size < 2;
    go.onclick = () => { const q = `Compare ${[...selected].map(k => C.SCHEMES[k].name).join(' and ')}`; selected.clear(); renderRail(); if (window.innerWidth <= 1100) setView('chat'); submit(q); };
  }

  /* ── Welcome ── */
  const EXAMPLES = ['Expense ratio of HDFC Flexi Cap Fund?', 'What is the lock-in of HDFC ELSS Tax Saver Fund?', 'How do I download my capital gains statement?'];
  EXAMPLES.forEach(q => $('examples').appendChild(chip(q)));
  $('stamp').textContent = `Sources verified ${C.UPDATED}`;
  function chip(text) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = text; b.onclick = () => submit(text); return b; }

  const orgs = {}; C.CHUNKS.forEach(ch => (orgs[ch.org] = (orgs[ch.org] || 0) + 1));
  $('corpus-stats').innerHTML = `<dt>Fund house</dt><dd>HDFC Mutual Fund</dd><dt>Schemes</dt><dd>${Object.keys(C.SCHEMES).length}</dd><dt>Facts</dt><dd>${C.CHUNKS.length}</dd><dt>Source pages</dt><dd>${Object.keys(C.URLS).length}</dd><dt>Published by</dt><dd>HDFC AMC · SEBI · AMFI</dd><dt>Verified</dt><dd>${C.UPDATED}</dd>`;

  /* ── Messages ── */
  function addUser(text) { const m = document.createElement('div'); m.className = 'msg user'; m.innerHTML = `<div class="bubble"></div>`; m.querySelector('.bubble').textContent = text; thread.appendChild(m); scrollDown(); }
  const avatar = () => `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="var(--teal)"/><path d="M18 33l9 9 19-20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  function addTyping() { const m = document.createElement('div'); m.className = 'msg bot'; m.innerHTML = `${avatar()}<div class="card"><div class="typing"><i></i><i></i><i></i></div></div>`; thread.appendChild(m); scrollDown(); return m; }

  const KIND = { fact: ['Verified fact', 'fact'], compare: ['Factual comparison', 'fact'], refuse_advice: ['No advice — facts only', 'warn'], refuse_performance: ['No returns or rankings', 'warn'], refuse_pii: ['Personal data discarded', 'danger'], out_of_scope: ['Outside my sources', 'warn'], not_found: ['Not in my sources', 'warn'], live_data: ['Live data — see official page', 'warn'], clarify: ['Which scheme?', ''], greeting: ['Welcome', ''] };

  async function addBot(res, viaLLM) {
    const m = document.createElement('div'); m.className = 'msg bot';
    const [label, cls] = KIND[res.intent] || ['', ''];
    const cardCls = res.intent === 'refuse_pii' ? 'card pii' : /^refuse|out_of_scope|not_found|live_data/.test(res.intent) ? 'card refuse' : 'card';
    let html = `${avatar()}<div class="${cardCls}"><div class="kind ${cls}">${label}${viaLLM ? ' · reworded' : ''}</div><p class="ans"></p>`;
    if (res.highlights) html += `<div class="hl">${res.highlights.map(h => h.key === 'risk' ? `<div class="tile risk">${gauge(h.level, false)}<div><small>${esc(h.label)}</small><b class="small">${esc(h.value)}</b></div></div>` : `<div class="tile"><small>${esc(h.label)}</small><b class="${/^[₹\d]/.test(h.value) && h.value.length <= 12 ? '' : 'small'}">${esc(h.value)}</b></div>`).join('')}</div>`;
    if (res.compare) {
      const cm = res.compare;
      html += `<div class="cmp"><table><thead><tr><th></th>${cm.schemes.map((k, i) => `<th>${esc(C.SCHEMES[k].name)}<a href="${cm.sources[i]}" target="_blank" rel="noopener">${esc(shortUrl(cm.sources[i]))}</a></th>`).join('')}</tr></thead><tbody>${cm.rows.map(r => `<tr><td>${esc(r.label)}</td>${r.values.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (res.citation) html += `<div class="cite"><div class="src"><a href="${res.citation.url}" target="_blank" rel="noopener"><svg><use href="#i-link"/></svg>${esc(res.citation.label)}</a><span class="url">${esc(shortUrl(res.citation.url))}</span></div><div class="tools"><button class="btn copy" type="button" title="Copy answer with source"><svg><use href="#i-copy"/></svg>Copy</button><a class="btn" href="${res.citation.url}" target="_blank" rel="noopener" title="Open source page"><svg><use href="#i-ext"/></svg>Open</a></div><span class="stamp">${esc(res.stamp)}</span></div>`;
    else if (res.intent === 'fact') html += `<div class="cite"><span class="stamp">${esc(res.stamp)}</span></div>`;
    html += `<div class="followups"></div></div>`;
    m.innerHTML = html;
    const f = m.querySelector('.followups'); (res.chips || []).slice(0, res.intent === 'clarify' ? 5 : 3).forEach(q => f.appendChild(chip(q)));
    const copy = m.querySelector('.copy'); if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(`${res.answer}\nSource: ${res.citation.url}\n${res.stamp}`); copy.innerHTML = 'Copied'; setTimeout(() => (copy.innerHTML = '<svg><use href="#i-copy"/></svg>Copy'), 1400); } catch (e) { copy.textContent = 'Select & copy'; } };
    thread.appendChild(m); scrollDown();
    // Typewriter reveal — the answer arrives like a considered reply, not a dump
    const p = m.querySelector('.ans');
    if (reduced || res.answer.length > 420) { p.textContent = res.answer; return; }
    const caret = document.createElement('span'); caret.className = 'caret'; p.appendChild(caret);
    const words = res.answer.split(' ');
    for (let i = 0; i < words.length; i++) { caret.before(document.createTextNode((i ? ' ' : '') + words[i])); if (i % 2 === 0) { await sleep(18); scrollDown(); } }
    caret.remove();
  }

  /* ── Proof panel ── */
  function renderProof(res) {
    $('proof-intent').textContent = '';
    const icon = t => /❌|asking/i.test(t) ? 'stop' : /✅/.test(t) ? 'ok' : 'info';
    $('trace').innerHTML = `<ol class="steps">${res.trace.map(t => `<li><span class="${icon(t.result)}">${icon(t.result) === 'ok' ? '✓' : icon(t.result) === 'stop' ? '!' : '·'}</span><div><b>${esc(t.step)}</b><span>${esc(t.result.replace(/[✅❌]\s?/g, ''))}</span></div></li>`).join('')}</ol>`;
    if (res.retrieved && res.retrieved.length && res.retrieved[0].score > 0) {
      const max = Math.max(...res.retrieved.map(h => h.score), 1);
      let html = `<div class="hits">${res.retrieved.map((h, i) => `<div class="hit${i === 0 ? ' top' : ''}"><code title="${esc(h.label)}">${esc(h.label)}</code><div class="bar"><i style="width:${Math.max(4, (h.score / max) * 100)}%"></i></div><small>${h.score.toFixed(1)}</small></div>`).join('')}</div>`;
      if (res.chunk) html += `<div class="excerpt"><b>Source excerpt · ${esc(res.chunk.org)}</b>${esc(res.chunk.answer)}</div>`;
      $('hits').innerHTML = html;
    } else $('hits').innerHTML = `<div class="empty">No sources needed — this was answered before looking anything up.</div>`;
  }

  /* ── Submit ── */
  async function submit(text) {
    text = (text || '').trim(); if (!text || busy) return;
    busy = true; sendBtn.disabled = true; input.value = ''; autosize();
    addUser(text);
    const typing = addTyping();
    await sleep(reduced ? 0 : 320 + Math.min(500, text.length * 5));
    let res = E.ask(text, ctx); ctx = res.context;
    let viaLLM = false;
    if (llm.on && llm.key && res.intent === 'fact') {
      try {
        const q = text.toLowerCase();
        const hits = E.retrieve(text, { schemes: E.detectSchemes(q), plan: null, topics: E.detectTopics(q), isConcept: false }, 3);
        const v = E.validateLLMAnswer(await callLLM(text, hits));
        if (v.ok) { const src = hits[Math.min(v.citeIndex, hits.length - 1)].doc; res = { ...res, answer: v.text, citation: { label: `${src.org} — ${src.scheme ? C.SCHEMES[src.scheme].name : src.id}`, url: src.url } }; viaLLM = true; res.trace.push({ step: 'Phrasing', result: `✅ Reworded by ${llm.provider === 'gemini' ? 'Gemini' : 'OpenAI'}; facts and source unchanged` }); }
        else res.trace.push({ step: 'Phrasing', result: `Reworded version didn't pass checks (${v.reason}) — showing the original` });
      } catch (e) { res.trace.push({ step: 'Phrasing', result: `Couldn't reach ${llm.provider} (${e.message}) — showing the original` }); }
    }
    typing.remove();
    renderProof(res);
    await addBot(res, viaLLM);
    busy = false; sendBtn.disabled = false; if (window.innerWidth > 860) input.focus();
  }

  async function callLLM(question, hits) {
    const { system, user } = E.buildLLMPrompt(question, hits);
    if (llm.provider === 'gemini') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(llm.key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0, maxOutputTokens: 200 } }) });
      if (!r.ok) throw new Error(`Gemini ${r.status}`); const j = await r.json(); return j.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llm.key}` }, body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0, max_tokens: 200, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`); const j = await r.json(); return j.choices?.[0]?.message?.content || '';
  }

  /* ── Voice input (Web Speech API, English-India) — hidden when the browser lacks it ── */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const mic = $('mic'); mic.hidden = false; let rec = null;
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true; rec.maxAlternatives = 1;
      mic.classList.add('on'); input.placeholder = 'Listening…';
      rec.onresult = e => { input.value = Array.from(e.results).map(r => r[0].transcript).join(''); autosize(); };
      rec.onend = () => { mic.classList.remove('on'); input.placeholder = 'Ask about a scheme… (press / to focus)'; rec = null; if (input.value.trim()) submit(input.value); };
      rec.onerror = () => { mic.classList.remove('on'); rec = null; };
      rec.start();
    };
  }

  /* ── Events ── */
  form.addEventListener('submit', e => { e.preventDefault(); submit(input.value); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input.value); } });
  input.addEventListener('input', autosize);
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } });
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(150, input.scrollHeight) + 'px'; }
  $('btn-reset').onclick = () => { ctx = {}; thread.querySelectorAll('.msg').forEach(m => m.remove()); $('trace').innerHTML = '<div class="empty">Ask a question to see how it was checked and where the answer came from.</div>'; $('hits').innerHTML = '<div class="empty">The closest official sources for your question appear here.</div>'; $('proof-intent').textContent = ''; input.focus(); };
  $('llm-switch').onclick = () => { llm.on = !llm.on; $('llm-switch').classList.toggle('on', llm.on); $('llm-form').classList.toggle('open', llm.on); $('mode-pill').textContent = llm.on ? 'on' : 'off'; };
  $('llm-provider').onchange = e => (llm.provider = e.target.value);
  $('llm-key').oninput = e => (llm.key = e.target.value.trim());
  function setView(v) { app.dataset.view = v; document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.view === v)); }
  document.querySelectorAll('.tabbar button').forEach(b => (b.onclick = () => setView(b.dataset.view)));

  // Sources modal
  $('btn-sources').onclick = () => { renderSources(); $('modal').classList.add('open'); };
  $('btn-close').onclick = () => $('modal').classList.remove('open');
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) $('modal').classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('modal').classList.remove('open'); });
  function renderSources() {
    const groups = { 'HDFC AMC · hdfcfund.com': [], 'SEBI · investor.sebi.gov.in': [], 'AMFI · amfiindia.com': [] };
    Object.values(C.URLS).forEach(u => { if (u.includes('hdfcfund')) groups['HDFC AMC · hdfcfund.com'].push(u); else if (u.includes('sebi')) groups['SEBI · investor.sebi.gov.in'].push(u); else groups['AMFI · amfiindia.com'].push(u); });
    $('src-sub').textContent = `${Object.keys(C.URLS).length} official pages · verified ${C.UPDATED}`;
    $('src-list').innerHTML = Object.entries(groups).map(([g, list]) => `<div class="src-group"><h4>${g} · ${list.length}</h4><ol>${list.map(u => `<li><a href="${u}" target="_blank" rel="noopener">${esc(decodeURIComponent(u))}</a></li>`).join('')}</ol></div>`).join('');
  }

  renderRail();
  if (window.innerWidth > 860) input.focus(); else input.placeholder = 'Ask about a scheme…';
})();
