/**
 * Unit tests for pure utility functions extracted from content.js.
 * Run with: node tests/js/test_content_utils.js
 * No test runner required — uses simple assertions.
 */

'use strict';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        failed++;
    }
}

function assertEqual(a, b, message) {
    assert(JSON.stringify(a) === JSON.stringify(b), `${message} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

function section(name) {
    console.log(`\n${name}`);
}

// ── Inline pure functions under test (mirrors content.js exactly) ─────────────

const LEGACY_OPENAI_KEY_PATTERN = '\\bsk-[A-Za-z0-9]{20,}\\b';

const DEFAULT_CUSTOM_PATTERNS = [
    { id: 'openai_key', label: 'api_key', pattern: '\\b(?:sk-[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,})\\b', flags: 'g', score: 0.99, replacement: '[API KEY REDACTED]', enabled: true },
    { id: 'aws_access_key', label: 'api_key', pattern: '\\bAKIA[0-9A-Z]{16}\\b', flags: 'g', score: 0.99, replacement: '[AWS KEY REDACTED]', enabled: true },
    { id: 'ssn', label: 'ssn', pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b', flags: 'g', score: 0.99, replacement: '[SSN REDACTED]', enabled: true },
];

function normalizeCustomPatterns(storedPatterns, defaults) {
    const defaultList = Array.isArray(defaults) ? defaults : [];
    if (!Array.isArray(storedPatterns) || storedPatterns.length === 0) {
        return defaultList.slice();
    }

    const storedById = new Map();
    const extras = [];

    storedPatterns.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const id = String(entry.id || '').trim();
        if (!id) {
            extras.push(entry);
            return;
        }
        storedById.set(id, entry);
    });

    const mergedDefaults = defaultList.map((def) => {
        const id = String(def?.id || '').trim();
        if (!id || !storedById.has(id)) return def;
        const stored = storedById.get(id);
        if (id === 'openai_key' && String(stored.pattern || '') === LEGACY_OPENAI_KEY_PATTERN) {
            return { ...def, ...stored, pattern: def.pattern };
        }
        return { ...def, ...stored };
    });

    const mergedIds = new Set(mergedDefaults.map((entry) => String(entry?.id || '').trim()).filter(Boolean));
    const customOnly = storedPatterns.filter((entry) => {
        const id = String(entry?.id || '').trim();
        return id && !mergedIds.has(id);
    });

    return [...mergedDefaults, ...extras, ...customOnly];
}

function isSyntheticReplacementToken(value) {
    const text = String(value || '').trim();
    if (!text) return true;
    if (/^<\s*[A-Z][A-Z0-9_]{1,40}\s*>$/.test(text)) return true;
    if (/^\[[^\]]*redacted[^\]]*\]$/i.test(text)) return true;
    if (/<\s*[A-Z][A-Z0-9_]{1,40}\s*>/.test(text)) return true;
    if (/\[[^\]]*redacted[^\]]*\]/i.test(text)) return true;
    if (/\[\w+\s+REDACTED\]/i.test(text)) return true;
    return false;
}

function escapeHtmlForParagraph(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

function allocateAlias(label, ledger) {
    const normalized = String(label || 'pii')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'PII';
    const next = (ledger.counters.get(normalized) || 0) + 1;
    ledger.counters.set(normalized, next);
    return `${normalized}_${next}`;
}

function getSensitivityThreshold(sensitivity) {
    const map = { low: 0.75, medium: 0.62, high: 0.52 };
    return map[sensitivity] || 0.62;
}

function buildSignature(sourceText, detections, redactionMode) {
    const entries = detections.map((item) => `${item.label}:${item.start}:${item.end}`).join('|');
    return `${sourceText.length}:${redactionMode}:${entries}`;
}

function mergeWithExistingDetections(existingState, newDetections) {
    const existing = existingState.items;
    return newDetections.filter((nd) => {
        const textLower = String(nd.text || '').toLowerCase();
        const labelLower = String(nd.label || '').toLowerCase();
        return !existing.some((ex) => {
            const exTextLower = String(ex.text || '').toLowerCase();
            const exLabelLower = String(ex.label || '').toLowerCase();
            return exTextLower === textLower && exLabelLower === labelLower;
        });
    });
}

// ── normalizeCustomPatterns ───────────────────────────────────────────────────

section('normalizeCustomPatterns — empty stored returns default list');
{
    const result = normalizeCustomPatterns([], DEFAULT_CUSTOM_PATTERNS);
    assertEqual(result.length, DEFAULT_CUSTOM_PATTERNS.length, 'returns all defaults');
    assertEqual(result[0].id, 'openai_key', 'first default is openai_key');
}

section('normalizeCustomPatterns — null/non-array stored returns defaults');
{
    assertEqual(normalizeCustomPatterns(null, DEFAULT_CUSTOM_PATTERNS).length, DEFAULT_CUSTOM_PATTERNS.length, 'null stored → defaults');
    assertEqual(normalizeCustomPatterns('bad', DEFAULT_CUSTOM_PATTERNS).length, DEFAULT_CUSTOM_PATTERNS.length, 'string stored → defaults');
}

section('normalizeCustomPatterns — stored overrides default by id');
{
    const stored = [{ id: 'ssn', label: 'ssn', pattern: 'CUSTOM_PATTERN', flags: 'g', enabled: false }];
    const result = normalizeCustomPatterns(stored, DEFAULT_CUSTOM_PATTERNS);
    const ssn = result.find((p) => p.id === 'ssn');
    assert(ssn !== undefined, 'ssn entry still present');
    assertEqual(ssn.pattern, 'CUSTOM_PATTERN', 'stored pattern overrides default');
    assertEqual(ssn.enabled, false, 'stored enabled flag overrides default');
}

section('normalizeCustomPatterns — legacy openai_key pattern is upgraded');
{
    const stored = [{ id: 'openai_key', label: 'api_key', pattern: LEGACY_OPENAI_KEY_PATTERN, flags: 'g', enabled: true }];
    const result = normalizeCustomPatterns(stored, DEFAULT_CUSTOM_PATTERNS);
    const openai = result.find((p) => p.id === 'openai_key');
    assert(openai !== undefined, 'openai_key entry present');
    assert(openai.pattern !== LEGACY_OPENAI_KEY_PATTERN, 'legacy pattern replaced with modern pattern');
}

section('normalizeCustomPatterns — custom (non-default-id) pattern is appended');
{
    const stored = [{ id: 'my_custom_token', label: 'token', pattern: 'CUSTOM', flags: 'g', enabled: true }];
    const result = normalizeCustomPatterns(stored, DEFAULT_CUSTOM_PATTERNS);
    assertEqual(result.length, DEFAULT_CUSTOM_PATTERNS.length + 1, 'one extra entry appended');
    const custom = result.find((p) => p.id === 'my_custom_token');
    assert(custom !== undefined, 'custom pattern is in result');
}

section('normalizeCustomPatterns — entry with no id goes into extras');
{
    const stored = [{ label: 'thing', pattern: 'X', enabled: true }];  // no id
    const result = normalizeCustomPatterns(stored, DEFAULT_CUSTOM_PATTERNS);
    assertEqual(result.length, DEFAULT_CUSTOM_PATTERNS.length + 1, 'id-less entry appended');
}

// ── isSyntheticReplacementToken ───────────────────────────────────────────────

section('isSyntheticReplacementToken — empty / blank is synthetic');
{
    assert(isSyntheticReplacementToken(''), 'empty string is synthetic');
    assert(isSyntheticReplacementToken('   '), 'whitespace-only is synthetic');
    assert(isSyntheticReplacementToken(null), 'null is synthetic');
}

section('isSyntheticReplacementToken — exact alias tokens');
{
    assert(isSyntheticReplacementToken('<PERSON_1>'), 'exact alias token');
    assert(isSyntheticReplacementToken('<EMAIL_2>'), 'email alias token');
    assert(isSyntheticReplacementToken('<CREDIT_CARD_1>'), 'credit card alias token');
}

section('isSyntheticReplacementToken — exact redacted tokens');
{
    assert(isSyntheticReplacementToken('[NAME REDACTED]'), 'name redacted token');
    assert(isSyntheticReplacementToken('[API KEY REDACTED]'), 'api key redacted token');
    assert(isSyntheticReplacementToken('[SSN REDACTED]'), 'ssn redacted token');
}

section('isSyntheticReplacementToken — tokens embedded in text');
{
    assert(isSyntheticReplacementToken('Contact <PERSON_1> for details'), 'alias in sentence is synthetic');
    assert(isSyntheticReplacementToken('My email is [EMAIL REDACTED] ok'), 'redacted token in sentence is synthetic');
}

section('isSyntheticReplacementToken — normal text is NOT synthetic');
{
    assert(!isSyntheticReplacementToken('John Doe'), 'plain name is not synthetic');
    assert(!isSyntheticReplacementToken('john@example.com'), 'email is not synthetic');
    assert(!isSyntheticReplacementToken('Hello world!'), 'normal text is not synthetic');
}

// ── escapeHtmlForParagraph ────────────────────────────────────────────────────

section('escapeHtmlForParagraph — escapes HTML special characters');
{
    assertEqual(escapeHtmlForParagraph('a & b'), 'a &amp; b', 'ampersand escaped');
    assertEqual(escapeHtmlForParagraph('<script>'), '&lt;script&gt;', 'angle brackets escaped');
    assertEqual(escapeHtmlForParagraph('"hello"'), '&quot;hello&quot;', 'double quotes escaped');
    assertEqual(escapeHtmlForParagraph('\tfoo'), '&nbsp;&nbsp;&nbsp;&nbsp;foo', 'tab replaced with 4 nbsp');
}

section('escapeHtmlForParagraph — edge cases');
{
    assertEqual(escapeHtmlForParagraph(''), '', 'empty string returns empty');
    assertEqual(escapeHtmlForParagraph(null), '', 'null returns empty');
    assertEqual(escapeHtmlForParagraph('hello'), 'hello', 'plain text unchanged');
}

section('escapeHtmlForParagraph — XSS payload is neutralised');
{
    const xss = '<img src=x onerror="alert(1)">';
    const result = escapeHtmlForParagraph(xss);
    assert(!result.includes('<'), 'no raw < in output');
    assert(!result.includes('>'), 'no raw > in output');
    assert(result.includes('&lt;'), 'lt; entity present');
}

// ── allocateAlias ─────────────────────────────────────────────────────────────

section('allocateAlias — first allocation produces LABEL_1');
{
    const ledger = { counters: new Map() };
    assertEqual(allocateAlias('person', ledger), 'PERSON_1', 'first person alias is PERSON_1');
}

section('allocateAlias — subsequent allocations increment counter');
{
    const ledger = { counters: new Map() };
    allocateAlias('person', ledger);
    assertEqual(allocateAlias('person', ledger), 'PERSON_2', 'second person alias is PERSON_2');
    assertEqual(allocateAlias('person', ledger), 'PERSON_3', 'third person alias is PERSON_3');
}

section('allocateAlias — different labels have independent counters');
{
    const ledger = { counters: new Map() };
    allocateAlias('person', ledger);
    assertEqual(allocateAlias('email', ledger), 'EMAIL_1', 'first email alias is EMAIL_1');
    assertEqual(allocateAlias('person', ledger), 'PERSON_2', 'person counter continued from 1');
}

section('allocateAlias — label normalisation (spaces/dashes/underscores)');
{
    const ledger = { counters: new Map() };
    assertEqual(allocateAlias('credit_card', ledger), 'CREDIT_CARD_1', 'underscore kept');
    assertEqual(allocateAlias('date-of-birth', ledger), 'DATE_OF_BIRTH_1', 'dashes become underscores');
}

section('allocateAlias — empty/null label falls back to PII');
{
    const ledger = { counters: new Map() };
    assertEqual(allocateAlias('', ledger), 'PII_1', 'empty label → PII_1');
    assertEqual(allocateAlias(null, ledger), 'PII_2', 'null label → PII_2');
}

// ── getSensitivityThreshold ───────────────────────────────────────────────────

section('getSensitivityThreshold — known sensitivity levels');
{
    assertEqual(getSensitivityThreshold('low'), 0.75, 'low threshold is 0.75');
    assertEqual(getSensitivityThreshold('medium'), 0.62, 'medium threshold is 0.62');
    assertEqual(getSensitivityThreshold('high'), 0.52, 'high threshold is 0.52');
}

section('getSensitivityThreshold — unknown level defaults to medium');
{
    assertEqual(getSensitivityThreshold('extreme'), 0.62, 'unknown level → 0.62 (medium)');
    assertEqual(getSensitivityThreshold(''), 0.62, 'empty string → 0.62');
    assertEqual(getSensitivityThreshold(null), 0.62, 'null → 0.62');
    assertEqual(getSensitivityThreshold(undefined), 0.62, 'undefined → 0.62');
}

// ── buildSignature ────────────────────────────────────────────────────────────

section('buildSignature — same inputs produce identical signature');
{
    const dets = [{ label: 'person', start: 0, end: 4 }];
    const s1 = buildSignature('Hello John', dets, 'anonymize');
    const s2 = buildSignature('Hello John', dets, 'anonymize');
    assertEqual(s1, s2, 'identical inputs → identical signature');
}

section('buildSignature — different text produces different signature');
{
    const dets = [{ label: 'person', start: 0, end: 4 }];
    const s1 = buildSignature('Hello John', dets, 'anonymize');
    const s2 = buildSignature('Hello Jane extra text', dets, 'anonymize');
    assert(s1 !== s2, 'different text lengths → different signatures');
}

section('buildSignature — different redaction mode produces different signature');
{
    const dets = [{ label: 'person', start: 0, end: 4 }];
    const s1 = buildSignature('Hello', dets, 'anonymize');
    const s2 = buildSignature('Hello', dets, 'mask');
    assert(s1 !== s2, 'different mode → different signature');
}

section('buildSignature — different detections produce different signature');
{
    const dets1 = [{ label: 'person', start: 0, end: 4 }];
    const dets2 = [{ label: 'email', start: 0, end: 15 }];
    const s1 = buildSignature('Hello', dets1, 'anonymize');
    const s2 = buildSignature('Hello', dets2, 'anonymize');
    assert(s1 !== s2, 'different detections → different signature');
}

section('buildSignature — empty detections');
{
    const s = buildSignature('text', [], 'anonymize');
    assertEqual(typeof s, 'string', 'returns a string for empty detections');
    assert(s.includes('4:anonymize'), 'contains length and mode');
}

// ── mergeWithExistingDetections ───────────────────────────────────────────────

section('mergeWithExistingDetections — new detection with same text+label filtered out');
{
    const existingState = {
        items: [{ text: 'John', label: 'person', start: 0, end: 4 }]
    };
    const newDets = [{ text: 'John', label: 'person', start: 0, end: 4 }];
    const result = mergeWithExistingDetections(existingState, newDets);
    assertEqual(result.length, 0, 'duplicate text+label is filtered');
}

section('mergeWithExistingDetections — case-insensitive text+label match');
{
    const existingState = {
        items: [{ text: 'JOHN', label: 'PERSON', start: 0, end: 4 }]
    };
    const newDets = [{ text: 'john', label: 'person', start: 5, end: 9 }];
    const result = mergeWithExistingDetections(existingState, newDets);
    assertEqual(result.length, 0, 'case-insensitive duplicate is filtered');
}

section('mergeWithExistingDetections — different text kept');
{
    const existingState = {
        items: [{ text: 'John', label: 'person', start: 0, end: 4 }]
    };
    const newDets = [{ text: 'Jane', label: 'person', start: 10, end: 14 }];
    const result = mergeWithExistingDetections(existingState, newDets);
    assertEqual(result.length, 1, 'different text is kept');
    assertEqual(result[0].text, 'Jane', 'correct detection returned');
}

section('mergeWithExistingDetections — different label kept');
{
    const existingState = {
        items: [{ text: 'John', label: 'person', start: 0, end: 4 }]
    };
    const newDets = [{ text: 'John', label: 'location', start: 0, end: 4 }];
    const result = mergeWithExistingDetections(existingState, newDets);
    assertEqual(result.length, 1, 'same text but different label is kept');
}

section('mergeWithExistingDetections — empty new detections');
{
    const existingState = { items: [{ text: 'John', label: 'person', start: 0, end: 4 }] };
    const result = mergeWithExistingDetections(existingState, []);
    assertEqual(result.length, 0, 'empty new detections returns empty');
}

section('mergeWithExistingDetections — empty existing state keeps all new');
{
    const existingState = { items: [] };
    const newDets = [
        { text: 'John', label: 'person', start: 0, end: 4 },
        { text: 'test@example.com', label: 'email', start: 10, end: 26 },
    ];
    const result = mergeWithExistingDetections(existingState, newDets);
    assertEqual(result.length, 2, 'no existing items → all new detections kept');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) {
    console.error('SOME TESTS FAILED');
    process.exit(1);
} else {
    console.log('All tests passed.');
}
