# @peaceroad/markdown-it-cjk-breaks-mod

`@peaceroad/markdown-it-cjk-breaks-mod` is a markdown-it plugin that suppresses line breaks between CJK text and optionally injects spacing after configured punctuation when a break is removed. It is designed for mixed Japanese/CJK + ASCII documents where default newline handling often produces unwanted spaces or breaks.

This package is a fork lineage of [`markdown-it-cjk-breaks`](https://github.com/markdown-it/markdown-it-cjk-breaks) and [`@sup39/markdown-it-cjk-breaks`](https://www.npmjs.com/package/@sup39/markdown-it-cjk-breaks). It keeps the original CJK break suppression behavior, adds the `either` mode introduced by `@sup39`, and extends it with punctuation-spacing controls and softbreak normalization for plugin-heavy markdown-it pipelines.

## Install

```
npm i @peaceroad/markdown-it-cjk-breaks-mod
```

## Quick Start

```js
import MarkdownIt from 'markdown-it';
import cjkBreaks from '@peaceroad/markdown-it-cjk-breaks-mod';

const md = MarkdownIt({ html: true }).use(cjkBreaks);

md.render('あおえ\nうい');
// <p>あおえうい</p>
```

## Options

- `either`  
  Type: `boolean`  
  Default: `false`  
  Remove a break when either side (instead of both sides) is CJK-width (`F/W/H`), still excluding Hangul.  
  Origin: inherited from `@sup39/markdown-it-cjk-breaks`.

The options below are extensions added by this project:

- `normalizeSoftBreaks`  
  Type: `boolean`  
  Default: `false`  
  Split newline-containing `text` tokens into explicit `softbreak` tokens before processing. Useful with plugins that rewrite inline tokens.
- `spaceAfterPunctuation`  
  Type: `'half' | 'full' | string`  
  Default: disabled  
  Insert spacing only when this plugin removes a break after a target sequence. `'half'` => `' '`, `'full'` => `\u3000`.
- `spaceAfterPunctuationTargets`  
  Type: `string | string[] | [] | null | false`  
  Default: `['！', '？', '⁉', '！？', '？！', '!?', '?!', '.', ':']`  
  Replace the target sequence set. `[]`, `null`, or `false` explicitly disable target matching.
- `spaceAfterPunctuationTargetsAdd`  
  Type: `string | string[]`  
  Default: unset  
  Append target sequences after base resolution.
- `spaceAfterPunctuationTargetsRemove`  
  Type: `string | string[]`  
  Default: unset  
  Remove sequences from the resolved target list.

## Punctuation Spacing Examples

```js
import MarkdownIt from 'markdown-it';
import cjkBreaks from '@peaceroad/markdown-it-cjk-breaks-mod';

const mdHalf = MarkdownIt({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half'
});

mdHalf.render('こんにちは！\nWorld');
// <p>こんにちは！ World</p>

const mdFull = MarkdownIt({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'full'
});

mdFull.render('こんにちは！\nWorld');
// <p>こんにちは！　World</p>

const mdCustom = MarkdownIt({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['??']
});

mdCustom.render('Hello??\nWorld');
// <p>Hello?? World</p>
```

## Softbreak Normalization Example

```js
import MarkdownIt from 'markdown-it';
import cjkBreaks from '@peaceroad/markdown-it-cjk-breaks-mod';

const md = MarkdownIt({ html: true }).use(cjkBreaks, {
  either: true,
  normalizeSoftBreaks: true
});

md.render('**漢**\nb');
// <p><strong>漢</strong>b</p>
```

## Behavior Notes

- Break suppression follows CSS Text Level 3 style rules used by upstream: ZWSP-adjacent breaks are removed first; otherwise width-class checks are applied with Hangul exclusion.
- Punctuation spacing is never global formatting. It only runs when this plugin actually removes the break.
- The second punctuation pass handles inline markup boundaries (inline code, links/autolinks, images, inline HTML) when a raw newline boundary is verifiably present.
- Matching is fail-closed: if raw boundary reconstruction cannot be proven, no space is inserted.
- If a `softbreak` is still active between candidate tokens, spacing insertion is skipped.

## Compatibility

- Module format: ESM (`"type": "module"`).
- Runtime: works in Node.js ESM environments and browser/VSCode bundling setups that support ESM dependencies.
- Runtime plugin code uses no Node-only APIs (`fs`, `path`, etc.); those are confined to tests.
- For plugin chains that rewrite inline text (for example `@peaceroad/markdown-it-strong-ja`), prefer `normalizeSoftBreaks: true` for stable behavior.

## Upstream And Credits

- Original: [markdown-it/markdown-it-cjk-breaks](https://github.com/markdown-it/markdown-it-cjk-breaks)
- Fork enhancement (`either`): [@sup39/markdown-it-cjk-breaks](https://www.npmjs.com/package/@sup39/markdown-it-cjk-breaks)
- Current package: [@peaceroad/markdown-it-cjk-breaks-mod](https://github.com/peaceroad/p7d-markdown-it-cjk-breaks-mod)

## License

- markdown-it/markdown-it-cjk-breaks: [MIT](https://github.com/markdown-it/markdown-it-cjk-breaks/blob/master/LICENSE)
- @sup39/markdown-it-cjk-breaks: [MIT](https://www.npmjs.com/package/@sup39/markdown-it-cjk-breaks?activeTab=code)
- @peaceroad/markdown-it-cjk-breaks-mod: [MIT](https://github.com/peaceroad/p7d-markdown-it-cjk-breaks-mod/blob/main/LICENSE)
