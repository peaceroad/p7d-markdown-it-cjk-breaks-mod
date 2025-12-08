# markdown-it-cjk-breaks

## k_taka's additional features

### Punctuation spacing options

Fine-tune the trigger list with `spaceAfterPunctuationTargets`. Provide either a single string or an array and every exact match becomes eligible for automatic spacing. Defaults remain `['！', '？', '⁉', '！？', '？！', '!?', '?!']`.

Use `spaceAfterPunctuation` to inject a space every time this plugin suppresses a line break after punctuation. Accepts `'half'` for ASCII space, `'full'` for an ideographic space, or any custom string via a literal value.

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

// Custom punctuation triggers
const mdCustom = MarkdownIt({ html: true }).use(cjkBreaks, {
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['??']
});
mdCustom.render('Hello??\nWorld');
// <p>Hello?? World</p>
```

### Softbreak normalization for other plugins
Some plugins (notably `@peaceroad/markdown-it-strong-ja`) emit inline text nodes that still contain `\n`. Set `normalizeSoftBreaks: true` so those nodes are split back into softbreak tokens before the CJK break rules run, keeping behavior consistent regardless of plugin order.

```js
// Normalize softbreaks emitted by other plugins first
const mdStrongJaFriendly = MarkdownIt({ html: true }).use(cjkBreaks, {
  normalizeSoftBreaks: true,
  either: true
});
mdStrongJaFriendly.render('**漢**\nb');
// <p><strong>漢</strong>b</p>
```

## sup39's additional features
Provide an optional option `either`(default: false, which works as original version) to determine whether allowing removing linebreak when either the character before **OR** after the linebreak is east asian character.

```js
var md = require('markdown-it')();
var cjk_breaks = require('markdown-it-cjk-breaks');

md.use(cjk_breaks, {either: true}); // << set either to true

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
[![Build Status](https://img.shields.io/travis/markdown-it/markdown-it-cjk-breaks/master.svg?style=flat)](https://travis-ci.org/markdown-it/markdown-it-cjk-breaks)
[![NPM version](https://img.shields.io/npm/v/markdown-it-cjk-breaks.svg?style=flat)](https://www.npmjs.org/package/markdown-it-cjk-breaks)
[![Coverage Status](https://coveralls.io/repos/markdown-it/markdown-it-cjk-breaks/badge.svg?branch=master&service=github)](https://coveralls.io/github/markdown-it/markdown-it-cjk-breaks?branch=master)

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
var md = require('markdown-it')();
var cjk_breaks = require('markdown-it-cjk-breaks');

md.use(cjk_breaks);

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

[MIT](https://github.com/markdown-it/markdown-it-cjk-breaks/blob/master/LICENSE)
[MIT](https://github.com/sup39/markdown-it-cjk-breaks/blob/master/LICENSE)
