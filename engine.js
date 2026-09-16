/**
 * engine.js — the "brain" of Pramaan.
 *
 * Pipeline for every user message (W1: think like a model → decide answer vs refuse):
 *   1. PII guard        → refuse & discard if PAN / Aadhaar / phone / email / OTP / account no. detected
 *   2. Intent gate      → advice / performance / out-of-scope / greeting / fact
 *   3. Entity detection → which scheme? which plan (direct/regular)? which topic?
 *   4. Retrieval (RAG)  → BM25 over the curated corpus + entity boosts (W3)
 *   5. Grounded answer  → ≤3 sentences, exactly ONE citation, "Last updated from sources" (W2)
 *
 * Works in the browser (window.MFEngine) and in Node (module.exports) so the same
 * code powers the UI and the eval script.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./corpus.js'));
  else root.MFEngine = factory(root.MF_CORPUS);
})(typeof self !== 'undefined' ? self : this, function (CORPUS) {
  const { SCHEMES, URLS, CHUNKS, EDUCATIONAL_LINKS, UPDATED, FACTS, FACT_LABELS, TOPIC_FACTS, RISK_LEVELS } = CORPUS;

  // ───────────────────────── 1. PII GUARD ─────────────────────────
  const PII_PATTERNS = [
    { name: 'PAN',            re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/ },
    { name: 'Aadhaar',        re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ },
    { name: 'phone number',   re: /(?:\+91[\s-]?)?\b[6-9]\d{9}\b/ },
    { name: 'email address',  re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/i },
    { name: 'OTP',            re: /\botp\b[^\d]{0,15}\d{4,8}\b|\b\d{4,8}\b[^\w]{0,10}\botp\b/i },
    { name: 'account number', re: /\b(?:a\/c|acc(?:ount)?|folio)\b[^\d]{0,15}\d{6,}\b|\b\d{11,18}\b/i },
  ];

  function detectPII(text) {
    for (const p of PII_PATTERNS) if (p.re.test(text)) return p.name;
    return null;
  }

  // ───────────────────────── 2. INTENT GATE ─────────────────────────
  const ADVICE_RE = /\b(should i|shall i|can i invest|is it (a )?good|is it safe|is it worth|worth (it|investing|buying)|recommend|suggest(ion)?s?|advice|advise|which (fund|scheme|one|plan) (is )?(better|best|good|should)|better (fund|option|than)|best (fund|scheme|elss|sip|option|performing|mutual)|top (fund|scheme|performing)|buy|sell|redeem now|exit now|switch (to|from)|good time|right time|invest in|start (a )?sip in|portfolio|allocat(e|ion)|how much should|where (should|to) invest|pick|choose|prefer|safe to|good for|suitable|suits? me|for me|right for|better|worse|best|ideal|which (one|fund|scheme)|opinion|think of|thoughts on|worth)\b/i;
  const PERFORMANCE_RE = /\b(return|returns|cagr|xirr|performance|performing|perform|growth rate|how much (will|would) (i|it)|profit|gain(s)? (will|would)|predict|forecast|outlook|target|nav (will|forecast|prediction|tomorrow|next)|beat|outperform|underperform|ranking|rank|rating|star|compare returns|1 ?year return|3 ?year return|5 ?year return|10 ?year return)\b/i;
  const OTHER_AMC_RE = /\b(sbi|axis|icici|nippon|mirae|kotak|parag parikh|ppfas|quant|motilal|uti|tata|aditya birla|absl|dsp|franklin|invesco|canara|sundaram|edelweiss|bandhan|whiteoak|zerodha|navi|360 one|bajaj finserv|helios|samco|jm financial|lic mf|pgim|union mf|mahindra manulife|baroda bnp|hsbc|trust mf|itI mf|shriram|taurus|nj mutual|old bridge|angel one|groww (mutual fund|mf|nifty|elss|liquid|large)|indiabulls)\b/i;
  const OFF_TOPIC_RE = /\b(stock|share price|crypto|bitcoin|fixed deposit|fd rate|ppf|nps|gold|real estate|insurance|ulip|loan|credit card|demat|ipo|nifty (today|level|prediction)|sensex)\b/i;
  const GREETING_RE = /^\s*(hi|hello|hey|namaste|hola|good (morning|afternoon|evening)|thanks?|thank you|ok|okay|cool|great)\b[\s!.]*$/i;
  const CONCEPT_RE = /\b(what is|what's|whats|what does|what are|meaning|means?|mean by|define|definition|explain|difference between|how does .* work|why (is|do|does)|how (do|can|to) (i )?(check|find|see|know|get|download|request)|where (to|can i|do i) (check|find|see|get|download))\b/i;

  // ───────────────────────── 3. ENTITY DETECTION ─────────────────────────
  const TOPIC_KEYWORDS = {
    expense_ratio:       ['expense ratio', 'expense', 'ter', 'total expense', 'charges', 'fees', 'fee', 'cost', 'costs', 'management fee'],
    exit_load:           ['exit load', 'exit', 'load', 'redemption charge', 'redemption fee', 'penalty', 'withdraw early', 'withdrawal charge'],
    minimum_investment:  ['minimum sip', 'min sip', 'sip amount', 'minimum investment', 'minimum amount', 'min amount', 'lumpsum', 'lump sum', 'how much to start', 'start with', 'minimum', 'least amount', 'smallest'],
    lock_in:             ['lock-in', 'lock in', 'lockin', 'locked', 'lock period', 'when can i withdraw', 'when can i redeem', 'withdraw before'],
    riskometer_benchmark:['riskometer', 'risk-o-meter', 'risk o meter', 'risk level', 'risk', 'benchmark', 'index', 'tri'],
    fund_manager:        ['fund manager', 'manager', 'who manages', 'managed by', 'aum', 'assets under management', 'fund size', 'inception', 'launch', 'launched', 'started', 'old'],
    tax_benefit:         ['tax benefit', '80c', 'section 80c', 'tax deduction', 'tax saving', 'save tax', 'deduction'],
    overview:            ['overview', 'about', 'what is hdfc', 'category', 'type of fund', 'invests in', 'objective', 'details', 'tell me about', 'info'],
    documents:           ['sid', 'kim', 'scheme information document', 'key information memorandum', 'offer document'],
    howto_statement:     ['account statement', 'statement', 'cas', 'consolidated'],
    howto_capital_gains: ['capital gain', 'capital gains', 'tax statement', 'itr', 'gains statement'],
    howto_factsheet:     ['factsheet', 'fact sheet', 'portfolio holdings', 'holdings'],
    concept_plans:       ['direct plan', 'regular plan', 'direct vs regular', 'direct or regular', 'regular vs direct', 'regular or direct', 'distributor', 'commission', 'direct and regular'],
  };
  const SCHEME_TOPICS = new Set(['expense_ratio', 'exit_load', 'minimum_investment', 'lock_in', 'riskometer_benchmark', 'fund_manager', 'tax_benefit', 'overview', 'documents']);
  // When the user asks a concept question ("what is X?"), map the detected topic to its SEBI/AMFI explainer chunk
  const CONCEPT_OF = { expense_ratio: 'concept_expense_ratio', exit_load: 'concept_exit_load', riskometer_benchmark: 'concept_riskometer', lock_in: 'concept_elss', tax_benefit: 'concept_elss', howto_statement: 'howto_statement', howto_capital_gains: 'howto_capital_gains' };

  function detectSchemes(q) {
    const found = [];
    for (const s of Object.values(SCHEMES)) {
      if (s.aliases.some(a => q.includes(a)) || q.includes(s.name.toLowerCase())) found.push(s.key);
    }
    // 'hybrid' also matches BAF alias; 'debt fund' matches liquid — fine, both are single-scheme categories here.
    return found;
  }
  function detectPlan(q) {
    if (/\bdirect\b/.test(q)) return 'direct';
    if (/\bregular\b/.test(q)) return 'regular';
    return null;
  }
  function detectTopics(q) {
    const scores = {};
    for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
      for (const kw of kws) {
        if (q.includes(kw)) scores[topic] = (scores[topic] || 0) + (kw.length > 5 ? 2 : 1);
      }
    }
    // Disambiguation: "risk" alone inside "riskometer" already counted; "index" in "index fund" not relevant here.
    return Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }

  // ───────────────────────── 4. RETRIEVAL (BM25) ─────────────────────────
  const SYNONYMS = {
    ter: 'expense', expenses: 'expense', fees: 'fee', charges: 'charge', cost: 'expense', costs: 'expense',
    'lock-in': 'lockin', lock: 'lockin', locked: 'lockin', lockin: 'lockin',
    redeem: 'redemption', redeemed: 'redemption', withdraw: 'redemption', withdrawal: 'redemption',
    'risk-o-meter': 'riskometer', riskometer: 'riskometer',
    min: 'minimum', least: 'minimum', smallest: 'minimum', lumpsum: 'lumpsum', 'lump-sum': 'lumpsum',
    elss: 'elss', taxsaver: 'elss', 'tax-saver': 'elss',
    flexicap: 'flexi', 'flexi-cap': 'flexi', largecap: 'large', 'large-cap': 'large',
    baf: 'balanced', statement: 'statement', statements: 'statement', cas: 'statement',
    manager: 'manager', managers: 'manager', managed: 'manager',
  };
  const STOP = new Set(['the', 'a', 'an', 'of', 'for', 'in', 'on', 'is', 'are', 'whats', "what's", 'to', 'i', 'my', 'me', 'do', 'does', 'it', 'its', 'and', 'or', 'can', 'please', 'tell', 'about', 'fund', 'hdfc', 'mutual', 'scheme', 'this', 'that', 'with', 'be', 'by', 'from', 'at']);

  function tokenize(text) {
    return text.toLowerCase()
      .replace(/₹/g, ' ')
      .replace(/[^a-z0-9%.\-\s]/g, ' ')
      .split(/\s+/)
      .map(t => t.replace(/^[.\-]+|[.\-]+$/g, ''))
      .filter(Boolean)
      .map(t => SYNONYMS[t] || t)
      .filter(t => !STOP.has(t));
  }

  // Build index once
  const DOCS = CHUNKS.map(ch => ({ ...ch, tokens: tokenize(ch.text + ' ' + ch.answer) }));
  const N = DOCS.length;
  const avgdl = DOCS.reduce((s, d) => s + d.tokens.length, 0) / N;
  const df = {};
  DOCS.forEach(d => new Set(d.tokens).forEach(t => (df[t] = (df[t] || 0) + 1)));
  const idf = t => Math.log(1 + (N - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5));

  function bm25(queryTokens, doc, k1 = 1.5, b = 0.75) {
    const tf = {};
    doc.tokens.forEach(t => (tf[t] = (tf[t] || 0) + 1));
    let score = 0;
    for (const t of queryTokens) {
      if (!tf[t]) continue;
      const num = tf[t] * (k1 + 1);
      const den = tf[t] + k1 * (1 - b + b * doc.tokens.length / avgdl);
      score += idf(t) * num / den;
    }
    return score;
  }

  function retrieve(question, ents, k = 3) {
    const qTokens = tokenize(question);
    const scored = DOCS.map(d => {
      let score = bm25(qTokens, d);
      // Entity boosts (this is what makes a tiny corpus feel precise)
      if (ents.schemes.length) {
        if (d.scheme && ents.schemes.includes(d.scheme)) score += 4;
        else if (d.scheme) score -= 6;               // wrong scheme → push down hard
        else if (ents.topics[0] && SCHEME_TOPICS.has(ents.topics[0])) score -= 2; // concept chunk when a scheme was named
      } else if (d.scheme && ents.isConcept) {
        score -= 3;                                  // "what is expense ratio" → prefer concept chunks
      }
      if (ents.topics.length) {
        if (d.topic === ents.topics[0]) score += 3;
        else if (ents.isConcept && CONCEPT_OF[ents.topics[0]] === d.topic) score += 4;
        else if (ents.topics.includes(d.topic)) score += 1;
      }
      return { doc: d, score: Math.round(score * 100) / 100 };
    }).sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  // ───────────────────────── 5. RESPONSE BUILDERS ─────────────────────────
  const DISCLAIMER = 'Facts-only. No investment advice.';
  const stamp = () => `Last updated from sources: ${UPDATED}`;
  const schemeChips = topic => Object.values(SCHEMES).map(s => `${humanTopic(topic)} of ${s.name}`);
  function humanTopic(t) {
    return ({ expense_ratio: 'Expense ratio', exit_load: 'Exit load', minimum_investment: 'Minimum SIP', lock_in: 'Lock-in', riskometer_benchmark: 'Riskometer & benchmark', fund_manager: 'Fund manager', tax_benefit: 'Tax benefit', overview: 'Overview', documents: 'SID', howto_statement: 'Account statement', howto_capital_gains: 'Capital gains statement', howto_factsheet: 'Factsheet', concept_plans: 'Direct vs regular plan', concept_expense_ratio: 'Expense ratio', concept_exit_load: 'Exit load', concept_riskometer: 'Riskometer', concept_elss: 'ELSS', concept_mf: 'Mutual funds' })[t] || 'Details';
  }

  function refuse(kind, ents) {
    if (kind === 'pii') return {
      intent: 'refuse_pii',
      answer: `For your safety I don't accept or store personal details like PAN, Aadhaar, phone numbers, emails, OTPs or account numbers — I've discarded that message. Please ask your question without any personal identifiers.`,
      citation: null, chips: ['Expense ratio of HDFC Flexi Cap Fund', 'How to download my account statement?'],
    };
    if (kind === 'advice') return {
      intent: 'refuse_advice',
      answer: `I only share verified facts about mutual fund schemes and can't tell you what to buy, sell, hold or prefer. For a neutral explainer on how to evaluate schemes yourself, see SEBI's investor guide below.`,
      citation: EDUCATIONAL_LINKS.advice, chips: ['Exit load of HDFC ELSS Tax Saver Fund', 'What is a riskometer?', 'Direct vs regular plan difference'],
    };
    if (kind === 'performance') return {
      intent: 'refuse_performance',
      answer: `I don't compute, compare or predict returns or rankings. Official, up-to-date performance data for every HDFC scheme is in the monthly factsheet linked below.`,
      citation: EDUCATIONAL_LINKS.performance, chips: ['Benchmark of HDFC Large Cap Fund', 'Expense ratio of HDFC Balanced Advantage Fund'],
    };
    if (kind === 'out_of_scope') return {
      intent: 'out_of_scope',
      answer: `That's outside my knowledge base. I currently cover only five HDFC Mutual Fund schemes — Flexi Cap, Large Cap, ELSS Tax Saver, Balanced Advantage and Liquid — plus general SEBI/AMFI concepts like expense ratio, exit load, riskometer and account statements.`,
      citation: null, chips: ['Overview of HDFC Flexi Cap Fund', 'What is exit load?', 'How to get a capital gains statement?'],
    };
    if (kind === 'not_found') return {
      intent: 'not_found',
      answer: `I couldn't find that fact in my verified sources, so I'd rather not guess. Try one of the questions below, or rephrase with the scheme name and the specific fact you need (expense ratio, exit load, minimum SIP, lock-in, riskometer, benchmark, statements).`,
      citation: null, chips: ['Minimum SIP of HDFC Liquid Fund', 'Lock-in of HDFC ELSS Tax Saver Fund', 'What is a Consolidated Account Statement?'],
    };
    if (kind === 'greeting') return {
      intent: 'greeting',
      answer: `Hello! Ask me anything factual about five HDFC Mutual Fund schemes — expense ratio, exit load, minimum SIP, lock-in, riskometer, benchmark or statements. I answer from official sources and link to them.`,
      citation: null, chips: ['Expense ratio of HDFC Flexi Cap Fund', 'ELSS lock-in period?', 'How to download capital gains statement?'],
    };
    if (kind === 'clarify') return {
      intent: 'clarify',
      answer: `Happy to help — which scheme do you mean? I cover HDFC Flexi Cap, Large Cap, ELSS Tax Saver, Balanced Advantage and Liquid Fund. Tap one below.`,
      citation: null, chips: schemeChips(ents.topics[0]),
    };
  }

  // ───────────────────────── MAIN ENTRY ─────────────────────────
  /**
   * @param {string} question
   * @param {object} context  { lastScheme, pendingTopic }  — lightweight conversation memory
   * @returns {object} { intent, answer, citation, updated, trace, chips, retrieved, context }
   */
  function ask(question, context = {}) {
    const raw = (question || '').trim();
    const q = raw.toLowerCase();
    const trace = [];
    const ctx = { ...context };

    // 1. PII
    const pii = detectPII(raw);
    trace.push({ step: 'Personal data check', result: pii ? `❌ A ${pii} was found — message discarded, nothing stored` : '✅ None found' });
    if (pii) return finish(refuse('pii'), trace, [], ctx);

    // 2. Intent
    if (GREETING_RE.test(raw)) { trace.push({ step: 'Question type', result: 'Greeting' }); return finish(refuse('greeting'), trace, [], ctx); }
    if (OTHER_AMC_RE.test(q) || OFF_TOPIC_RE.test(q)) { trace.push({ step: 'Question type', result: '❌ Outside the covered schemes — declined' }); return finish(refuse('out_of_scope'), trace, [], ctx); }
    if (ADVICE_RE.test(q)) { trace.push({ step: 'Question type', result: '❌ Asks for advice or an opinion — declined' }); return finish(refuse('advice'), trace, [], ctx); }
    if (PERFORMANCE_RE.test(q)) { trace.push({ step: 'Question type', result: '❌ Asks about returns or rankings — declined, factsheet linked' }); return finish(refuse('performance'), trace, [], ctx); }
    trace.push({ step: 'Question type', result: '✅ Factual question' });

    // 3. Entities
    let schemes = detectSchemes(q);
    const plan = detectPlan(q);
    let topics = detectTopics(q);
    let isConcept = CONCEPT_RE.test(q) && schemes.length === 0;
    // "direct vs regular" without a scheme is a concept question about plan types
    if (!schemes.length && /\bdirect\b/.test(q) && /\bregular\b/.test(q)) { topics = ['concept_plans', ...topics.filter(t => t !== 'concept_plans')]; isConcept = true; }
    // "What is HDFC Liquid Fund?" → scheme named, no specific fact asked → overview
    if (schemes.length && !topics.length && CONCEPT_RE.test(q)) topics = ['overview'];

    // Conversation memory: follow-ups like "and its exit load?"
    if (!schemes.length && ctx.lastScheme && topics.length && SCHEME_TOPICS.has(topics[0]) && !isConcept && /\b(its|it|same|that|this|also|and|what about)\b/.test(q)) {
      schemes = [ctx.lastScheme];
      trace.push({ step: 'From earlier', result: `✅ Still talking about ${SCHEMES[ctx.lastScheme].name}` });
    }
    if (schemes.length && !topics.length && ctx.pendingTopic) {
      topics = [ctx.pendingTopic];
      trace.push({ step: 'From earlier', result: `✅ You asked about ${humanTopic(ctx.pendingTopic).toLowerCase()}` });
    }
    trace.push({ step: 'Understood as', result: [schemes.length ? `Scheme: ${schemes.map(k => SCHEMES[k].name).join(', ')}` : (isConcept ? 'General concept question' : 'No scheme named'), topics[0] ? `Topic: ${humanTopic(topics[0])}` : null, plan ? `Plan: ${plan[0].toUpperCase() + plan.slice(1)}` : null].filter(Boolean).join(' · ') });

    // Two or more covered schemes named → factual side-by-side (never performance; that was refused above)
    if (schemes.length >= 2) {
      const keys = topics.length && TOPIC_FACTS[topics[0]] ? TOPIC_FACTS[topics[0]] : ['ter_regular', 'ter_direct', 'exit_load', 'min_sip', 'lock_in', 'risk', 'benchmark'];
      ctx.lastScheme = schemes[0];
      trace.push({ step: 'Answer', result: `✅ Side-by-side of official facts for ${schemes.length} schemes` });
      return finish({
        intent: 'compare',
        answer: `Here are the official facts for ${schemes.map(k => SCHEMES[k].name).join(' and ')} side by side. Each column links to that scheme's page; this compares facts, not performance.`,
        citation: { label: `HDFC AMC — ${SCHEMES[schemes[0]].name}`, url: FACTS[schemes[0]].url },
        compare: { schemes: schemes.slice(0, 3), keys, rows: keys.map(k => ({ key: k, label: FACT_LABELS[k], values: schemes.slice(0, 3).map(sk => k === 'risk' ? RISK_LEVELS[FACTS[sk].risk - 1] : FACTS[sk][k]) })), sources: schemes.slice(0, 3).map(sk => FACTS[sk].url) },
        chips: schemes.slice(0, 2).map(k => `Overview of ${SCHEMES[k].name}`),
      }, trace, [], ctx);
    }

    // Scheme-specific topic asked without a scheme (and not a concept question) → clarify
    if (!schemes.length && topics.length && SCHEME_TOPICS.has(topics[0]) && !isConcept && topics[0] !== 'overview') {
      ctx.pendingTopic = topics[0];
      trace.push({ step: 'Answer', result: 'Need to know which scheme — asking' });
      return finish(refuse('clarify', { topics }), trace, [], ctx);
    }
    ctx.pendingTopic = null;

    // 4. Retrieve
    const ents = { schemes, plan, topics, isConcept };
    const hits = retrieve(raw, ents, 3);
    trace.push({ step: 'Best matching sources', result: hits.filter(h => h.score > 0).map(h => describe(h.doc)).join(' · ') || 'No close match' });
    const top = hits[0];
    const THRESHOLD = 2.5;
    if (!top || top.score < THRESHOLD) {
      trace.push({ step: 'Answer', result: '❌ No source matched closely enough — not guessing' });
      return finish(refuse('not_found'), trace, hits, ctx);
    }

    // 5. Ground the answer
    let url = top.doc.url;
    if (plan === 'direct' && top.doc.scheme && URLS[top.doc.scheme + '_dir'] && top.doc.topic !== 'documents') url = URLS[top.doc.scheme + '_dir'];
    const citation = { label: `${top.doc.org} — ${top.doc.scheme ? SCHEMES[top.doc.scheme].name : humanOrgPage(top.doc)}`, url };
    if (top.doc.scheme) ctx.lastScheme = top.doc.scheme;

    // Follow-up suggestions: other schemes for the same topic, or other topics for the same scheme
    const chips = [];
    if (top.doc.scheme) {
      for (const t of ['expense_ratio', 'exit_load', 'minimum_investment', 'lock_in', 'riskometer_benchmark'])
        if (t !== top.doc.topic && chips.length < 2) chips.push(`${humanTopic(t)} of ${SCHEMES[top.doc.scheme].name}`);
      const other = Object.values(SCHEMES).find(s => s.key !== top.doc.scheme);
      if (SCHEME_TOPICS.has(top.doc.topic)) chips.push(`${humanTopic(top.doc.topic)} of ${other.name}`);
    } else {
      chips.push('Expense ratio of HDFC Flexi Cap Fund', 'Lock-in of HDFC ELSS Tax Saver Fund', 'Exit load of HDFC Liquid Fund');
    }
    trace.push({ step: 'Answer', result: `✅ Taken from ${top.doc.org}: ${describe(top.doc)}` });

    let highlights = null;
    if (top.doc.scheme && TOPIC_FACTS[top.doc.topic]) {
      const f = FACTS[top.doc.scheme];
      highlights = TOPIC_FACTS[top.doc.topic].map(k => ({ key: k, label: FACT_LABELS[k], value: k === 'risk' ? RISK_LEVELS[f.risk - 1] : f[k], level: k === 'risk' ? f.risk : undefined }));
    }
    return finish({ intent: 'fact', answer: top.doc.answer, citation, chips, chunk: top.doc, scheme: top.doc.scheme, highlights }, trace, hits, ctx);
  }

  function describe(doc) { return doc.scheme ? `${SCHEMES[doc.scheme].name} — ${humanTopic(doc.topic)}` : `${doc.org} — ${humanOrgPage(doc)}`; }
  function humanOrgPage(doc) {
    return ({ concept_expense_ratio: 'Expense Ratio explainer', concept_exit_load: 'Exit Load explainer', concept_riskometer: 'Riskometer', concept_plans: 'Direct vs Regular Plan', concept_elss: 'ELSS guide', concept_mf: 'Understanding Mutual Funds', howto_statement: 'Account Statement', howto_capital_gains: 'Capital Gains Statement', howto_factsheet: 'Factsheets' })[doc.topic] || 'Source page';
  }

  function finish(res, trace, hits, ctx) {
    return { ...res, updated: UPDATED, stamp: stamp(), disclaimer: DISCLAIMER, trace, retrieved: hits.map(h => ({ id: h.doc.id, label: describe(h.doc), score: h.score, url: h.doc.url, org: h.doc.org })), context: ctx };
  }

  // Prompt for the optional LLM mode (W2). The LLM only rephrases retrieved facts; it never adds knowledge.
  function buildLLMPrompt(question, hits) {
    const sources = hits.map((h, i) => `[${i + 1}] (${h.doc.org}) ${h.doc.answer}\nURL: ${h.doc.url}`).join('\n\n');
    const system = `You are "Pramaan", a facts-only mutual-fund FAQ helper for retail investors in India.
RULES (non-negotiable):
1. Answer ONLY from the SOURCES provided. If the answer is not in the sources, reply exactly: NOT_IN_SOURCES
2. Maximum 3 sentences. Plain English. No bullet points.
3. Never give investment advice, opinions, predictions, comparisons of returns, or words like "should", "best", "recommend", "good investment".
4. Do not mention or compute past returns or NAV movements.
5. End with the citation marker [1] for the single source you relied on most. Cite exactly one source.
6. Do not ask for or repeat any personal data.`;
    const user = `QUESTION: ${question}\n\nSOURCES:\n${sources}`;
    return { system, user };
  }

  // Post-validate an LLM answer before showing it (defence in depth)
  function validateLLMAnswer(text) {
    if (!text || /NOT_IN_SOURCES/i.test(text)) return { ok: false, reason: 'not in sources' };
    if (ADVICE_RE.test(text) || /\b(should|best|recommend|good investment)\b/i.test(text)) return { ok: false, reason: 'advice language' };
    const sentences = text.replace(/\[\d\]/g, '').split(/(?<=[.!?])\s+/).filter(s => s.trim());
    if (sentences.length > 3) return { ok: false, reason: 'more than 3 sentences' };
    const m = text.match(/\[(\d)\]/);
    return { ok: true, citeIndex: m ? parseInt(m[1], 10) - 1 : 0, text: text.replace(/\s*\[\d\]\s*/g, ' ').trim() };
  }

  return { ask, retrieve, tokenize, detectPII, detectSchemes, detectTopics, buildLLMPrompt, validateLLMAnswer, DISCLAIMER, SCHEMES, CHUNKS, UPDATED, FACTS, FACT_LABELS, RISK_LEVELS };
});
