/**
 * corpus.js — the entire knowledge base of Pramaan (Facts-Only MF Assistant).
 *
 * Every chunk is a fact taken from an official public page (HDFC AMC, SEBI, AMFI).
 * `text`   → what the retriever indexes (keywords + the fact)
 * `answer` → the exact ≤3-sentence answer shown to the user
 * `url`    → the ONE citation shown with the answer
 * `updated`→ date the fact was last verified against the source (dd Mon yyyy)
 *
 * Scope: HDFC Asset Management Company — 5 schemes (large-cap, flexi-cap, ELSS, hybrid, liquid)
 * Nothing here is advice. No returns, no rankings, no recommendations.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MF_CORPUS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const UPDATED = '16 Sep 2026';
  const AUM_DATE = '31 Aug 2026';

  const SCHEMES = {
    flexi:  { key: 'flexi',  name: 'HDFC Flexi Cap Fund',          short: 'Flexi Cap',          aliases: ['flexi cap', 'flexicap', 'flexi-cap', 'hdfc flexi'] },
    large:  { key: 'large',  name: 'HDFC Large Cap Fund',          short: 'Large Cap',          aliases: ['large cap', 'largecap', 'large-cap', 'hdfc large', 'top 100', 'bluechip'] },
    elss:   { key: 'elss',   name: 'HDFC ELSS Tax Saver Fund',     short: 'ELSS Tax Saver',     aliases: ['elss', 'tax saver', 'taxsaver', 'tax saving', 'tax-saver', '80c', 'hdfc elss'] },
    baf:    { key: 'baf',    name: 'HDFC Balanced Advantage Fund', short: 'Balanced Advantage', aliases: ['balanced advantage', 'baf', 'hdfc baf', 'dynamic asset allocation', 'hybrid'] },
    liquid: { key: 'liquid', name: 'HDFC Liquid Fund',             short: 'Liquid',             aliases: ['liquid fund', 'liquid', 'hdfc liquid', 'money market', 'debt fund'] },
  };

  const URLS = {
    flexi_reg:  'https://www.hdfcfund.com/explore/mutual-funds/hdfc-flexi-cap-fund/regular',
    flexi_dir:  'https://www.hdfcfund.com/explore/mutual-funds/hdfc-flexi-cap-fund/direct',
    large_reg:  'https://www.hdfcfund.com/explore/mutual-funds/hdfc-large-cap-fund/regular',
    large_dir:  'https://www.hdfcfund.com/explore/mutual-funds/hdfc-large-cap-fund/direct',
    elss_reg:   'https://www.hdfcfund.com/explore/mutual-funds/hdfc-elss-tax-saver/regular',
    elss_dir:   'https://www.hdfcfund.com/explore/mutual-funds/hdfc-elss-tax-saver/direct',
    baf_reg:    'https://www.hdfcfund.com/explore/mutual-funds/hdfc-balanced-advantage-fund/regular',
    baf_dir:    'https://www.hdfcfund.com/explore/mutual-funds/hdfc-balanced-advantage-fund/direct',
    liquid_reg: 'https://www.hdfcfund.com/explore/mutual-funds/hdfc-liquid-fund/regular',
    liquid_dir: 'https://www.hdfcfund.com/explore/mutual-funds/hdfc-liquid-fund/direct',
    flexi_sid:  'https://files.hdfcfund.com/s3fs-public/SID/2025-05/SID%20-%20HDFC%20Flexi%20Cap%20Fund%20dated%20May%2030,%202025.pdf',
    elss_sid:   'https://files.hdfcfund.com/s3fs-public/SID/2024-11/SID%20-%20HDFC%20ELSS%20Tax%20Saver%20Fund%20dated%20November%2021,%202024.pdf',
    factsheets: 'https://www.hdfcfund.com/mutual-funds/factsheets',
    cas_hdfc:   'https://www.hdfcfund.com/services/consolidated-account-statement',
    cas_faq:    'https://www.hdfcfund.com/services/faqs/consolidated-account-statement',
    cg_hdfc:    'https://www.hdfcfund.com/learn/blog/how-get-capital-gain-statement-mutual-fund-schemes-india',
    sebi_risk:  'https://investor.sebi.gov.in/riskometer.html',
    sebi_exit:  'https://investor.sebi.gov.in/exit_load.html',
    sebi_elss:  'https://investor.sebi.gov.in/elss.html',
    sebi_plans: 'https://investor.sebi.gov.in/regular_and_direct_mutual_funds.html',
    sebi_mf:    'https://investor.sebi.gov.in/understanding_mf.html',
    amfi_ter:   'https://www.amfiindia.com/investor/knowledge-center-info?zoneName=expenseRatio',
    amfi_direct:'https://www.amfiindia.com/investor/knowledge-center-info?zoneName=DirectPlan',
    amfi_cas:   'https://www.amfiindia.com/investor/become-mf-distributor?zoneName=consolidatedAcct',
    amfi_risk:  'https://www.amfiindia.com/online-center/risk-o-meter',
  };

  // Helper to keep chunk definitions short
  const c = (id, scheme, topic, org, url, text, answer) => ({ id, scheme, topic, org, url, text, answer, updated: UPDATED });

  const CHUNKS = [
    // ───────────── HDFC Flexi Cap Fund ─────────────
    c('flexi-overview', 'flexi', 'overview', 'HDFC AMC', URLS.flexi_reg,
      'HDFC Flexi Cap Fund overview category type what is it about open ended dynamic equity scheme investing across large cap mid cap small cap stocks benchmark NIFTY 500 Total Returns Index riskometer very high inception 1995',
      'HDFC Flexi Cap Fund is an open-ended dynamic equity scheme that invests across large-cap, mid-cap and small-cap stocks; it was launched on 01 Jan 1995. Its benchmark is the NIFTY 500 Total Returns Index and its riskometer level is "Very High".'),
    c('flexi-ter', 'flexi', 'expense_ratio', 'HDFC AMC', URLS.flexi_reg,
      'HDFC Flexi Cap Fund expense ratio TER total expense ratio cost charges fees regular plan 1.37% direct plan 0.77%',
      'The Total Expense Ratio (TER) of HDFC Flexi Cap Fund is 1.37% for the Regular Plan and 0.77% for the Direct Plan, including additional expenses and GST on management fees. TER is deducted from the scheme\'s assets daily, so the published NAV is already net of it.'),
    c('flexi-exit', 'flexi', 'exit_load', 'HDFC AMC', URLS.flexi_reg,
      'HDFC Flexi Cap Fund exit load redemption charge switch out within 1 year 1% no exit load after 1 year',
      'HDFC Flexi Cap Fund charges an exit load of 1.00% if units are redeemed or switched out within 1 year from the date of allotment. No exit load is payable after 1 year.'),
    c('flexi-min', 'flexi', 'minimum_investment', 'HDFC AMC', URLS.flexi_reg,
      'HDFC Flexi Cap Fund minimum SIP amount minimum investment lumpsum how much to start ₹100',
      'The minimum SIP amount for HDFC Flexi Cap Fund is ₹100 per instalment. The minimum lumpsum purchase amount is ₹100 as well, with additional purchases in multiples of ₹1 thereafter.'),
    c('flexi-lockin', 'flexi', 'lock_in', 'HDFC AMC', URLS.flexi_reg,
      'HDFC Flexi Cap Fund lock-in period lock in none NA open ended',
      'HDFC Flexi Cap Fund has no lock-in period; it is an open-ended scheme so units can be redeemed on any business day. Note that an exit load of 1% applies to redemptions within 1 year of allotment.'),
    c('flexi-risk-bench', 'flexi', 'riskometer_benchmark', 'HDFC AMC', URLS.flexi_reg,
      'HDFC Flexi Cap Fund riskometer risk level benchmark index NIFTY 500 TRI very high risk',
      'HDFC Flexi Cap Fund\'s riskometer level is "Very High", the top of SEBI\'s six-level scale. Its benchmark is the NIFTY 500 Total Returns Index.'),
    c('flexi-manager', 'flexi', 'fund_manager', 'HDFC AMC', URLS.flexi_reg,
      'HDFC Flexi Cap Fund fund manager who manages AUM assets under management size inception date launch',
      `HDFC Flexi Cap Fund is managed by Mr. Amit B Ganatra (Senior Fund Manager – Equities) with Mr. Dhruv Muchhal for overseas investments. The scheme's AUM was ₹1,13,606.47 crore as of ${AUM_DATE}, and it was launched on 01 Jan 1995.`),
    c('flexi-sid', 'flexi', 'documents', 'HDFC AMC', URLS.flexi_sid,
      'HDFC Flexi Cap Fund SID scheme information document KIM key information memorandum download offer document',
      'The Scheme Information Document (SID) for HDFC Flexi Cap Fund (dated 30 May 2025) is published by HDFC AMC and covers investment objective, asset allocation, risk factors, loads and expenses. You can download it directly from the HDFC Mutual Fund website.'),

    // ───────────── HDFC Large Cap Fund ─────────────
    c('large-overview', 'large', 'overview', 'HDFC AMC', URLS.large_reg,
      'HDFC Large Cap Fund overview category type open ended equity scheme predominantly investing in large cap stocks top 100 companies benchmark NIFTY 100 TRI riskometer very high inception 1996',
      'HDFC Large Cap Fund is an open-ended equity scheme that invests predominantly (minimum 80%) in large-cap stocks, i.e. the 100 largest companies by market capitalisation; it was launched on 11 Oct 1996. Its benchmark is the NIFTY 100 Total Return Index and its riskometer level is "Very High".'),
    c('large-ter', 'large', 'expense_ratio', 'HDFC AMC', URLS.large_reg,
      'HDFC Large Cap Fund expense ratio TER total expense ratio cost charges fees regular plan 1.57% direct plan 1.03%',
      'The Total Expense Ratio (TER) of HDFC Large Cap Fund is 1.57% for the Regular Plan and 1.03% for the Direct Plan, including additional expenses and GST on management fees. The published NAV is already net of TER.'),
    c('large-exit', 'large', 'exit_load', 'HDFC AMC', URLS.large_reg,
      'HDFC Large Cap Fund exit load redemption charge switch out within 1 year 1% no exit load after 1 year',
      'HDFC Large Cap Fund charges an exit load of 1.00% if units are redeemed or switched out within 1 year from the date of allotment. No exit load is payable after 1 year.'),
    c('large-min', 'large', 'minimum_investment', 'HDFC AMC', URLS.large_reg,
      'HDFC Large Cap Fund minimum SIP amount minimum investment lumpsum how much to start ₹100',
      'The minimum SIP amount for HDFC Large Cap Fund is ₹100 per instalment. The minimum lumpsum purchase is also ₹100, with additional purchases in multiples of ₹1.'),
    c('large-lockin', 'large', 'lock_in', 'HDFC AMC', URLS.large_reg,
      'HDFC Large Cap Fund lock-in period lock in none NA open ended',
      'HDFC Large Cap Fund has no lock-in period; as an open-ended scheme, units can be redeemed on any business day. An exit load of 1% applies to redemptions within 1 year of allotment.'),
    c('large-risk-bench', 'large', 'riskometer_benchmark', 'HDFC AMC', URLS.large_reg,
      'HDFC Large Cap Fund riskometer risk level benchmark index NIFTY 100 TRI very high risk',
      'HDFC Large Cap Fund\'s riskometer level is "Very High". Its benchmark is the NIFTY 100 Total Return Index.'),
    c('large-manager', 'large', 'fund_manager', 'HDFC AMC', URLS.large_reg,
      'HDFC Large Cap Fund fund manager who manages AUM assets under management size inception date launch',
      `HDFC Large Cap Fund is managed by Mr. Rahul Baijal (Senior Member, Investment Team – Equity) with Mr. Dhruv Muchhal for overseas investments. The scheme's AUM was ₹39,933.37 crore as of ${AUM_DATE}, and it was launched on 11 Oct 1996.`),

    // ───────────── HDFC ELSS Tax Saver Fund ─────────────
    c('elss-overview', 'elss', 'overview', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund overview category type open ended equity linked savings scheme statutory lock in 3 years tax benefit section 80C benchmark NIFTY 500 TRI riskometer very high inception 1996',
      'HDFC ELSS Tax Saver Fund is an open-ended Equity Linked Savings Scheme with a statutory lock-in of 3 years and a tax benefit under Section 80C; it was launched on 31 Mar 1996. Its benchmark is the NIFTY 500 Total Returns Index and its riskometer level is "Very High".'),
    c('elss-ter', 'elss', 'expense_ratio', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund expense ratio TER total expense ratio cost charges fees regular plan 1.76% direct plan 1.20%',
      'The Total Expense Ratio (TER) of HDFC ELSS Tax Saver Fund is 1.76% for the Regular Plan and 1.20% for the Direct Plan, including additional expenses and GST on management fees. The published NAV is already net of TER.'),
    c('elss-exit', 'elss', 'exit_load', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund exit load redemption charge nil none no exit load',
      'HDFC ELSS Tax Saver Fund has NIL exit load. However, units cannot be redeemed at all during the statutory 3-year lock-in period from the date of allotment.'),
    c('elss-min', 'elss', 'minimum_investment', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund minimum SIP amount minimum investment lumpsum how much to start ₹500',
      'The minimum SIP amount for HDFC ELSS Tax Saver Fund is ₹500 per instalment, and the minimum lumpsum purchase is ₹500. Additional purchases are in multiples of ₹500.'),
    c('elss-lockin', 'elss', 'lock_in', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund lock-in period lock in 3 years three years statutory when can I withdraw redeem SIP instalment each',
      'HDFC ELSS Tax Saver Fund has a statutory lock-in of 3 years from the date of allotment of each unit. For SIPs this applies to each instalment separately, so every instalment is locked for 3 years from its own allotment date.'),
    c('elss-tax', 'elss', 'tax_benefit', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund tax benefit deduction section 80C ₹1.5 lakh income tax act 1961 how much tax saving',
      'Investments in HDFC ELSS Tax Saver Fund are eligible for deduction of up to ₹1.5 lakh in a financial year under Section 80C of the Income Tax Act, 1961 (old tax regime). The scheme invests 80–100% in equity and equity-related instruments.'),
    c('elss-risk-bench', 'elss', 'riskometer_benchmark', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund riskometer risk level benchmark index NIFTY 500 TRI very high risk',
      'HDFC ELSS Tax Saver Fund\'s riskometer level is "Very High". Its benchmark is the NIFTY 500 Total Returns Index.'),
    c('elss-manager', 'elss', 'fund_manager', 'HDFC AMC', URLS.elss_reg,
      'HDFC ELSS Tax Saver Fund fund manager who manages AUM assets under management size inception date launch',
      `HDFC ELSS Tax Saver Fund is managed by Mr. Amar Kalkundrikar (Equities – Investments). The scheme's AUM was ₹15,991.78 crore as of ${AUM_DATE}, and it was launched on 31 Mar 1996.`),
    c('elss-sid', 'elss', 'documents', 'HDFC AMC', URLS.elss_sid,
      'HDFC ELSS Tax Saver Fund SID scheme information document KIM key information memorandum download offer document',
      'The Scheme Information Document (SID) for HDFC ELSS Tax Saver Fund (dated 21 Nov 2024) is published by HDFC AMC and covers objective, asset allocation, the 3-year lock-in, risk factors and expenses. You can download it directly from the HDFC Mutual Fund website.'),

    // ───────────── HDFC Balanced Advantage Fund ─────────────
    c('baf-overview', 'baf', 'overview', 'HDFC AMC', URLS.baf_reg,
      'HDFC Balanced Advantage Fund overview category type hybrid dynamic asset allocation equity and debt mix benchmark NIFTY 50 Hybrid Composite Debt 50:50 Index riskometer very high inception 1994',
      'HDFC Balanced Advantage Fund is an open-ended hybrid scheme that dynamically allocates between equity and debt based on market conditions; it was launched on 01 Feb 1994. Its benchmark is the NIFTY 50 Hybrid Composite Debt 50:50 Index and its riskometer level is "Very High".'),
    c('baf-ter', 'baf', 'expense_ratio', 'HDFC AMC', URLS.baf_reg,
      'HDFC Balanced Advantage Fund expense ratio TER total expense ratio cost charges fees regular plan 1.31% direct plan 0.78%',
      'The Total Expense Ratio (TER) of HDFC Balanced Advantage Fund is 1.31% for the Regular Plan and 0.78% for the Direct Plan, including additional expenses and GST on management fees. The published NAV is already net of TER.'),
    c('baf-exit', 'baf', 'exit_load', 'HDFC AMC', URLS.baf_reg,
      'HDFC Balanced Advantage Fund exit load redemption charge 15% units free without exit load within 1 year 1% after 1 year nil',
      'For HDFC Balanced Advantage Fund, up to 15% of the units allotted can be redeemed without exit load within 1 year of allotment; redemptions beyond that limit within 1 year attract a 1.00% exit load. No exit load is payable after 1 year.'),
    c('baf-min', 'baf', 'minimum_investment', 'HDFC AMC', URLS.baf_reg,
      'HDFC Balanced Advantage Fund minimum SIP amount minimum investment lumpsum how much to start ₹100',
      'The minimum SIP amount for HDFC Balanced Advantage Fund is ₹100 per instalment. The minimum lumpsum purchase and minimum additional purchase are also ₹100.'),
    c('baf-lockin', 'baf', 'lock_in', 'HDFC AMC', URLS.baf_reg,
      'HDFC Balanced Advantage Fund lock-in period lock in none NA open ended',
      'HDFC Balanced Advantage Fund has no lock-in period; it is open-ended, so units can be redeemed on any business day. Exit load rules (15% free, then 1% within 1 year) still apply.'),
    c('baf-risk-bench', 'baf', 'riskometer_benchmark', 'HDFC AMC', URLS.baf_reg,
      'HDFC Balanced Advantage Fund riskometer risk level benchmark index hybrid very high risk',
      'HDFC Balanced Advantage Fund\'s riskometer level is "Very High". Its benchmark is the NIFTY 50 Hybrid Composite Debt 50:50 Index.'),
    c('baf-manager', 'baf', 'fund_manager', 'HDFC AMC', URLS.baf_reg,
      'HDFC Balanced Advantage Fund fund manager who manages AUM assets under management size inception date launch',
      `HDFC Balanced Advantage Fund is managed by a team: Ihab Dalwai, Arun Agarwal, Nandita Menezes, Anil Bamboli and Gopal Agrawal. The scheme's AUM was ₹1,07,295.79 crore as of ${AUM_DATE}, and it was launched on 01 Feb 1994.`),

    // ───────────── HDFC Liquid Fund ─────────────
    c('liquid-overview', 'liquid', 'overview', 'HDFC AMC', URLS.liquid_reg,
      'HDFC Liquid Fund overview category type open ended liquid scheme debt money market short term parking benchmark CRISIL Liquid Debt A-I Index riskometer low to moderate inception 2000',
      'HDFC Liquid Fund is an open-ended liquid (debt) scheme investing in short-term money-market and debt instruments; it was launched on 17 Oct 2000. Its benchmark is the CRISIL Liquid Debt A-I Index and its riskometer level is "Low to Moderate".'),
    c('liquid-ter', 'liquid', 'expense_ratio', 'HDFC AMC', URLS.liquid_reg,
      'HDFC Liquid Fund expense ratio TER total expense ratio cost charges fees regular plan 0.30% direct plan 0.20%',
      'The Total Expense Ratio (TER) of HDFC Liquid Fund is 0.30% for the Regular Plan and 0.20% for the Direct Plan. The published NAV is already net of TER.'),
    c('liquid-exit', 'liquid', 'exit_load', 'HDFC AMC', URLS.liquid_reg,
      'HDFC Liquid Fund exit load graded day 1 to day 6 0.0070% 0.0065% 0.0060% 0.0055% 0.0050% 0.0045% day 7 onwards nil redemption within 7 days',
      'HDFC Liquid Fund has a graded exit load for redemptions within 7 days of allotment: 0.0070% on Day 1, 0.0065% on Day 2, 0.0060% on Day 3, 0.0055% on Day 4, 0.0050% on Day 5 and 0.0045% on Day 6. From Day 7 onwards the exit load is Nil.'),
    c('liquid-min', 'liquid', 'minimum_investment', 'HDFC AMC', URLS.liquid_reg,
      'HDFC Liquid Fund minimum SIP amount minimum investment lumpsum growth option IDCW daily weekly monthly how much to start ₹100 ₹10,000 ₹5,000',
      'The minimum SIP amount for HDFC Liquid Fund is ₹100, and the minimum lumpsum in the Growth option is ₹100. For IDCW options the minimum is ₹10,000 (Daily IDCW) and ₹5,000 (Weekly/Monthly IDCW).'),
    c('liquid-lockin', 'liquid', 'lock_in', 'HDFC AMC', URLS.liquid_reg,
      'HDFC Liquid Fund lock-in period lock in none NA open ended',
      'HDFC Liquid Fund has no lock-in period; units can be redeemed on any business day. A small graded exit load applies only if you redeem within the first 6 days.'),
    c('liquid-risk-bench', 'liquid', 'riskometer_benchmark', 'HDFC AMC', URLS.liquid_reg,
      'HDFC Liquid Fund riskometer risk level benchmark index CRISIL Liquid Debt A-I low to moderate risk',
      'HDFC Liquid Fund\'s riskometer level is "Low to Moderate". Its benchmark is the CRISIL Liquid Debt A-I Index.'),
    c('liquid-manager', 'liquid', 'fund_manager', 'HDFC AMC', URLS.liquid_reg,
      'HDFC Liquid Fund fund manager who manages AUM assets under management size inception date launch',
      `HDFC Liquid Fund is managed by Mr. Rohan Pillai (Fund Manager & Dealer – Fixed Income) and Mr. Swapnil Jangam, with Mr. Dhruv Muchhal for overseas investments. The scheme's AUM was ₹71,323.35 crore as of ${AUM_DATE}, and it was launched on 17 Oct 2000.`),

    // ───────────── Concepts (SEBI / AMFI) ─────────────
    c('concept-ter', null, 'concept_expense_ratio', 'AMFI', URLS.amfi_ter,
      'what is expense ratio TER total expense ratio meaning definition explain how does it work who pays daily NAV SEBI limits',
      'The Total Expense Ratio (TER) is the annual operating cost of a scheme — management fees, registrar, custodian, audit, marketing and administrative expenses — expressed as a percentage of daily net assets. It is deducted before the daily NAV is published, so a lower TER means a higher NAV, and SEBI caps TER by scheme size and type.'),
    c('concept-exit', null, 'concept_exit_load', 'SEBI', URLS.sebi_exit,
      'what is exit load meaning definition explain redemption charge why charged how calculated example',
      'Exit load is a fee charged by a mutual fund when you redeem units before a pre-defined period, expressed as a percentage of the redemption value; it discourages short-term trading. For example, redeeming ₹1,05,000 within the load period at 1% exit load deducts ₹1,050, so you receive ₹1,03,950.'),
    c('concept-riskometer', null, 'concept_riskometer', 'SEBI', URLS.sebi_risk,
      'what is riskometer risk-o-meter meaning explain six levels low low to moderate moderate moderately high high very high scale',
      'The Riskometer is SEBI\'s standard tool to depict a scheme\'s risk level on a six-point scale: Low, Low to Moderate, Moderate, Moderately High, High and Very High. Fund houses review it periodically and must show it in factsheets and scheme documents.'),
    c('concept-riskometer-lookup', null, 'concept_riskometer', 'AMFI', URLS.amfi_risk,
      'where to check riskometer of any scheme lookup AMFI portal risk-o-meter disclosure',
      'AMFI publishes scheme-wise Risk-o-meter disclosures for all mutual funds in its Online Centre, where you can select the disclosure type and look up any scheme. Each AMC also shows the current riskometer on the scheme\'s own page.'),
    c('concept-direct-regular', null, 'concept_plans', 'AMFI', URLS.amfi_direct,
      'what is direct plan vs regular plan difference meaning explain distributor commission lower expense ratio higher NAV',
      'A Direct Plan is bought straight from the AMC without a distributor, while a Regular Plan is routed through a distributor whose commission is built into the expense ratio. Both plans hold the same portfolio, but the Direct Plan has a lower TER and therefore a higher NAV.'),
    c('concept-direct-regular-sebi', null, 'concept_plans', 'SEBI', URLS.sebi_plans,
      'SEBI regular and direct mutual funds explained intermediaries expense ratio difference',
      'SEBI explains that Regular Plans include a commission paid to the intermediary in their expense ratio, whereas Direct Plans are purchased directly from the AMC with a lower expense ratio. The underlying portfolio is identical in both plans.'),
    c('concept-elss', null, 'concept_elss', 'SEBI', URLS.sebi_elss,
      'what is ELSS meaning equity linked savings scheme lock-in 3 years section 80C 1.5 lakh 80% equity rules',
      'An ELSS (Equity Linked Savings Scheme) is a mutual fund that invests at least 80% in equity and carries a statutory 3-year lock-in during which units cannot be redeemed. Investments of up to ₹1.5 lakh per financial year qualify for deduction under Section 80C.'),
    c('concept-mf', null, 'concept_mf', 'SEBI', URLS.sebi_mf,
      'what is a mutual fund basics understanding NAV units AMC how it works beginner',
      'A mutual fund pools money from many investors and invests it in securities such as stocks and bonds; each investor holds units whose value is the Net Asset Value (NAV). SEBI regulates all mutual funds in India and its investor portal explains the basics.'),

    // ───────────── Statements / documents ─────────────
    c('howto-cas-hdfc', null, 'howto_statement', 'HDFC AMC', URLS.cas_hdfc,
      'how to download account statement consolidated account statement CAS HDFC mutual fund email PAN folio steps',
      'On the HDFC Mutual Fund website, open "Consolidated Account Statement", enter your PAN or folio number, choose the duration (default: current financial year), verify with OTP and click "Send Email" to receive the statement. There is no charge for the statement.'),
    c('howto-cas-faq', null, 'howto_statement', 'HDFC AMC', URLS.cas_faq,
      'CAS frequency monthly free of charge what does it contain opening closing balance transactions HDFC FAQ',
      'HDFC Mutual Fund\'s CAS is a single statement reflecting all transactions across all folios and schemes of all mutual funds, sent monthly (before the 10th) for the previous month\'s transactions. It is free of charge and shows opening/closing balances, purchases, redemptions, switches, SIPs and IDCW.'),
    c('howto-cas-amfi', null, 'howto_statement', 'AMFI', URLS.amfi_cas,
      'what is consolidated account statement CAS who sends it depository NSDL CDSL MFCentral monthly 10th',
      'Per AMFI, the CAS is a combined monthly statement of all your mutual fund and demat transactions, sent by the 10th of the following month by the depositories (NSDL/CDSL) or by the fund if you hold only MF folios. You can also get an e-CAS via CAMS, KFintech or the MFCentral portal.'),
    c('howto-capgains', null, 'howto_capital_gains', 'HDFC AMC', URLS.cg_hdfc,
      'how to download capital gains statement capital gain tax statement ITR financial year CAMS KFintech PAN email',
      'You can get a capital gains statement from the HDFC Mutual Fund website using the PAN and email registered on your folio, or a consolidated one from the RTAs CAMS (camsonline.com) or KFintech (kfintech.com) for a chosen financial year. Statements are free and typically available after the financial year ends.'),
    c('howto-factsheet', null, 'howto_factsheet', 'HDFC AMC', URLS.factsheets,
      'where to find factsheet download monthly factsheet portfolio holdings performance returns past data',
      'HDFC Mutual Fund publishes monthly factsheets for every scheme — portfolio holdings, riskometer, benchmark, expenses and official performance data — on its Factsheets page. This assistant does not compute or compare returns; please refer to the official factsheet.'),
  ];

  const EDUCATIONAL_LINKS = {
    advice:      { label: 'SEBI Investor: Understanding Mutual Funds', url: URLS.sebi_mf },
    performance: { label: 'HDFC Mutual Fund – Official Factsheets', url: URLS.factsheets },
    plans:       { label: 'AMFI: Direct Plan vs Regular Plan', url: URLS.amfi_direct },
  };


  // Structured facts per scheme — power the Scheme Explorer, fact chips and factual comparisons.
  // Same sources as the chunks above (Regular-plan scheme page; Direct TER from the Direct-plan page).
  const RISK_LEVELS = ['Low', 'Low to Moderate', 'Moderate', 'Moderately High', 'High', 'Very High'];
  const FACTS = {
    flexi:  { category: 'Equity · Flexi Cap', ter_regular: '1.37%', ter_direct: '0.77%', exit_load: '1% within 1 year, nil after', min_sip: '₹100', min_lumpsum: '₹100', lock_in: 'None', risk: 6, benchmark: 'NIFTY 500 TRI', inception: '01 Jan 1995', aum: '₹1,13,606 cr', managers: 'Amit B Ganatra · Dhruv Muchhal (overseas)', url: URLS.flexi_reg, url_direct: URLS.flexi_dir },
    large:  { category: 'Equity · Large Cap', ter_regular: '1.57%', ter_direct: '1.03%', exit_load: '1% within 1 year, nil after', min_sip: '₹100', min_lumpsum: '₹100', lock_in: 'None', risk: 6, benchmark: 'NIFTY 100 TRI', inception: '11 Oct 1996', aum: '₹39,933 cr', managers: 'Rahul Baijal · Dhruv Muchhal (overseas)', url: URLS.large_reg, url_direct: URLS.large_dir },
    elss:   { category: 'Equity · ELSS (tax saver)', ter_regular: '1.76%', ter_direct: '1.20%', exit_load: 'Nil', min_sip: '₹500', min_lumpsum: '₹500', lock_in: '3 years (statutory)', risk: 6, benchmark: 'NIFTY 500 TRI', inception: '31 Mar 1996', aum: '₹15,992 cr', managers: 'Amar Kalkundrikar', url: URLS.elss_reg, url_direct: URLS.elss_dir },
    baf:    { category: 'Hybrid · Balanced Advantage', ter_regular: '1.31%', ter_direct: '0.78%', exit_load: '15% of units free; 1% on the rest within 1 year', min_sip: '₹100', min_lumpsum: '₹100', lock_in: 'None', risk: 6, benchmark: 'NIFTY 50 Hybrid Composite Debt 50:50', inception: '01 Feb 1994', aum: '₹1,07,296 cr', managers: 'Ihab Dalwai · Arun Agarwal · Nandita Menezes · Anil Bamboli · Gopal Agrawal', url: URLS.baf_reg, url_direct: URLS.baf_dir },
    liquid: { category: 'Debt · Liquid', ter_regular: '0.30%', ter_direct: '0.20%', exit_load: 'Graded 0.0070%→0.0045% on days 1–6; nil from day 7', min_sip: '₹100', min_lumpsum: '₹100 (Growth)', lock_in: 'None', risk: 2, benchmark: 'CRISIL Liquid Debt A-I Index', inception: '17 Oct 2000', aum: '₹71,323 cr', managers: 'Rohan Pillai · Swapnil Jangam', url: URLS.liquid_reg, url_direct: URLS.liquid_dir },
  };
  const FACT_LABELS = { ter_regular: 'TER · Regular', ter_direct: 'TER · Direct', exit_load: 'Exit load', min_sip: 'Min SIP', min_lumpsum: 'Min lumpsum', lock_in: 'Lock-in', risk: 'Riskometer', benchmark: 'Benchmark', inception: 'Launched', aum: `AUM (${AUM_DATE})`, managers: 'Fund manager(s)', category: 'Category' };
  // Which structured facts to highlight for each answer topic
  const TOPIC_FACTS = { expense_ratio: ['ter_regular', 'ter_direct'], exit_load: ['exit_load'], minimum_investment: ['min_sip', 'min_lumpsum'], lock_in: ['lock_in'], riskometer_benchmark: ['risk', 'benchmark'], fund_manager: ['managers', 'aum', 'inception'], tax_benefit: ['lock_in', 'min_sip'], overview: ['category', 'benchmark', 'risk'] };

  return { UPDATED, AUM_DATE, SCHEMES, URLS, CHUNKS, EDUCATIONAL_LINKS, RISK_LEVELS, FACTS, FACT_LABELS, TOPIC_FACTS };
});
