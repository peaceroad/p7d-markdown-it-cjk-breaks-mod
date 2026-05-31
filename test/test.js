import assert from 'assert';
import fs from 'fs';
import path from 'path';
import mdit from 'markdown-it';
import strongJa from '@peaceroad/markdown-it-strong-ja';

import cjkBreaks from '../index.js';

const mdPlain = mdit({ html: true });
const mdHtmlFalse = mdit({ html: false }).use(cjkBreaks);
const mdHtmlFalseEither = mdit({ html: false }).use(cjkBreaks, { either: true });
const md = mdit({ html: true }).use(cjkBreaks);
const mdEither = mdit({ html: true }).use(cjkBreaks, { either: true });
const mdEitherNormalizeSpace = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  normalizeSoftBreaks: true,
  spaceAfterPunctuation: 'half'
});
const mdSpaceHalf = mdit({ html: true }).use(cjkBreaks, { spaceAfterPunctuation: 'half' });
const mdSpaceFull = mdit({ html: true }).use(cjkBreaks, { spaceAfterPunctuation: 'full' });
const mdSpaceHalfEither = mdit({ html: true }).use(cjkBreaks, { either: true, spaceAfterPunctuation: 'half' });
const mdSpaceCustomTargets = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['??']
});
const mdSpaceCustomLengths = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['...']
});
const mdSpaceCustomFullwidthPairs = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['！！']
});
const mdSpaceCustomMixedTargets = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['...', '🈂!', '', null, 123, '...']
});
const mdSpaceHalfEitherAddTargets = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargetsAdd: ['??']
});
const mdSpaceHalfEitherRemoveTargets = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargetsRemove: ['.', ':']
});
const mdSpaceSurrogateTargets = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['🈂']
});
const mdSpaceInvalidTargets = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: [null, '', 123]
});
const mdSpaceInvalidPlusAdd = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: [null, '', 123],
  spaceAfterPunctuationTargetsAdd: ['??']
});
const mdSpaceSurrogatePairs = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['🈂🈂']
});
const mdSpaceHalfDisabledTargets = mdit({ html: true }).use(cjkBreaks, {
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: []
});
const mdEitherNormalize = mdit({ html: true }).use(cjkBreaks, { either: true, normalizeSoftBreaks: true });
const mdStrongJa = mdit({ html: true })
  .use(strongJa)
  .use(cjkBreaks, { either: true, normalizeSoftBreaks: true });
const mdStrongJaSpace = mdit({ html: true })
  .use(strongJa)
  .use(cjkBreaks, {
    either: true,
    normalizeSoftBreaks: true,
    spaceAfterPunctuation: 'half'
  });
const mdStrongJaSpaceLate = mdit({ html: true })
  .use(cjkBreaks, {
    either: true,
    normalizeSoftBreaks: true,
    spaceAfterPunctuation: 'half'
  })
  .use(strongJa);
const mdCollapsedSingleTextSurrogateSpace = mdit({ html: true })
  .use((mdInstance) => {
    mdInstance.core.ruler.push('collapse_inline_text_for_test', (state) => {
      for (const token of state.tokens) {
        if (token.type !== 'inline' || !token.children) continue;
        const text = new state.Token('text', '', 0);
        text.content = token.content.replace(/\n/g, '');
        token.children = [text];
      }
    });
  })
  .use(cjkBreaks, {
    either: true,
    spaceAfterPunctuation: 'half',
    spaceAfterPunctuationTargets: ['🈂']
  });

let __dirname = path.dirname(new URL(import.meta.url).pathname);
const isWindows = process.platform === 'win32';
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\');
}

const testData = {
  standard: __dirname + path.sep + 'examples-standard.txt',
  htmlFalse: __dirname + path.sep + 'html-false' + path.sep + 'examples-html-false.txt',
  htmlFalseEither: __dirname + path.sep + 'html-false' + path.sep + 'examples-html-false-either.txt',
  either: __dirname + path.sep + 'examples-either.txt',
  spaceHalf: __dirname + path.sep + 'examples-space-half.txt',
  spaceFull: __dirname + path.sep + 'examples-space-full.txt',
  spaceHalfEither: __dirname + path.sep + 'examples-space-half-either.txt',
  spaceCustom: __dirname + path.sep + 'examples-space-custom.txt',
  spaceCustomLengths: __dirname + path.sep + 'examples-space-custom-lengths.txt',
  spaceCustomFullwidthPairs: __dirname + path.sep + 'examples-space-custom-fullwidth-pairs.txt',
  spaceCustomMixedTargets: __dirname + path.sep + 'examples-space-custom-mixed-targets.txt',
  spaceAddTargets: __dirname + path.sep + 'examples-space-add-targets.txt',
  spaceRemoveTargets: __dirname + path.sep + 'examples-space-remove-targets.txt',
  spaceSurrogateTargets: __dirname + path.sep + 'examples-space-surrogate-targets.txt',
  spaceSurrogatePairs: __dirname + path.sep + 'examples-space-surrogate-pairs.txt',
  spaceInvalidTargets: __dirname + path.sep + 'examples-space-invalid-targets.txt',
  spaceInvalidPlusAdd: __dirname + path.sep + 'examples-space-invalid-plus-add.txt',
  spaceDisabledTargets: __dirname + path.sep + 'examples-space-disabled-targets.txt',
  eitherNormalize: __dirname + path.sep + 'examples-eithere-and-normalizeSoftBreaks.txt',
  strongJa: __dirname + path.sep + 'examples-strongJa-and-normalizeSoftBreaks.txt',
  strongJaSpace: __dirname + path.sep + 'examples-strongJa-all-options.txt',
  strongJaSpaceLate: __dirname + path.sep + 'examples-strongJa-all-options.txt',
  astralDefault: __dirname + path.sep + 'examples-astral-default.txt',
  astralEither: __dirname + path.sep + 'examples-astral-either.txt',
  astralNormalizeSpace: __dirname + path.sep + 'examples-astral-normalize-space.txt'
};

const getTestData = (pat) => {
  if (!fs.existsSync(pat)) {
    console.log('No exist: ' + pat);
    return [];
  }

  const exampleCont = fs.readFileSync(pat, 'utf-8').trim();
  const blocks = exampleCont.split(/\n*\[Markdown\]\n/).slice(1);

  return blocks.map((block) => {
    const parts = block.split(/\n+\[HTML\]\n/);
    const markdown = parts[0] || '';
    let html = parts[1] || '';
    if (html && !/\n$/.test(html)) {
      html += '\n';
    }
    return { markdown, html };
  });
};

const runTest = (processor, pat, pass) => {
  console.log('===========================================================');
  console.log(pat);
  const cases = getTestData(pat);
  if (cases.length === 0) return pass;

  cases.forEach((testCase, index) => {
    const rendered = processor.render(testCase.markdown);
    console.log('Test: ' + (index + 1) + ' >>>');
    try {
      assert.strictEqual(rendered, testCase.html);
    } catch (e) {
      pass = false;
      console.log(testCase.markdown);
      console.log('incorrect:');
      console.log('H: ' + rendered + 'C: ' + testCase.html);
      console.log('H length:', rendered.length, 'C length:', testCase.html.length);
    }
  });
  return pass;
};

const runDirectTest = (name, processor, markdown, html, pass) => {
  console.log('===========================================================');
  console.log(name);
  const rendered = processor.render(markdown);
  try {
    assert.strictEqual(rendered, html);
  } catch (e) {
    pass = false;
    console.log(markdown);
    console.log('incorrect:');
    console.log('H: ' + rendered + 'C: ' + html);
    console.log('H length:', rendered.length, 'C length:', html.length);
  }
  return pass;
};

const runAssertionTest = (name, assertion, pass) => {
  console.log('===========================================================');
  console.log(name);
  try {
    assertion();
  } catch (e) {
    pass = false;
    console.log(e && e.stack ? e.stack : e);
  }
  return pass;
};

const runParityTest = (name, processors, cases, pass) => {
  return runAssertionTest(name, () => {
    for (const testCase of cases) {
      const expected = mdPlain.render(testCase);
      for (const processor of processors) {
        assert.strictEqual(processor.render(testCase), expected, testCase);
      }
    }
  }, pass);
};

let pass = true;
pass = runTest(md, testData.standard, pass);
pass = runTest(mdHtmlFalse, testData.htmlFalse, pass);
pass = runTest(mdHtmlFalseEither, testData.htmlFalseEither, pass);
pass = runTest(mdEither, testData.either, pass);
pass = runTest(md, testData.astralDefault, pass);
pass = runTest(mdEither, testData.astralEither, pass);
pass = runTest(mdEitherNormalizeSpace, testData.astralNormalizeSpace, pass);
pass = runTest(mdSpaceHalf, testData.spaceHalf, pass);
pass = runTest(mdSpaceFull, testData.spaceFull, pass);
pass = runTest(mdSpaceHalfEither, testData.spaceHalfEither, pass);
pass = runTest(mdSpaceCustomTargets, testData.spaceCustom, pass);
pass = runTest(mdSpaceCustomLengths, testData.spaceCustomLengths, pass);
pass = runTest(mdSpaceCustomFullwidthPairs, testData.spaceCustomFullwidthPairs, pass);
pass = runTest(mdSpaceCustomMixedTargets, testData.spaceCustomMixedTargets, pass);
pass = runTest(mdSpaceHalfEitherAddTargets, testData.spaceAddTargets, pass);
pass = runTest(mdSpaceHalfEitherRemoveTargets, testData.spaceRemoveTargets, pass);
pass = runTest(mdSpaceSurrogateTargets, testData.spaceSurrogateTargets, pass);
pass = runTest(mdSpaceSurrogatePairs, testData.spaceSurrogatePairs, pass);
pass = runTest(mdSpaceInvalidTargets, testData.spaceInvalidTargets, pass);
pass = runTest(mdSpaceInvalidPlusAdd, testData.spaceInvalidPlusAdd, pass);
pass = runTest(mdSpaceHalfDisabledTargets, testData.spaceDisabledTargets, pass);
pass = runTest(mdEitherNormalize, testData.eitherNormalize, pass);
pass = runTest(mdStrongJa, testData.strongJa, pass);
pass = runTest(mdStrongJaSpace, testData.strongJaSpace, pass);
pass = runTest(mdStrongJaSpaceLate, testData.strongJaSpaceLate, pass);
pass = runDirectTest(
  'direct-crlf-inline-html-spacing',
  mdSpaceHalfEither,
  '漢！\r\n<span class="note">メモ</span>',
  '<p>漢！ <span class="note">メモ</span></p>\n',
  pass
);
pass = runDirectTest(
  'direct-repeated-inline-html-spacing',
  mdSpaceHalfEither,
  '漢！\n<span>甲</span>\n漢？\n<span>乙</span>',
  '<p>漢！ <span>甲</span>漢？ <span>乙</span></p>\n',
  pass
);
pass = runDirectTest(
  'direct-repeated-inline-code-spacing',
  mdSpaceHalfEither,
  '漢！\n`a`\n漢？\n`b`',
  '<p>漢！ <code>a</code>漢？ <code>b</code></p>\n',
  pass
);
pass = runDirectTest(
  'direct-crlf-normalize-softbreaks',
  mdEitherNormalize,
  '**漢**\r\nb',
  '<p><strong>漢</strong>b</p>\n',
  pass
);
pass = runDirectTest(
  'direct-mixed-line-endings-strong-ja-space',
  mdStrongJaSpace,
  '**Hello!?**\r\n漢？\n終',
  '<p><strong>Hello!?</strong> 漢？ 終</p>\n',
  pass
);
pass = runDirectTest(
  'direct-single-text-surrogate-tail-spacing',
  mdCollapsedSingleTextSurrogateSpace,
  '🈂\nA',
  '<p>🈂 A</p>\n',
  pass
);
pass = runParityTest(
  'markdown-it-14.2.0-astral-delimiter-parity',
  [md, mdEither, mdEitherNormalize, mdSpaceHalfEither],
  [
    'a*😀*a',
    '😀_a_',
    'a*🈂*a',
    '🈂_a_',
    'a*𠀋*a',
    '𠀋_a_',
    'a**🂡**a',
    '🂡__a__'
  ],
  pass
);
pass = runParityTest(
  'non-inline-and-non-cjk-boundary-parity',
  [md, mdEitherNormalize],
  [
    'A\nB',
    '😀\n😃',
    '```js {#demo}\n𠀋\n漢\n```',
    '# 𠀋\n\nA\nB'
  ],
  pass
);
pass = runAssertionTest('duplicate-use-first-install-wins', () => {
  const mdDuplicateUse = mdit({ html: true }).use(cjkBreaks);
  const ruleCountAfterFirstUse = mdDuplicateUse.core.ruler.getRules('').length;

  mdDuplicateUse.use(cjkBreaks, { either: true, spaceAfterPunctuation: 'half' });

  assert.strictEqual(mdDuplicateUse.core.ruler.getRules('').length, ruleCountAfterFirstUse);
  assert.strictEqual(mdDuplicateUse.render('漢！\nA'), '<p>漢！\nA</p>\n');
}, pass);

if (pass) {
  console.log('Passed all test.');
} else {
  process.exitCode = 1;
}
