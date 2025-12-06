import assert from 'assert';
import fs from 'fs';
import path from 'path';
import mdit from 'markdown-it';

import cjkBreaks from '../index.js';

const md = mdit({ html: true }).use(cjkBreaks);
const mdEither = mdit({ html: true }).use(cjkBreaks, { either: true });

let __dirname = path.dirname(new URL(import.meta.url).pathname);
const isWindows = process.platform === 'win32';
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\');
}

const testData = {
  standard: __dirname + path.sep + 'examples-standard.txt',
  either: __dirname + path.sep + 'examples-either.txt'
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

if (pass) {
  console.log('Passed all test.');
} else {
  process.exitCode = 1;
}
