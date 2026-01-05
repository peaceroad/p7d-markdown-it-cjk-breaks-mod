import eastAsianWidthModule from 'eastasianwidth';

const { eastAsianWidth } = eastAsianWidthModule;
const ASCII_PRINTABLE_MIN = 0x21;
const ASCII_PRINTABLE_MAX = 0x7E;
const IDEOGRAPHIC_SPACE = '\u3000';
const DEFAULT_PUNCTUATION_TARGETS = ['！', '？', '⁉', '！？', '？！', '!?', '?!', '.', ':'];
const DEFAULT_PUNCTUATION_CONFIG = create_punctuation_config(DEFAULT_PUNCTUATION_TARGETS);
/* eslint-disable max-len */
// require('unicode-10.0.0/Script/Hangul/regex')
const HANGUL_RE = /[\u1100-\u11FF\u302E\u302F\u3131-\u318E\u3200-\u321E\u3260-\u327E\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/;
/* eslint-enable max-len */
const WHITESPACE_RE = /\s/;
const WHITESPACE_LEAD_RE = /^\s/;
const WHITESPACE_TRAIL_RE = /\s$/;


function is_surrogate(c1, c2) {
  return c1 >= 0xD800 && c1 <= 0xDBFF && c2 >= 0xDC00 && c2 <= 0xDFFF;
}


function is_hangul(c) {
  return HANGUL_RE.test(c);
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
  if (!opts) return DEFAULT_PUNCTUATION_CONFIG;

  var hasCustomTargets = Object.prototype.hasOwnProperty.call(opts, 'spaceAfterPunctuationTargets');
  var addTargets = opts.spaceAfterPunctuationTargetsAdd;
  var removeTargets = opts.spaceAfterPunctuationTargetsRemove;
  if (!hasCustomTargets && addTargets === undefined && removeTargets === undefined) {
    return DEFAULT_PUNCTUATION_CONFIG;
  }
  var baseTargets;

  if (!hasCustomTargets) {
    baseTargets = DEFAULT_PUNCTUATION_TARGETS;
  } else {
    var customTargets = opts.spaceAfterPunctuationTargets;
    if (customTargets === null || customTargets === false) return null;
    if (typeof customTargets === 'string') {
      if (customTargets.length === 0) return null;
      baseTargets = [ customTargets ];
    } else if (Array.isArray(customTargets)) {
      if (customTargets.length === 0) return null;
      baseTargets = customTargets;
    } else {
      baseTargets = DEFAULT_PUNCTUATION_TARGETS;
    }
  }

  if (addTargets !== undefined) {
    var addList = [];
    if (typeof addTargets === 'string') {
      if (addTargets.length > 0) addList = [ addTargets ];
    } else if (Array.isArray(addTargets)) {
      addList = addTargets;
    }
    if (addList.length > 0) {
      baseTargets = baseTargets.concat(addList);
    }
  }

  if (removeTargets !== undefined) {
    var removeList = [];
    if (typeof removeTargets === 'string') {
      if (removeTargets.length > 0) removeList = [ removeTargets ];
    } else if (Array.isArray(removeTargets)) {
      removeList = removeTargets;
    }
    if (removeList.length > 0) {
      var removeConfig = create_punctuation_config(removeList);
      if (removeConfig.sequences.size > 0) {
        baseTargets = baseTargets.filter(function (target) {
          return !removeConfig.sequences.has(target);
        });
      }
    }
  }

  var config = create_punctuation_config(baseTargets);
  return config.sequences.size === 0 ? null : config;
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
  var width = get_cjk_width_class(ch);
  return width === 'F' || width === 'W';
}


function get_cjk_width_class(ch) {
  if (!ch) return '';
  var codePoint = ch.codePointAt(0);
  if (codePoint !== undefined && codePoint <= ASCII_PRINTABLE_MAX) return '';
  var width = eastAsianWidth(ch);
  return width === 'F' || width === 'W' || width === 'H' ? width : '';
}

function build_next_text_info(tokens, trackSkippedEmpty) {
  var nextTextIndex = new Array(tokens.length);
  var nextSkippedEmpty = trackSkippedEmpty ? new Array(tokens.length) : null;
  var nextNonEmpty = -1;
  var sawEmpty = false;

  for (var idx = tokens.length - 1; idx >= 0; idx--) {
    nextTextIndex[idx] = nextNonEmpty;
    if (trackSkippedEmpty) nextSkippedEmpty[idx] = sawEmpty;

    var token = tokens[idx];
    if (!token || token.type !== 'text') continue;

    if (!token.content) {
      sawEmpty = true;
      continue;
    }

    nextNonEmpty = idx;
    sawEmpty = false;
  }

  return {
    nextTextIndex: nextTextIndex,
    nextSkippedEmpty: nextSkippedEmpty
  };
}


function process_inlines(tokens, state, ctx, inlineToken) {
  var i, last, next, c1, c2, remove_break;
  var either = ctx.either;
  var normalizeSoftBreaks = ctx.normalizeSoftBreaks;
  var punctuationSpace = ctx.punctuationSpace;
  var punctuationConfig = ctx.punctuationConfig;
  var maxPunctuationLength = ctx.maxPunctuationLength;
  var considerInlineBoundaries = ctx.considerInlineBoundaries;
  var needsPunctuation = punctuationSpace && punctuationConfig && maxPunctuationLength > 0;

  if (!tokens || tokens.length === 0) return;
  if (normalizeSoftBreaks) normalize_text_tokens(tokens);

  var nextTextIndex = null;
  var nextSkippedEmpty = null;
  var widthCache = null;
  function get_cached_width_class(ch) {
    if (!ch) return '';
    if (!widthCache) {
      var firstWidth = get_cjk_width_class(ch);
      if (firstWidth === '') {
        var codePoint = ch.codePointAt(0);
        if (codePoint !== undefined && codePoint <= ASCII_PRINTABLE_MAX) return '';
        widthCache = Object.create(null);
        widthCache[ch] = '';
        return '';
      }
      widthCache = Object.create(null);
      widthCache[ch] = firstWidth;
      return firstWidth;
    }
    var cached = widthCache[ch];
    if (cached !== undefined) return cached;
    var width = get_cjk_width_class(ch);
    widthCache[ch] = width;
    return width;
  }

  var lastTextContent = '';
  var hasLastText = false;
  var sawEmptySinceLast = false;

  for (i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    var isSoftbreakToken = token.type === 'softbreak';
    var isTextBreakToken = token.type === 'text' && token.content === '\n';
    if (isSoftbreakToken || isTextBreakToken) {
      if (!nextTextIndex) {
        var nextInfo = build_next_text_info(tokens, considerInlineBoundaries);
        nextTextIndex = nextInfo.nextTextIndex;
        nextSkippedEmpty = nextInfo.nextSkippedEmpty;
      }
      // default last/next character to space
      last = next = ' ';
      var skippedEmptyBefore = false;
      var skippedEmptyAfter = false;
      if (considerInlineBoundaries) {
        skippedEmptyBefore = sawEmptySinceLast;
        skippedEmptyAfter = nextSkippedEmpty ? nextSkippedEmpty[i] : false;
      }

      if (hasLastText) {
        c1 = lastTextContent.charCodeAt(lastTextContent.length - 2);
        c2 = lastTextContent.charCodeAt(lastTextContent.length - 1);
        last = lastTextContent.slice(is_surrogate(c1, c2) ? -2 : -1);
      }

      var nextIdx = nextTextIndex[i];
      if (nextIdx !== -1) {
        var nextContent = tokens[nextIdx].content || '';
        if (nextContent) {
          c1 = nextContent.charCodeAt(0);
          c2 = nextContent.charCodeAt(1);
          next = nextContent.slice(0, is_surrogate(c1, c2) ? 2 : 1);
        }
      }

      remove_break = false;
      var nextWidthClass = '';
      var nextWidthComputed = false;

      // remove newline if it's adjacent to ZWSP
      if (last === '\u200b' || next === '\u200b') {
        remove_break = true;
      } else {
        // remove newline if both characters AND/OR fullwidth (F), wide (W) or
        // halfwidth (H), but not Hangul
        var lastWidthClass = get_cached_width_class(last);
        if (either || lastWidthClass) {
          nextWidthClass = get_cached_width_class(next);
          nextWidthComputed = true;
        }

        var tLast = lastWidthClass !== '';
        var tNext = nextWidthComputed ? nextWidthClass !== '' : false;

        if (considerInlineBoundaries && (skippedEmptyBefore || skippedEmptyAfter) && tLast && tNext) {
          tLast = false;
          tNext = false;
        }
        if (either ? tLast || tNext : tLast && tNext) {
          if (!is_hangul(last) && !is_hangul(next)) remove_break = true;
        }
      }

      if (remove_break) {
        var insertPunctuationSpace = false;
        if (needsPunctuation && last && next && next !== '\u200b') {
          var trailing = hasLastText ? lastTextContent.slice(-maxPunctuationLength) : '';
          if (matches_punctuation_sequence(trailing, punctuationConfig)) {
            if (!nextWidthComputed) {
              nextWidthClass = get_cached_width_class(next);
            }
            var nextIsFullwidthOrWide = nextWidthClass === 'F' || nextWidthClass === 'W';
            if (nextIsFullwidthOrWide || is_printable_ascii(next)) insertPunctuationSpace = true;
          }
        }
        token.type    = 'text';
        token.content = insertPunctuationSpace ? punctuationSpace : '';
      }
    }

    if (token.type === 'text') {
      if (!token.content) {
        if (considerInlineBoundaries) sawEmptySinceLast = true;
      } else {
        lastTextContent = token.content;
        hasLastText = true;
        if (considerInlineBoundaries) sawEmptySinceLast = false;
      }
    }
  }

  if (needsPunctuation) {
    apply_missing_punctuation_spacing(tokens, inlineToken, punctuationSpace, punctuationConfig);
  }
}


function normalize_text_tokens(tokens) {
  var normalized = null;

  for (var idx = 0; idx < tokens.length; idx++) {
    var token = tokens[idx];
    if (token.type !== 'text' || !token.content || token.content.indexOf('\n') === -1) {
      if (normalized) normalized.push(token);
      continue;
    }

    if (!normalized) {
      normalized = tokens.slice(0, idx);
    }

    var replacement = split_text_token(token);
    for (var r = 0; r < replacement.length; r++) {
      normalized.push(replacement[r]);
    }
  }

  if (normalized) {
    tokens.length = 0;
    for (var j = 0; j < normalized.length; j++) {
      tokens.push(normalized[j]);
    }
  }
}


function split_text_token(token) {
  var TokenConstructor = token.constructor;
  var parts = [];
  var content = token.content;
  var start = 0;

  for (var pos = 0; pos < content.length; pos++) {
    if (content.charCodeAt(pos) !== 0x0A) continue;

    if (pos > start) {
      parts.push(clone_text_token(TokenConstructor, token, content.slice(start, pos)));
    }

    parts.push(create_softbreak_token(TokenConstructor, token));
    start = pos + 1;
  }

  if (start < content.length) {
    parts.push(clone_text_token(TokenConstructor, token, content.slice(start)));
  }

  if (parts.length === 0) parts.push(token);
  return parts;
}


function clone_text_token(TokenConstructor, source, text) {
  var cloned = new TokenConstructor('text', source.tag, 0);
  copy_token_base(cloned, source);
  cloned.content = text;
  return cloned;
}


function create_softbreak_token(TokenConstructor, source) {
  var softbreak = new TokenConstructor('softbreak', '', 0);
  copy_token_base(softbreak, source);
  softbreak.content = '';
  softbreak.markup = '';
  softbreak.info = '';
  return softbreak;
}


function copy_token_base(target, source) {
  target.level = source.level;
  target.meta = source.meta ? Object.assign({}, source.meta) : source.meta;
  target.block = source.block;
  target.hidden = source.hidden;
  target.markup = source.markup;
  target.info = source.info;
  target.children = source.children;
  target.attrs = source.attrs ? source.attrs.slice() : source.attrs;
  target.map = source.map ? source.map.slice() : source.map;
}


function apply_missing_punctuation_spacing(tokens, inlineToken, punctuationSpace, punctuationConfig) {
  if (!inlineToken || !inlineToken.content) return;
  if (inlineToken.content.indexOf('\n') === -1) return;
  if (!tokens || tokens.length === 0) return;
  var maxPunctuationLength = punctuationConfig.maxLength;
  if (maxPunctuationLength <= 0) return;

  var rawSearchState = { pos: 0 };

  for (var idx = 0; idx < tokens.length; idx++) {
    var current = tokens[idx];
    if (!current || current.type !== 'text' || !current.content) continue;

    var trailing = current.content.slice(-maxPunctuationLength);
    if (!matches_punctuation_sequence(trailing, punctuationConfig)) continue;
    if (WHITESPACE_TRAIL_RE.test(current.content)) continue;

    var nextInfo = find_next_visible_token(tokens, idx + 1);
    if (!nextInfo) continue;
    if (nextInfo.token.type === 'text' && WHITESPACE_LEAD_RE.test(nextInfo.token.content || '')) continue;

    if (!raw_boundary_includes_newline(inlineToken.content, tokens, idx, nextInfo.index, nextInfo.fragment, rawSearchState)) {
      continue;
    }

    insert_space_token(tokens, nextInfo.index, nextInfo.token, punctuationSpace);
    idx = nextInfo.index;
  }

  if (tokens.length === 1) {
    apply_single_text_token_spacing(tokens, inlineToken, punctuationSpace, punctuationConfig);
  }
}


function raw_boundary_includes_newline(source, tokens, fromIdx, nextIdx, afterFragment, state) {
  if (!source || !afterFragment) return false;
  var beforeFragment = tokens[fromIdx].content || '';
  var betweenFragment = '';
  for (var k = fromIdx + 1; k < nextIdx; k++) {
    if (tokens[k].markup) betweenFragment += tokens[k].markup;
  }
  var candidate = beforeFragment + betweenFragment + '\n' + afterFragment;
  if (!candidate) return false;
  var startPos = source.indexOf(candidate, state.pos);
  if (startPos === -1) return false;
  state.pos = startPos + candidate.length - afterFragment.length;
  return true;
}


function find_next_visible_token(tokens, startIdx) {
  for (var idx = startIdx; idx < tokens.length; idx++) {
    var token = tokens[idx];
    if (!token) continue;
    var fragment = derive_after_fragment(token);
    if (!fragment) continue;
    return { index: idx, token: token, fragment: fragment };
  }
  return null;
}


function derive_after_fragment(token) {
  if (!token) return '';
  if (token.type === 'text' || token.type === 'html_inline' || token.type === 'code_inline') {
    return token.content || '';
  }
  if (token.type === 'image') return '![';
  if (token.type === 'link_open') return '[';
  if (token.type === 'inline') return token.content || '';
  return '';
}


function insert_space_token(tokens, insertIndex, referenceToken, punctuationSpace) {
  if (!punctuationSpace) return;
  var TokenConstructor = (referenceToken && referenceToken.constructor) || (tokens[0] && tokens[0].constructor);
  if (!TokenConstructor) return;
  var spaceToken = new TokenConstructor('text', '', 0);
  spaceToken.content = punctuationSpace;
  spaceToken.markup = '';
  spaceToken.info = '';
  spaceToken.tag = '';
  spaceToken.block = false;
  spaceToken.hidden = false;
  spaceToken.level = referenceToken ? referenceToken.level : 0;
  spaceToken.meta = referenceToken && referenceToken.meta ? Object.assign({}, referenceToken.meta) : referenceToken ? referenceToken.meta : null;
  spaceToken.children = null;
  spaceToken.attrs = null;
  spaceToken.map = null;
  tokens.splice(insertIndex, 0, spaceToken);
}


function apply_single_text_token_spacing(tokens, inlineToken, punctuationSpace, punctuationConfig) {
  if (!inlineToken || !inlineToken.content) return;
  if (!tokens || tokens.length !== 1) return;
  if (inlineToken.content.indexOf('\n') === -1) return;
  var token = tokens[0];
  if (!token || token.type !== 'text' || !token.content) return;
  var maxPunctuationLength = punctuationConfig.maxLength;
  if (maxPunctuationLength <= 0) return;

  var segments = inlineToken.content.split('\n');
  if (segments.length < 2) return;
  var cumulativeLength = 0;
  var offsetDelta = 0;
  var updatedContent = token.content;
  for (var segIdx = 0; segIdx < segments.length - 1; segIdx++) {
    var leftRaw = segments[segIdx];
    var rightRaw = segments[segIdx + 1];
    var tail = extract_visible_tail(leftRaw, maxPunctuationLength);
    var nextChar = extract_visible_head(rightRaw);
    var shouldInsert = tail &&
      matches_punctuation_sequence(tail, punctuationConfig) &&
      nextChar &&
      (is_printable_ascii(nextChar) || is_fullwidth_or_wide(nextChar));

    if (shouldInsert) {
      var splitIndex = cumulativeLength + leftRaw.length + offsetDelta;
      if (splitIndex >= 0 && splitIndex <= updatedContent.length) {
        var existingChar = updatedContent.charAt(splitIndex);
        if (existingChar && WHITESPACE_RE.test(existingChar)) {
          // already has whitespace at this boundary
          cumulativeLength += leftRaw.length;
          continue;
        }
        updatedContent = updatedContent.slice(0, splitIndex) + punctuationSpace + updatedContent.slice(splitIndex);
        offsetDelta += punctuationSpace.length;
      }
    }

    cumulativeLength += leftRaw.length;
  }

  if (offsetDelta > 0) {
    token.content = updatedContent;
  }
}


function extract_visible_tail(raw, maxLength) {
  if (!raw || !maxLength) return '';
  var result = '';
  for (var pos = raw.length; pos > 0 && result.length < maxLength;) {
    var code = raw.codePointAt(pos - 1);
    var charLen = code > 0xFFFF ? 2 : 1;
    var ch = raw.slice(pos - charLen, pos);
    pos -= charLen;
    if (WHITESPACE_RE.test(ch)) continue;
    if (is_markup_closer_char(ch)) continue;
    result = ch + result;
  }
  return result;
}


function extract_visible_head(raw) {
  if (!raw) return '';
  for (var pos = 0; pos < raw.length;) {
    var code = raw.codePointAt(pos);
    var charLen = code > 0xFFFF ? 2 : 1;
    var ch = raw.slice(pos, pos + charLen);
    pos += charLen;
    if (WHITESPACE_RE.test(ch)) continue;
    return ch;
  }
  return '';
}


function is_markup_closer_char(ch) {
  return ch === '*' || ch === '_' || ch === '~' || ch === '`';
}


export default function cjk_breaks_plugin(md, opts) {
  var options = opts || {};
  var punctuationSpace = resolve_punctuation_space_option(options);
  var punctuationConfig = punctuationSpace ? resolve_punctuation_targets(options) : null;
  var ctx = {
    either: !!options.either,
    normalizeSoftBreaks: !!options.normalizeSoftBreaks,
    considerInlineBoundaries: !options.normalizeSoftBreaks,
    punctuationSpace: punctuationSpace,
    punctuationConfig: punctuationConfig,
    maxPunctuationLength: punctuationConfig ? punctuationConfig.maxLength : 0
  };

  function cjk_breaks(state) {
    for (var blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
      if (state.tokens[blkIdx].type !== 'inline') continue;
      process_inlines(state.tokens[blkIdx].children, state, ctx, state.tokens[blkIdx]);
    }
  }
  if (!md || !md.core || !md.core.ruler) return;
  md.core.ruler.push('cjk_breaks', cjk_breaks);
}
