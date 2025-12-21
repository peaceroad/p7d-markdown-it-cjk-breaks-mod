# Agents note for @peaceroad/markdown-it-cjk-breaks-mod

This repository powers the `markdown-it-cjk-breaks` plugin. The notes below focus on the runtime workflow inside `index.js`.

## Core processing pipeline (`index.js`)
1. **Option resolution**
   - `resolve_punctuation_space_option` normalizes `spaceAfterPunctuation` (`'half'`, `'full'`, or literal strings). When unset or invalid, spacing logic is skipped.
   - `resolve_punctuation_targets` builds a deduplicated lookup set (tracking the longest target length) based on defaults or `spaceAfterPunctuationTargets` (which replaces defaults), then applies `spaceAfterPunctuationTargetsAdd` and `spaceAfterPunctuationTargetsRemove`; it returns `null` when targets are explicitly disabled (`[]`, `null`, or `false`). Defaults are `['！', '？', '⁉', '！？', '？！', '!?', '?!', '.', ':']`.
   - Context (`ctx`) stores derived booleans such as `either`, `normalizeSoftBreaks`, and `considerInlineBoundaries` (true only when `normalizeSoftBreaks` is false), plus cached punctuation data (`punctuationSpace`, `punctuationConfig`, `maxPunctuationLength`).
2. **Rule registration**
   - `cjk_breaks_plugin` guards against missing `md.core.ruler` and registers a single core rule named `cjk_breaks`. All heavy lifting happens during this pass over inline tokens.
3. **Inline preprocessing**
   - For each inline token list, `process_inlines` optionally calls `normalize_text_tokens`, rebuilding token lists to split newline-containing text nodes back into `softbreak` tokens so downstream logic has consistent boundaries.
   - Utility helpers (`split_text_token`, `clone_text_token`, `create_softbreak_token`) preserve token metadata (levels, attrs, meta) when rewriting nodes via `copy_token_base`.
4. **Line-break suppression**
   - The main loop inspects each `softbreak` or newline-only `text` token using a running last-text snapshot plus `build_next_text_info` (precomputed next non-empty text indices; skipped-empty flags are tracked only when `considerInlineBoundaries` is enabled).
   - `get_cjk_width_class` short-circuits ASCII ranges, while `process_inlines` caches width classes per pass to reduce `eastAsianWidth` calls.
   - Break removal triggers immediately when adjacent to ZWSP (`\u200b`), otherwise removal follows the East Asian width checks (both or either side depending on `either`), excluding Hangul (`is_hangul`).
   - Inline-boundary gaps (caused by removed empty text nodes) can be respected by toggling `considerInlineBoundaries`.
5. **Punctuation spacing injection**
   - When a break is removed, we remember whether the trailing fragment matched a target sequence and, if the next glyph is printable ASCII or wide/fullwidth, emit the configured spacing token in place of the break.
   - A second pass (`apply_missing_punctuation_spacing`) ensures punctuation followed by inline markup still receives spacing by scanning ahead to the next visible fragment and verifying that the raw source contained a newline boundary.
   - `apply_single_text_token_spacing` handles degenerate cases where the entire inline content collapsed into a single text token.
6. **Supporting helpers**
   - `raw_boundary_includes_newline` tracks search positions so repeated lookups remain linear-time.
   - `derive_after_fragment` and `insert_space_token` abstract token-kind differences when injecting synthetic whitespace.

## reminders
- Keep `index.js` independent from strong-ja rule ordering; coordination belongs in `@peaceroad/markdown-it-strong-ja`.
- When changing behavior, add fixtures under `test/examples-*.txt` and wire them through `test/test.js`. Each fixture doubles as living documentation.
