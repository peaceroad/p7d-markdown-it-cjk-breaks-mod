import assert from 'assert';
import fs from 'fs';
import path from 'path';
import mdit from 'markdown-it';
import strongJa from '@peaceroad/markdown-it-strong-ja';

import cjkBreaks from '../index.js';

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
const mdStrongJa = mdit({ html: true }).use(strongJa).use(cjkBreaks, {
  either: true,
});

let __dirname = path.dirname(new URL(import.meta.url).pathname);
const isWindows = process.platform === 'win32';
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\');
}

const testData = {
  standard: __dirname + path.sep + 'examples-standard.txt',
  either: __dirname + path.sep + 'examples-either.txt',
  spaceHalf: __dirname + path.sep + 'examples-space-half.txt',
  spaceFull: __dirname + path.sep + 'examples-space-full.txt',
  spaceHalfEither: __dirname + path.sep + 'examples-space-half-either.txt',
  spaceCustom: __dirname + path.sep + 'examples-space-custom.txt',
  strongJa: __dirname + path.sep + 'examples-strongJa.txt'
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
pass = runTest(mdEither, testData.either, pass);
pass = runTest(mdSpaceHalf, testData.spaceHalf, pass);
pass = runTest(mdSpaceFull, testData.spaceFull, pass);
pass = runTest(mdSpaceHalfEither, testData.spaceHalfEither, pass);
pass = runTest(mdSpaceCustomTargets, testData.spaceCustom, pass);
pass = runTest(mdStrongJa, testData.strongJa, pass);

if (pass) {
  console.log('Passed all test.');
} else {
  process.exitCode = 1;
}
