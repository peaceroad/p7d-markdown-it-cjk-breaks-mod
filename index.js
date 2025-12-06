import eastAsianWidthModule from 'eastasianwidth';

const { eastAsianWidth } = eastAsianWidthModule;
const ASCII_PRINTABLE_MIN = 0x21;
const ASCII_PRINTABLE_MAX = 0x7E;
const IDEOGRAPHIC_SPACE = '\u3000';
const DEFAULT_PUNCTUATION_TARGETS = ['！', '？', '⁉', '！？', '？！', '!?', '?!'];
const DEFAULT_PUNCTUATION_CONFIG = create_punctuation_config(DEFAULT_PUNCTUATION_TARGETS);


function is_surrogate(c1, c2) {
  return c1 >= 0xD800 && c1 <= 0xDBFF && c2 >= 0xDC00 && c2 <= 0xDFFF;
}


function is_hangul(c) {
  // require('unicode-10.0.0/Script/Hangul/regex')
  /* eslint-disable max-len */
  return /[\u1100-\u11FF\u302E\u302F\u3131-\u318E\u3200-\u321E\u3260-\u327E\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/.test(c);
  /* eslint-enable max-len */
}


function create_punctuation_config(targets) {
  var sequences = new Set();
  var maxLength = 0;

  for (var i = 0; i < targets.length; i++) {
    var value = targets[i];
    if (typeof value !== 'string' || value.length === 0) continue;
    sequences.add(value);
    if (value.length > maxLength) maxLength = value.length;
  }

  return { sequences: sequences, maxLength: maxLength };
}


function resolve_punctuation_space_option(opts) {
  if (!opts || !opts.spaceAfterPunctuation) return '';

  var option = opts.spaceAfterPunctuation;
  if (option === 'half') return ' ';
  if (option === 'full') return IDEOGRAPHIC_SPACE;
  if (typeof option === 'string' && option.length > 0) return option;
  return '';
}


function resolve_punctuation_targets(opts) {
  if (!opts || !opts.spaceAfterPunctuationTargets) return DEFAULT_PUNCTUATION_CONFIG;

  var customTargets = opts.spaceAfterPunctuationTargets;
  if (typeof customTargets === 'string') customTargets = [ customTargets ];
  if (!Array.isArray(customTargets) || customTargets.length === 0) return DEFAULT_PUNCTUATION_CONFIG;

  var config = create_punctuation_config(customTargets);
  return config.sequences.size === 0 ? DEFAULT_PUNCTUATION_CONFIG : config;
}


function should_insert_punctuation_space(last, trailing, next, punctuationSpace, punctuationConfig) {
  if (!punctuationSpace || !punctuationConfig) return false;
  if (!last || !next) return false;
  if (next === '\u200b') return false;
  if (!matches_punctuation_sequence(trailing, punctuationConfig)) return false;

  return is_printable_ascii(next) || is_fullwidth_or_wide(next);
}


function matches_punctuation_sequence(trailing, punctuationConfig) {
  if (!trailing || !punctuationConfig || punctuationConfig.maxLength === 0) return false;

  var sequences = punctuationConfig.sequences;
  var maxLength = Math.min(trailing.length, punctuationConfig.maxLength);

  for (var len = maxLength; len > 0; len--) {
    var fragment = trailing.slice(-len);
    if (sequences.has(fragment)) return true;
  }
  return false;
}


function is_printable_ascii(ch) {
  if (!ch) return false;
  var code = ch.charCodeAt(0);
  return code >= ASCII_PRINTABLE_MIN && code <= ASCII_PRINTABLE_MAX;
}


function is_fullwidth_or_wide(ch) {
  if (!ch) return false;
  var width = eastAsianWidth(ch);
  return width === 'F' || width === 'W';
}


function process_inlines(tokens, state, opts) {
  var i, j, last, trailing, next, c1, c2, remove_break;
  var either = opts && opts.either;
  var punctuationSpace = resolve_punctuation_space_option(opts);
  var punctuationConfig = punctuationSpace ? resolve_punctuation_targets(opts) : null;
  var maxPunctuationLength = punctuationConfig ? punctuationConfig.maxLength : 0;

  for (i = 0; i < tokens.length; i++) {
    var isSoftbreakToken = tokens[i].type === 'softbreak';
    var isTextBreakToken = tokens[i].type === 'text' && tokens[i].content === '\n';
    if (!isSoftbreakToken && !isTextBreakToken) continue;

    // default last/next character to space
    last = next = ' ';
    trailing = '';

    for (j = i - 1; j >= 0; j--) {
      if (tokens[j].type !== 'text') continue;

      var textContent = tokens[j].content;
      c1 = textContent.charCodeAt(textContent.length - 2);
      c2 = textContent.charCodeAt(textContent.length - 1);

      last = textContent.slice(is_surrogate(c1, c2) ? -2 : -1);
      trailing = maxPunctuationLength > 0 ?
        textContent.slice(-maxPunctuationLength) :
        textContent.slice(-1);
      break;
    }

    for (j = i + 1; j < tokens.length; j++) {
      if (tokens[j].type !== 'text') continue;

      c1 = tokens[j].content.charCodeAt(0);
      c2 = tokens[j].content.charCodeAt(1);

      next = tokens[j].content.slice(0, is_surrogate(c1, c2) ? 2 : 1);
      break;
    }

    remove_break = false;

    // remove newline if it's adjacent to ZWSP
    if (last === '\u200b' || next === '\u200b') remove_break = true;

    // remove newline if both characters AND/OR fullwidth (F), wide (W) or
    // halfwidth (H), but not Hangul
    var tLast = /^[FWH]$/.test(eastAsianWidth(last));
    var tNext = /^[FWH]$/.test(eastAsianWidth(next));
    if (either ? tLast || tNext : tLast && tNext) {
      if (!is_hangul(last) && !is_hangul(next)) remove_break = true;
    }

    if (remove_break) {
      tokens[i].type    = 'text';
      tokens[i].content = should_insert_punctuation_space(last, trailing, next, punctuationSpace, punctuationConfig) ?
        punctuationSpace :
        '';
    }
  }
}


export default function cjk_breaks_plugin(md, opts) {
  function cjk_breaks(state) {
    for (var blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
      if (state.tokens[blkIdx].type !== 'inline') continue;

      process_inlines(state.tokens[blkIdx].children, state, opts);
    }
  }
  md.core.ruler.push('cjk_breaks', cjk_breaks);
}
