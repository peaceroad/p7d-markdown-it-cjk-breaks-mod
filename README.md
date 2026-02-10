# markdown-it-cjk-breaks

## k_taka's additional features

### Punctuation spacing options

`spaceAfterPunctuation` inserts spacing only when this plugin suppresses a line break after punctuation. The second-pass matcher also covers inline markup starts (inline code, links/autolinks, images, inline HTML) as long as the raw source contains a visible newline boundary; if a `softbreak` remains, no spacing is injected.

`spaceAfterPunctuationTargets` lets you replace the default trigger list with a custom string or array. Defaults are `['！', '？', '⁉', '！？', '？！', '!?', '?!', '.', ':']`. To disable punctuation spacing while still setting `spaceAfterPunctuation`, pass `spaceAfterPunctuationTargets: []` (or `null`/`false`). Use `spaceAfterPunctuationTargetsAdd` to append triggers and `spaceAfterPunctuationTargetsRemove` to drop items from the resolved list.

`spaceAfterPunctuation` accepts `'half'` for ASCII space, `'full'` for an ideographic space, or any custom string via a literal value. Raw matching is strict, so escapes or entities (e.g. `&amp;`) right before the newline can prevent a match and skip spacing (safe-fail behavior).

```js
import MarkdownIt from 'markdown-it';
import cjkBreaks from '@peaceroad/markdown-it-cjk-breaks-mod';

// Full-width spacing after default punctuation
const mdFull = MarkdownIt({ html: true }).use(cjkBreaks, {
  spaceAfterPunctuation: 'full',
  either: true
});
mdFull.render('こんにちは！\nWorld');
// <p>こんにちは！　World</p>

// Half-width spacing for ASCII-friendly mixes
const mdHalf = MarkdownIt({ html: true }).use(cjkBreaks, {
  spaceAfterPunctuation: 'half',
  either: true
});
mdHalf.render('こんにちは！\nWorld');
// <p>こんにちは！ World</p>

// Inline code and links are supported when a raw newline is present
mdHalf.render('漢！\n`code`');
// <p>漢！ <code>code</code></p>
mdHalf.render('漢！\n[link](url)');
// <p>漢！ <a href="url">link</a></p>

// Custom punctuation triggers (replaces defaults)
const mdCustom = MarkdownIt({ html: true }).use(cjkBreaks, {
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['??']
});
mdCustom.render('Hello??\nWorld');
// <p>Hello?? World</p>
```

### Softbreak normalization for other plugins
Even with stock markdown-it, emphasis markers can leave inline `text` tokens that still embed `\n`. When `normalizeSoftBreaks: true`, those tokens are split back into proper `softbreak` entries before CJK suppression runs, so a trailing `***漢***\n字` behaves the same way regardless of how markdown-it represented it internally.

```js
// Normalize softbreaks emitted by other plugins first
const mdStrongJaFriendly = MarkdownIt({ html: true }).use(cjkBreaks, {
  normalizeSoftBreaks: true,
  either: true
});
mdStrongJaFriendly.render('**漢**\nb');
// <p><strong>漢</strong>b</p>
```

`@peaceroad/markdown-it-strong-ja` also emit newline-containing `text` nodes after their own rewrites. The same option keeps behavior consistent no matter which order you register plugins.

## sup39's additional features

- [@sup39/markdown-it-cjk-breaks](https://npmjs.com/package/@sup39/markdown-it-cjk-breaks)

Provide an optional option `either`(default: false, which works as original version) to determine whether allowing removing linebreak when either the character before **OR** after the linebreak is east asian character.

```js
import MarkdownIt from 'markdown-it';
import cjkBreaks from '@peaceroad/markdown-it-cjk-breaks-mod';

const md = MarkdownIt();
md.use(cjkBreaks, { either: true }); // << set either to true

md.render(`
あおえ
うい
aoe
ui
`);

// returns:
//
//<p>あおえういaoe <!-- linebreak between `い` and `a` is removed -->
//ui</p>
```

## Original

- [markdown-it-cjk-breaks](https://github.com/markdown-it/markdown-it-cjk-breaks)

> Plugin for [markdown-it](https://github.com/markdown-it/markdown-it) that suppresses linebreaks between east asian characters.

Normally newlines in a markdown text get rendered as newlines in output html text. Then browsers will usually render those newlines as whitespace (more smart behavior is included in w3c drafts, but not actually implemented by vendors).

This plugin finds and removes newlines that cannot be converted to space, algorithm matches [CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/#line-break-transform):

- If the character immediately before or immediately after the segment break is the zero-width space character (U+200B), then the break is removed, leaving behind the zero-width space.
- Otherwise, if the East Asian Width property [UAX11] of both the character before and after the segment break is F, W, or H (not A), and neither side is Hangul, then the segment break is removed.
- Otherwise, the segment break is converted to a space (U+0020).

## Install

```bash
yarn add markdown-it-cjk-breaks
```


## Usage

```js
import MarkdownIt from 'markdown-it';
import cjkBreaks from '@peaceroad/markdown-it-cjk-breaks-mod';

const md = MarkdownIt();
md.use(cjkBreaks);

md.render(`
あおえ
うい
aoe
ui
`);

// returns:
//
//<p>あおえうい
//aoe
//ui</p>
```


## License

- markdown-it/markdown-it-cjk-breaks: [MIT](https://github.com/markdown-it/markdown-it-cjk-breaks/blob/master/LICENSE)
- @sup39/markdown-it-cjk-breaks: [MIT](https://www.npmjs.com/package/@sup39/markdown-it-cjk-breaks?activeTab=code)
- @peaceroad/markdown-it-cjk-breaks-mod: [MIT](https://github.com/peaceroad/p7d-markdown-it-cjk-breaks-mod/blob/main/LICENSE)
