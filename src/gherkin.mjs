/**
 * Minimal Gherkin reader for English and Korean keywords.
 * It extracts scenarios with their effective tags (feature, rule and own tags)
 * and step counts. It does not validate Gherkin grammar.
 */
const FEATURE = /^(Feature|기능)\s*:/;
const RULE = /^(Rule|규칙)\s*:/;
const BACKGROUND = /^(Background|배경)\s*:/;
const SCENARIO = /^(Scenario Outline|Scenario Template|Scenario|Example|시나리오 개요|시나리오 틀|시나리오)\s*:\s*(.*)$/;
const EXAMPLES = /^(Examples|Scenarios|예)\s*:/;
const STEP = /^(Given|When|Then|And|But|\*|조건|먼저|만일|만약|그러면|그리고|하지만|단)\s+\S/;

export function parseFeature(text) {
  const scenarios = [];
  let featureTags = [];
  let ruleTags = [];
  let pending = [];
  let cur = null;
  let inBackground = false;
  let docString = false;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (/^("""|```)/.test(line)) {
      docString = !docString;
      return;
    }
    if (docString || !line || line.startsWith('#') || line.startsWith('|')) return;
    if (line.startsWith('@')) {
      pending.push(...line.split(/\s+/).filter((t) => t.startsWith('@')).map((t) => t.slice(1)));
      return;
    }
    let m;
    if (FEATURE.test(line)) {
      featureTags = pending;
      pending = [];
    } else if (RULE.test(line)) {
      ruleTags = pending;
      pending = [];
      cur = null;
      inBackground = false;
    } else if (BACKGROUND.test(line)) {
      cur = null;
      inBackground = true;
      pending = [];
    } else if ((m = line.match(SCENARIO)) && !EXAMPLES.test(line)) {
      cur = { name: m[2], line: i + 1, ownTags: pending, tags: [...featureTags, ...ruleTags, ...pending], steps: 0 };
      scenarios.push(cur);
      pending = [];
      inBackground = false;
    } else if (EXAMPLES.test(line)) {
      pending = [];
    } else if (STEP.test(line) && cur && !inBackground) {
      cur.steps++;
    }
  });
  return { scenarios };
}
