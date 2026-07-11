import eastAsianWidthModule from 'eastasianwidth';

const { eastAsianWidth } = eastAsianWidthModule;
const ASCII_PRINTABLE_MIN = 0x21;
const ASCII_PRINTABLE_MAX = 0x7E;
const IDEOGRAPHIC_SPACE = '\u3000';
const SPACE_INSERTION_REBUILD_THRESHOLD = 32;
const DEFAULT_PUNCTUATION_TARGETS = ['！', '？', '⁉', '！？', '？！', '!?', '?!', '.', ':'];
const DEFAULT_PUNCTUATION_CONFIG = create_punctuation_config(DEFAULT_PUNCTUATION_TARGETS);
const INSTALL_FLAG = Symbol.for('@peaceroad/markdown-it-cjk-breaks-mod/installed');
/* eslint-disable max-len */
// require('unicode-10.0.0/Script/Hangul/regex')
const HANGUL_RE = /[\u1100-\u11FF\u302E\u302F\u3131-\u318E\u3200-\u321E\u3260-\u327E\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/;
/* eslint-enable max-len */
const WHITESPACE_RE = /\s/;


function is_high_surrogate(code) {
  return code >= 0xD800 && code <= 0xDBFF;
}


function is_low_surrogate(code) {
  return code >= 0xDC00 && code <= 0xDFFF;
}


function get_char_before(text, pos) {
  if (!text || pos <= 0) return '';
  var c2 = text.charCodeAt(pos - 1);
  if (is_low_surrogate(c2) && pos > 1) {
    var c1 = text.charCodeAt(pos - 2);
    if (is_high_surrogate(c1)) return text.slice(pos - 2, pos);
  }
  return text.slice(pos - 1, pos);
}


function get_char_after(text, pos) {
  if (!text || pos >= text.length) return '';
  var c1 = text.charCodeAt(pos);
  if (is_high_surrogate(c1) && pos + 1 < text.length) {
    var c2 = text.charCodeAt(pos + 1);
    if (is_low_surrogate(c2)) return text.slice(pos, pos + 2);
  }
  return text.slice(pos, pos + 1);
}


function is_hangul(c) {
  return HANGUL_RE.test(c);
}


function create_punctuation_config(targets) {
  var sequences = new Set();
  var maxLength = 0;
  var endCharMap = Object.create(null);
  var lengthMap = Object.create(null);
  var lengths = [];

  for (var i = 0; i < targets.length; i++) {
    var value = targets[i];
    if (typeof value !== 'string' || value.length === 0) continue;
    if (sequences.has(value)) continue;
    sequences.add(value);
    var valueLength = value.length;
    if (valueLength > maxLength) maxLength = valueLength;
    if (!lengthMap[valueLength]) {
      lengthMap[valueLength] = true;
      lengths.push(valueLength);
    }
    var endChar = get_last_char(value);
    if (endChar) endCharMap[endChar] = true;
  }

  if (lengths.length > 1) {
    lengths.sort(function (a, b) { return b - a; });
  }
  return { sequences: sequences, maxLength: maxLength, endCharMap: endCharMap, lengths: lengths };
}


function resolve_punctuation_space_option(opts) {
  if (!opts || !opts.spaceAfterPunctuation) return '';

  var option = opts.spaceAfterPunctuation;
  if (option === 'half') return ' ';
  if (option === 'full') return IDEOGRAPHIC_SPACE;
  if (typeof option === 'string' && option.length > 0) return option;
  return '';
}


function normalize_punctuation_target_list(value) {
  if (typeof value === 'string') return value.length > 0 ? [ value ] : [];
  if (Array.isArray(value)) return value;
  return [];
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
    var customList = normalize_punctuation_target_list(customTargets);
    if (customList.length > 0) {
      baseTargets = customList;
    } else if (typeof customTargets === 'string' || Array.isArray(customTargets)) {
      return null;
    } else {
      baseTargets = DEFAULT_PUNCTUATION_TARGETS;
    }
  }

  if (addTargets !== undefined) {
    var addList = normalize_punctuation_target_list(addTargets);
    if (addList.length > 0) {
      baseTargets = baseTargets.concat(addList);
    }
  }

  if (removeTargets !== undefined) {
    var removeList = normalize_punctuation_target_list(removeTargets);
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


function matches_punctuation_sequence(trailing, punctuationConfig, skipEndCharCheck) {
  if (!trailing || !punctuationConfig || punctuationConfig.maxLength === 0) return false;

  var sequences = punctuationConfig.sequences;
  var lengths = punctuationConfig.lengths;
  if (!skipEndCharCheck) {
    var endCharMap = punctuationConfig.endCharMap;
    var endChar = get_last_char(trailing);
    if (!endCharMap[endChar]) return false;
  }
  var trailingLength = trailing.length;
  for (var i = 0; i < lengths.length; i++) {
    var len = lengths[i];
    if (len > trailingLength) continue;
    var fragment = len === trailingLength ? trailing : trailing.slice(-len);
    if (sequences.has(fragment)) return true;
  }
  return false;
}


function get_last_char(text) {
  return get_char_before(text, text ? text.length : 0);
}


function is_printable_ascii(ch) {
  if (!ch) return false;
  var code = ch.charCodeAt(0);
  return code >= ASCII_PRINTABLE_MIN && code <= ASCII_PRINTABLE_MAX;
}


function has_leading_whitespace(text) {
  if (!text) return false;
  return WHITESPACE_RE.test(text.charAt(0));
}


function is_fullwidth_or_wide(ch) {
  var width = get_cjk_width_class(ch);
  return width === 'F' || width === 'W';
}


function get_cjk_width_class(ch) {
  if (!ch) return '';
  if (ch.length === 1 && ch.charCodeAt(0) <= ASCII_PRINTABLE_MAX) return '';
  var width = eastAsianWidth(ch);
  return width === 'F' || width === 'W' || width === 'H' ? width : '';
}


function build_break_lookahead(tokens, trackSkippedEmpty) {
  var nextTextIndexes = new Array(tokens.length);
  var nextSkippedEmpty = trackSkippedEmpty ? new Array(tokens.length) : null;
  var nextNonEmpty = -1;
  var sawEmpty = false;

  for (var idx = tokens.length - 1; idx >= 0; idx--) {
    var token = tokens[idx];
    if (!token) continue;

    if (token.type === 'softbreak' || (token.type === 'text' && token.content === '\n')) {
      nextTextIndexes[idx] = nextNonEmpty;
      if (trackSkippedEmpty) nextSkippedEmpty[idx] = sawEmpty;
    }

    if (token.type !== 'text') continue;
    if (!token.content) {
      sawEmpty = true;
      continue;
    }

    nextNonEmpty = idx;
    sawEmpty = false;
  }

  return {
    nextTextIndexes: nextTextIndexes,
    nextSkippedEmpty: nextSkippedEmpty
  };
}

function process_inlines(tokens, ctx, inlineToken) {
  var i, last, next, remove_break;
  var either = ctx.either;
  var normalizeSoftBreaks = ctx.normalizeSoftBreaks;
  var punctuationSpace = ctx.punctuationSpace;
  var punctuationConfig = ctx.punctuationConfig;
  var considerInlineBoundaries = ctx.considerInlineBoundaries;
  var needsPunctuation = punctuationSpace && punctuationConfig && punctuationConfig.maxLength > 0;
  var punctuationEndCharMap = needsPunctuation ? punctuationConfig.endCharMap : null;

  if (!tokens || tokens.length === 0) return;
  if (normalizeSoftBreaks) normalize_text_tokens(tokens);

  var nextTextIndexes = null;
  var nextSkippedEmpty = null;
  var widthCache = null;
  function get_cached_width_class(ch) {
    if (!ch) return '';
    if (ch.length === 1 && ch.charCodeAt(0) <= ASCII_PRINTABLE_MAX) return '';
    if (!widthCache) widthCache = Object.create(null);
    var cached = widthCache[ch];
    if (cached !== undefined) return cached;
    var width = get_cjk_width_class(ch);
    widthCache[ch] = width;
    return width;
  }

  var lastTextContent = '';
  var sawEmptySinceLast = false;

  for (i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    var isSoftbreakToken = token.type === 'softbreak';
    var isTextBreakToken = token.type === 'text' && token.content === '\n';
    if (isSoftbreakToken || isTextBreakToken) {
      if (!nextTextIndexes) {
        var nextInfo = build_break_lookahead(tokens, considerInlineBoundaries);
        nextTextIndexes = nextInfo.nextTextIndexes;
        nextSkippedEmpty = nextInfo.nextSkippedEmpty;
      }
      // default last/next character to space
      last = next = ' ';
      var skippedEmptyBefore = false;
      var skippedEmptyAfter = false;
      if (considerInlineBoundaries) {
        skippedEmptyBefore = sawEmptySinceLast;
        skippedEmptyAfter = nextSkippedEmpty[i];
      }

      if (lastTextContent) {
        last = get_last_char(lastTextContent);
      }

      var nextIdx = nextTextIndexes[i];
      if (nextIdx !== -1) {
        var nextContent = tokens[nextIdx].content;
        next = get_char_after(nextContent, 0);
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
        if (needsPunctuation && lastTextContent && nextIdx !== -1 && next !== '\u200b') {
          if (punctuationEndCharMap[last]) {
            if (matches_punctuation_sequence(lastTextContent, punctuationConfig, true)) {
              if (!nextWidthComputed) {
                nextWidthClass = get_cached_width_class(next);
              }
              var nextIsFullwidthOrWide = nextWidthClass === 'F' || nextWidthClass === 'W';
              if (nextIsFullwidthOrWide || is_printable_ascii(next)) insertPunctuationSpace = true;
            }
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

    append_split_text_token(normalized, token);
  }

  if (normalized) {
    tokens.length = 0;
    for (var j = 0; j < normalized.length; j++) {
      tokens.push(normalized[j]);
    }
  }
}


function append_split_text_token(target, token) {
  var TokenConstructor = token.constructor;
  var content = token.content;
  var start = 0;
  var reusedToken = false;

  function push_text_part(text) {
    if (!text) return;
    if (!reusedToken) {
      token.content = text;
      target.push(token);
      reusedToken = true;
      return;
    }
    target.push(clone_text_token(TokenConstructor, token, text));
  }

  for (var pos = 0; pos < content.length; pos++) {
    if (content.charCodeAt(pos) !== 0x0A) continue;

    if (pos > start) push_text_part(content.slice(start, pos));

    target.push(create_softbreak_token(TokenConstructor, token));
    start = pos + 1;
  }

  if (start < content.length) push_text_part(content.slice(start));
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
  var endCharMap = punctuationConfig.endCharMap;

  if (tokens.length === 1) {
    apply_single_text_token_spacing(tokens, inlineToken, punctuationSpace, punctuationConfig);
    return;
  }

  var rawSearchState = null;
  var pendingInsertions = null;

  for (var idx = 0; idx < tokens.length; idx++) {
    var current = tokens[idx];
    if (!current || current.type !== 'text' || !current.content) continue;

    var endChar = get_last_char(current.content);
    if (!endCharMap[endChar]) continue;
    if (!matches_punctuation_sequence(current.content, punctuationConfig, true)) continue;

    var nextInfo = find_next_visible_token(tokens, idx + 1);
    if (!nextInfo) continue;
    if (nextInfo.token.type === 'text' && has_leading_whitespace(nextInfo.token.content)) continue;
    if (nextInfo.hasActiveBreak) continue;

    if (!rawSearchState) rawSearchState = { pos: 0 };
    if (!raw_boundary_includes_newline(
      inlineToken.content,
      current.content,
      nextInfo.betweenMarkup,
      nextInfo.fragment,
      rawSearchState
    )) {
      continue;
    }

    if (!pendingInsertions) {
      pendingInsertions = nextInfo;
    } else if (Array.isArray(pendingInsertions)) {
      pendingInsertions.push(nextInfo);
    } else {
      pendingInsertions = [ pendingInsertions, nextInfo ];
    }
    // Continue with the visible token. Insertions are applied after the scan so
    // repeated boundaries do not shift the remaining token-array tail.
    idx = nextInfo.index - 1;
  }

  apply_space_insertions(tokens, pendingInsertions, punctuationSpace);
}

function raw_boundary_includes_newline(source, beforeFragment, betweenFragment, afterFragment, state) {
  if (!source || !afterFragment) return false;
  if (!beforeFragment) return false;
  var beforeBoundary = betweenFragment ? beforeFragment + betweenFragment : beforeFragment;
  var newlinePositions = get_newline_positions(source, state);
  var startIndex = state.newlineIndex || 0;

  while (startIndex < newlinePositions.length && newlinePositions[startIndex] < state.pos) {
    startIndex++;
  }
  state.newlineIndex = startIndex;

  for (var idx = startIndex; idx < newlinePositions.length; idx++) {
    var newlinePos = newlinePositions[idx];
    if (!matches_raw_newline_boundary(source, newlinePos, beforeBoundary, afterFragment)) continue;
    state.pos = newlinePos + 1;
    state.newlineIndex = idx + 1;
    return true;
  }

  return false;
}


function find_next_visible_token(tokens, startIdx) {
  var hasActiveBreak = false;
  var betweenMarkup = '';
  for (var idx = startIdx; idx < tokens.length; idx++) {
    var token = tokens[idx];
    if (!token) continue;
    if (!hasActiveBreak && (token.type === 'softbreak' || token.type === 'hardbreak' || (token.type === 'text' && token.content === '\n'))) {
      hasActiveBreak = true;
    }
    var fragment = derive_after_fragment(token);
    if (!fragment) {
      if (token.markup) betweenMarkup += token.markup;
      continue;
    }
    return { index: idx, token: token, fragment: fragment, hasActiveBreak: hasActiveBreak, betweenMarkup: betweenMarkup };
  }
  return null;
}


function get_newline_positions(source, state) {
  if (state.newlinePositions) return state.newlinePositions;
  var newlinePositions = [];
  for (var idx = 0; idx < source.length; idx++) {
    if (source.charCodeAt(idx) === 0x0A) newlinePositions.push(idx);
  }
  state.newlinePositions = newlinePositions;
  return newlinePositions;
}


function matches_raw_newline_boundary(source, newlinePos, beforeBoundary, afterFragment) {
  var beforeStart = newlinePos - beforeBoundary.length;
  if (beforeStart < 0) return false;
  if (!source.startsWith(beforeBoundary, beforeStart)) return false;
  var afterStart = newlinePos + 1;
  if (Array.isArray(afterFragment)) {
    for (var i = 0; i < afterFragment.length; i++) {
      var fragment = afterFragment[i];
      if (fragment && source.startsWith(fragment, afterStart)) return true;
    }
    return false;
  }
  return source.startsWith(afterFragment, afterStart);
}


function derive_after_fragment(token) {
  if (!token) return '';
  if (token.type === 'text' || token.type === 'html_inline' || token.type === 'code_inline') {
    if (token.type !== 'code_inline') return token.content || '';
    var fragments = [];
    var markup = token.markup || '';
    var content = token.content || '';
    if (markup && content) fragments.push(markup + content);
    if (markup) fragments.push(markup);
    if (content) fragments.push(content);
    return fragments.length > 0 ? fragments : '';
  }
  if (token.type === 'image') return '![';
  if (token.type === 'link_open') return token.markup || '[';
  if (token.nesting === 1 && token.markup) return token.markup;
  if (token.type === 'inline') return token.content || '';
  return '';
}


function insert_space_token(tokens, insertIndex, referenceToken, punctuationSpace) {
  tokens.splice(insertIndex, 0, create_space_token(referenceToken, punctuationSpace));
}


function create_space_token(referenceToken, punctuationSpace) {
  var TokenConstructor = referenceToken.constructor;
  var spaceToken = new TokenConstructor('text', '', 0);
  spaceToken.content = punctuationSpace;
  spaceToken.markup = '';
  spaceToken.info = '';
  spaceToken.tag = '';
  spaceToken.block = false;
  spaceToken.hidden = false;
  spaceToken.level = referenceToken.level;
  spaceToken.meta = referenceToken.meta ? Object.assign({}, referenceToken.meta) : referenceToken.meta;
  spaceToken.children = null;
  spaceToken.attrs = null;
  spaceToken.map = null;
  return spaceToken;
}


function apply_space_insertions(tokens, insertions, punctuationSpace) {
  if (!insertions) return;
  if (!Array.isArray(insertions)) {
    insert_space_token(tokens, insertions.index, insertions.token, punctuationSpace);
    return;
  }
  // Descending splices are cheaper for a few local edits; dense edits are
  // rebuilt once so each remaining token is moved at most once.
  if (insertions.length < SPACE_INSERTION_REBUILD_THRESHOLD) {
    for (var reverseIdx = insertions.length - 1; reverseIdx >= 0; reverseIdx--) {
      var insertion = insertions[reverseIdx];
      insert_space_token(tokens, insertion.index, insertion.token, punctuationSpace);
    }
    return;
  }

  var rebuilt = [];
  var insertionIndex = 0;
  for (var idx = 0; idx < tokens.length; idx++) {
    if (insertionIndex < insertions.length && insertions[insertionIndex].index === idx) {
      var pending = insertions[insertionIndex];
      rebuilt.push(create_space_token(pending.token, punctuationSpace));
      insertionIndex++;
    }
    rebuilt.push(tokens[idx]);
  }

  tokens.length = 0;
  for (var outIdx = 0; outIdx < rebuilt.length; outIdx++) {
    tokens.push(rebuilt[outIdx]);
  }
}


function apply_single_text_token_spacing(tokens, inlineToken, punctuationSpace, punctuationConfig) {
  var token = tokens[0];
  if (!token || token.type !== 'text' || !token.content) return;
  var maxPunctuationLength = punctuationConfig.maxLength;

  var segments = inlineToken.content.split('\n');
  var cumulativeLength = 0;
  var insertionPositions = null;
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
      var splitIndex = cumulativeLength + leftRaw.length;
      if (splitIndex <= token.content.length) {
        var existingChar = token.content.charAt(splitIndex);
        if (!existingChar || !WHITESPACE_RE.test(existingChar)) {
          if (!insertionPositions) insertionPositions = [];
          insertionPositions.push(splitIndex);
        }
      }
    }

    cumulativeLength += leftRaw.length;
  }

  if (!insertionPositions) return;
  if (insertionPositions.length === 1) {
    var onlyPosition = insertionPositions[0];
    token.content = token.content.slice(0, onlyPosition) + punctuationSpace + token.content.slice(onlyPosition);
    return;
  }

  var rebuilt = [];
  var contentStart = 0;
  for (var positionIdx = 0; positionIdx < insertionPositions.length; positionIdx++) {
    var position = insertionPositions[positionIdx];
    rebuilt.push(token.content.slice(contentStart, position), punctuationSpace);
    contentStart = position;
  }
  rebuilt.push(token.content.slice(contentStart));
  token.content = rebuilt.join('');
}


function extract_visible_tail(raw, maxLength) {
  if (!raw || !maxLength) return '';
  var result = '';
  for (var pos = raw.length; pos > 0 && result.length < maxLength;) {
    var ch = get_char_before(raw, pos);
    pos -= ch.length;
    if (WHITESPACE_RE.test(ch)) continue;
    if (is_markup_closer_char(ch)) continue;
    result = ch + result;
  }
  return result;
}


function extract_visible_head(raw) {
  if (!raw) return '';
  for (var pos = 0; pos < raw.length;) {
    var ch = get_char_after(raw, pos);
    pos += ch.length;
    if (WHITESPACE_RE.test(ch)) continue;
    return ch;
  }
  return '';
}


function is_markup_closer_char(ch) {
  return ch === '*' || ch === '_' || ch === '~' || ch === '`';
}


export default function cjk_breaks_plugin(md, opts) {
  if (!md || !md.core || !md.core.ruler) return;
  if (md[INSTALL_FLAG]) return;

  var options = opts || {};
  var punctuationSpace = resolve_punctuation_space_option(options);
  var punctuationConfig = punctuationSpace ? resolve_punctuation_targets(options) : null;
  var ctx = {
    either: !!options.either,
    normalizeSoftBreaks: !!options.normalizeSoftBreaks,
    considerInlineBoundaries: !options.normalizeSoftBreaks,
    punctuationSpace: punctuationSpace,
    punctuationConfig: punctuationConfig
  };

  function cjk_breaks(state) {
    if (!state || !state.src || state.src.indexOf('\n') === -1) return;
    for (var blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
      var inlineToken = state.tokens[blkIdx];
      if (inlineToken.type !== 'inline') continue;
      if (!inlineToken.children || inlineToken.children.length === 0) continue;
      if (!inlineToken.content || inlineToken.content.indexOf('\n') === -1) continue;
      process_inlines(inlineToken.children, ctx, inlineToken);
    }
  }

  md[INSTALL_FLAG] = true;
  md.core.ruler.push('cjk_breaks', cjk_breaks);
}
