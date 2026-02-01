import assert from 'assert';
import fs from 'fs';
import path from 'path';
import mdit from 'markdown-it';
import strongJa from '@peaceroad/markdown-it-strong-ja';

import cjkBreaks from '../index.js';

const mdHtmlFalse = mdit({ html: false }).use(cjkBreaks);
const mdHtmlFalseEither = mdit({ html: false }).use(cjkBreaks, { either: true });
const md = mdit({ html: true }).use(cjkBreaks);
const mdEither = mdit({ html: true }).use(cjkBreaks, { either: true });
const mdSpaceHalf = mdit({ html: true }).use(cjkBreaks, { spaceAfterPunctuation: 'half' });
const mdSpaceFull = mdit({ html: true }).use(cjkBreaks, { spaceAfterPunctuation: 'full' });
const mdSpaceHalfEither = mdit({ html: true }).use(cjkBreaks, { either: true, spaceAfterPunctuation: 'half' });
const mdSpaceCustomTargets = mdit({ html: true }).use(cjkBreaks, {
  either: true,
  spaceAfterPunctuation: 'half',
  spaceAfterPunctuationTargets: ['??']
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
  spaceAddTargets: __dirname + path.sep + 'examples-space-add-targets.txt',
  spaceRemoveTargets: __dirname + path.sep + 'examples-space-remove-targets.txt',
  spaceDisabledTargets: __dirname + path.sep + 'examples-space-disabled-targets.txt',
  eitherNormalize: __dirname + path.sep + 'examples-eithere-and-normalizeSoftBreaks.txt',
  strongJa: __dirname + path.sep + 'examples-strongJa-and-normalizeSoftBreaks.txt',
  strongJaSpace: __dirname + path.sep + 'examples-strongJa-all-options.txt',
  strongJaSpaceLate: __dirname + path.sep + 'examples-strongJa-all-options.txt'
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

let pass = true;
pass = runTest(md, testData.standard, pass);
pass = runTest(mdHtmlFalse, testData.htmlFalse, pass);
pass = runTest(mdHtmlFalseEither, testData.htmlFalseEither, pass);
pass = runTest(mdEither, testData.either, pass);
pass = runTest(mdSpaceHalf, testData.spaceHalf, pass);
pass = runTest(mdSpaceFull, testData.spaceFull, pass);
pass = runTest(mdSpaceHalfEither, testData.spaceHalfEither, pass);
pass = runTest(mdSpaceCustomTargets, testData.spaceCustom, pass);
pass = runTest(mdSpaceHalfEitherAddTargets, testData.spaceAddTargets, pass);
pass = runTest(mdSpaceHalfEitherRemoveTargets, testData.spaceRemoveTargets, pass);
pass = runTest(mdSpaceHalfDisabledTargets, testData.spaceDisabledTargets, pass);
pass = runTest(mdEitherNormalize, testData.eitherNormalize, pass);
pass = runTest(mdStrongJa, testData.strongJa, pass);
pass = runTest(mdStrongJaSpace, testData.strongJaSpace, pass);
pass = runTest(mdStrongJaSpaceLate, testData.strongJaSpaceLate, pass);

if (pass) {
  console.log('Passed all test.');
} else {
  process.exitCode = 1;
}
