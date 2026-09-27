#!/usr/bin/env node
/**
 * eval/run_eval.js — regression suite for the guardrails + retrieval.
 *
 *   node eval/run_eval.js            → runs all cases, prints pass/fail, exits 1 on failure
 *   node eval/run_eval.js --write    → also regenerates ../sample_qa.md from the "sample" cases
 *
 * Each case: { q, expect: intent, chunk?: id-prefix the answer must be grounded on, sample?: true }
 */
const path = require('path');
const fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));

const CASES = [
  // ── Facts (W3: retrieval must land on the right chunk) ──
  { q: 'What is the expense ratio of HDFC Flexi Cap Fund?', expect: 'fact', chunk: 'flexi-ter', sample: true },
  { q: 'Exit load of HDFC Large Cap Fund?', expect: 'fact', chunk: 'large-exit', sample: true },
  { q: 'What is the lock-in period for HDFC ELSS Tax Saver Fund?', expect: 'fact', chunk: 'elss-lockin', sample: true },
  { q: 'Minimum SIP for HDFC Liquid Fund', expect: 'fact', chunk: 'liquid-min', sample: true },
  { q: 'Riskometer and benchmark of HDFC Balanced Advantage Fund', expect: 'fact', chunk: 'baf-risk-bench' },
  { q: 'How do I download my capital gains statement?', expect: 'fact', chunk: 'howto-capgains', sample: true },
  { q: 'What is a riskometer?', expect: 'fact', chunk: 'concept-riskometer' },
  { q: 'Difference between direct and regular plan', expect: 'fact', chunk: 'concept-direct-regular' },
  { q: 'Expense ratio of HDFC Flexi Cap direct plan', expect: 'fact', chunk: 'flexi-ter' },
  { q: 'Who manages HDFC Large Cap Fund and what is its AUM?', expect: 'fact', chunk: 'large-manager' },
  { q: 'Tax benefit of HDFC ELSS', expect: 'fact', chunk: 'elss-tax' },
  { q: 'Exit load on HDFC Liquid Fund if I redeem in 3 days', expect: 'fact', chunk: 'liquid-exit' },
  { q: 'How to download the account statement from HDFC Mutual Fund?', expect: 'fact', chunk: 'howto-cas-hdfc' },
  { q: 'What is HDFC Liquid Fund?', expect: 'fact', chunk: 'liquid-overview' },
  { q: 'what is exit load', expect: 'fact', chunk: 'concept-exit' },
  { q: 'Where can I find the SID of HDFC Flexi Cap Fund?', expect: 'fact', chunk: 'flexi-sid' },

  // ── Refusals (W1: answer vs refuse) ──
  { q: 'Should I buy HDFC Flexi Cap Fund now?', expect: 'refuse_advice', sample: true },
  { q: 'Which is better, HDFC Large Cap or Flexi Cap?', expect: 'refuse_advice' },
  { q: 'Is HDFC ELSS good for me?', expect: 'refuse_advice' },
  { q: 'What are the 5-year returns of HDFC Large Cap Fund?', expect: 'refuse_performance', sample: true },
  { q: 'Will HDFC Balanced Advantage Fund beat its benchmark?', expect: 'refuse_performance' },

  // ── PII guard ──
  { q: 'My PAN is ABCDE1234F, show my folio balance', expect: 'refuse_pii', sample: true },
  { q: 'Call me on 9876543210 about my SIP', expect: 'refuse_pii' },
  { q: 'my aadhaar 1234 5678 9012', expect: 'refuse_pii' },
  { q: 'OTP is 482913, verify me', expect: 'refuse_pii' },

  // ── Factual comparison (facts only — performance is still refused) ──
  { q: 'Compare HDFC Flexi Cap Fund and HDFC ELSS Tax Saver Fund', expect: 'compare' },
  { q: 'Compare returns of HDFC Flexi Cap and HDFC Large Cap', expect: 'refuse_performance' },

  // ── Scope ──
  { q: 'Expense ratio of SBI Bluechip Fund', expect: 'out_of_scope' },
  { q: 'Which stock should I buy today?', expect: 'out_of_scope' },
  { q: 'weather in mumbai', expect: 'not_found' },
  { q: 'minimum sip', expect: 'clarify' },
  { q: 'hi', expect: 'greeting' },

  // ── Round 2 (27 Sep 2026): situations found by probing 100 realistic phrasings ──
  { q: 'How much do I need to start a SIP in HDFC Large Cap Fund?', expect: 'fact', chunk: 'large-min' },   // was wrongly refused as advice
  { q: 'can I invest 500 in hdfc flexi cap', expect: 'fact', chunk: 'flexi-min' },
  { q: 'Is HDFC ELSS Tax Saver a good fund?', expect: 'refuse_advice' },                                     // was answered as a fact
  { q: 'hdfc flexi cap fund', expect: 'fact', chunk: 'flexi-overview' },                                     // bare scheme name → overview
  { q: 'hdfc equity fund expense ratio', expect: 'fact', chunk: 'flexi-ter' },                               // old scheme name alias
  { q: 'how much tax can I save with ELSS', expect: 'fact', chunk: 'elss-tax' },
  { q: 'what is SIP', expect: 'fact', chunk: 'concept-sip' },
  { q: 'what is NAV', expect: 'fact', chunk: 'concept-nav' },
  { q: 'what is a mutual fund', expect: 'fact', chunk: 'concept-mf' },
  { q: 'Which HDFC scheme has the lowest expense ratio?', expect: 'compare', sample: true },                 // factual superlative → all-scheme table
  { q: 'NAV of HDFC Flexi Cap today', expect: 'live_data', sample: true },                                   // live data → link, never a stale number
  { q: 'ltcg on hdfc flexi cap', expect: 'not_found' },                                                      // topic not in corpus → honest
  { q: 'STP hdfc flexi cap', expect: 'not_found' },
  { q: 'Can NRI invest in HDFC Flexi Cap?', expect: 'not_found' },
  { q: 'what is IDCW', expect: 'not_found' },
  { q: 'how to buy hdfc flexi cap on groww', expect: 'out_of_scope' },                                       // Groww app questions
  { q: 'what is my balance', expect: 'out_of_scope' },                                                       // account access → CAS link
  { q: 'I lost money in hdfc flexi cap', expect: 'out_of_scope' },                                           // complaint handled gracefully
  { q: 'what can you do', expect: 'greeting' },
  { q: 'who built you', expect: 'greeting' },
  { q: 'ok bye', expect: 'greeting' },
  { q: '', expect: 'greeting' },
  { q: '1+1', expect: 'not_found' },
  { q: 'tell me a joke', expect: 'not_found' },
  { q: 'how do i get my account statement', expect: 'fact', chunk: 'howto-cas-hdfc' },
  { q: 'hdfc flexi cap ka expense ratio kya hai', expect: 'fact', chunk: 'flexi-ter' },                      // Hinglish with English keywords
];

let pass = 0, fail = 0;
const rows = [];
for (const c of CASES) {
  const r = E.ask(c.q, {});
  const okIntent = r.intent === c.expect;
  const okChunk = !c.chunk || (r.intent === 'fact' && r.retrieved[0] && r.retrieved[0].id.startsWith(c.chunk));
  const ok = okIntent && okChunk;
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${c.q}\n     → ${r.intent}${r.retrieved[0] ? ` · ${r.retrieved[0].id} (${r.retrieved[0].score})` : ''}${ok ? '' : `   EXPECTED ${c.expect}${c.chunk ? ' / ' + c.chunk : ''}`}`);
  if (c.sample) rows.push({ q: c.q, r });
}

// Follow-up memory test
{
  let r = E.ask('Expense ratio of HDFC Large Cap Fund', {});
  r = E.ask('and its exit load?', r.context);
  const ok = r.intent === 'fact' && r.retrieved[0].id === 'large-exit';
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} follow-up "and its exit load?" inherits scheme → ${r.retrieved[0].id}`);
}
// Multi-turn: pending topic → scheme chip, topic carry-over, plan follow-up
{
  let c = {}; const step = (q, want, id) => { const r = E.ask(q, c); c = r.context; const ok = r.intent === want && (!id || (r.retrieved[0] && r.retrieved[0].id === id)); ok ? pass++ : fail++; console.log(`${ok ? '✅' : '❌'} multi-turn "${q}" → ${r.intent}${r.retrieved[0] ? ' · ' + r.retrieved[0].id : ''}${ok ? '' : `   EXPECTED ${want}${id ? ' / ' + id : ''}`}`); return r; };
  step('minimum sip', 'clarify');
  step('HDFC Large Cap Fund', 'fact', 'large-min');
  step('and for elss?', 'fact', 'elss-min');
  step('what about its exit load', 'fact', 'elss-exit');
  step('Expense ratio of HDFC Liquid Fund', 'fact', 'liquid-ter');
  const d = step('direct plan?', 'fact', 'liquid-ter');
  if (!/\/direct$/.test(d.citation.url)) { fail++; console.log('❌ direct-plan follow-up should cite the Direct plan page'); }
}
// Every fact answer must have exactly one citation and ≤3 sentences
for (const ch of E.CHUNKS) {
  const sentences = ch.answer.replace(/\b(Mr|Ms|Mrs|Dr)\./g, '$1').split(/(?<=[.!?])\s+(?=[A-Z₹"])/).length;
  const ok = sentences <= 3 && /^https:\/\/(www\.|files\.|investor\.)?(hdfcfund\.com|sebi\.gov\.in|amfiindia\.com)/.test(ch.url);
  if (!ok) { fail++; console.log(`❌ chunk ${ch.id}: ${sentences} sentences / url ${ch.url}`); }
}
console.log(`\n${pass} passed, ${fail} failed · ${E.CHUNKS.length} chunks all ≤3 sentences with an official-domain citation`);

if (process.argv.includes('--write')) {
  const md = [
    '# Sample Q&A',
    '',
    `Generated by \`node eval/run_eval.js --write\` on ${E.UPDATED}. Every answer below is exactly what Pramaan shows in the UI (extractive mode).`,
    '',
    ...rows.map(({ q, r }, i) => [
      `## ${i + 1}. ${q}`,
      '',
      `**Intent:** \`${r.intent}\`${r.retrieved[0] && r.intent === 'fact' ? ` · grounded on \`${r.retrieved[0].id}\`` : ''}`,
      '',
      `> ${r.answer}`,
      '',
      ...(r.compare ? [`| | ${r.compare.schemes.map(k => E.SCHEMES[k].name).join(' | ')} |`, `|---|${r.compare.schemes.map(() => '---').join('|')}|`, ...r.compare.rows.map(row => `| ${row.label} | ${row.values.join(' | ')} |`), ''] : []),
      r.citation ? `**Source:** [${r.citation.label}](${r.citation.url})  ` : '**Source:** — (guardrail response, no retrieval)  ',
      `*${r.stamp}*`,
      '',
    ].join('\n')),
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, '..', 'sample_qa.md'), md);
  console.log('wrote sample_qa.md');
}
process.exit(fail ? 1 : 0);
