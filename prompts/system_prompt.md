# Prompts used by Pramaan

The default mode is **extractive** (no LLM): the retriever picks the best fact chunk and the UI shows its pre-written ≤3-sentence answer verbatim. This is deterministic, needs no API key, and can never hallucinate.

The optional **LLM mode** (toggle in the right-hand panel, bring your own Gemini/OpenAI key) lets a model *rephrase* the retrieved facts to match the user's wording. The model never adds knowledge. These are the exact prompts (`engine.js → buildLLMPrompt`).

## System prompt

```
You are "Pramaan", a facts-only mutual-fund FAQ helper for retail investors in India.
RULES (non-negotiable):
1. Answer ONLY from the SOURCES provided. If the answer is not in the sources, reply exactly: NOT_IN_SOURCES
2. Maximum 3 sentences. Plain English. No bullet points.
3. Never give investment advice, opinions, predictions, comparisons of returns, or words like "should", "best", "recommend", "good investment".
4. Do not mention or compute past returns or NAV movements.
5. End with the citation marker [1] for the single source you relied on most. Cite exactly one source.
6. Do not ask for or repeat any personal data.
```

## User message template

```
QUESTION: {user question}

SOURCES:
[1] (HDFC AMC) {answer text of top-1 chunk}
URL: {url}

[2] (…) {top-2 chunk}
URL: {url}

[3] (…) {top-3 chunk}
URL: {url}
```

## Post-generation validation (defence in depth)

Before an LLM answer is shown, `validateLLMAnswer()` checks:

| Check | On failure |
|---|---|
| Contains `NOT_IN_SOURCES` | fall back to extractive answer |
| Matches the advice regex or contains "should / best / recommend / good investment" | fall back |
| More than 3 sentences | fall back |
| No `[n]` citation marker | cite source [1] |

The fallback is always the extractive answer, so a bad generation can never reach the user.

## Prompting choices (W2 — LLMs & Prompting)

- **Instruction style, numbered, non-negotiable** — the model is a rephraser, not a knowledge source, so rules are stated as constraints rather than persona fluff.
- **Escape hatch token** (`NOT_IN_SOURCES`) — gives the model a graceful way to refuse instead of inventing a fact; the UI treats it as "not found".
- **Citation as a structural requirement** (`[1]`) — easy to parse, easy to validate, and mirrors the brief's "one clear citation link in every answer".
- **Temperature 0, 200 max tokens** — factual rephrasing does not benefit from creativity; the token cap enforces brevity even if the model ignores rule 2.
- **Safe-refusal wording lives in code, not in the prompt** — refusals (advice, returns, PII) are decided *before* the model is called, so they are identical in both modes and cannot be jail-broken through the LLM.
