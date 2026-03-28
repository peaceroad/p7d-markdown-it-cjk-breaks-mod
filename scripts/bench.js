import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import MarkdownIt from 'markdown-it';
import strongJa from '@peaceroad/markdown-it-strong-ja';

import cjkBreaks from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const testRoot = path.join(repoRoot, 'test');
const iterations = Number(process.argv[2] || 30);
const warmup = Number(process.argv[3] || 5);

function collect_fixture_paths(rootDir) {
  var entries = fs.readdirSync(rootDir, { withFileTypes: true });
  var paths = [];
  for (var idx = 0; idx < entries.length; idx++) {
    var entry = entries[idx];
    var absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      paths = paths.concat(collect_fixture_paths(absolute));
      continue;
    }
    if (/^examples-.*\.txt$/.test(entry.name)) paths.push(absolute);
  }
  return paths;
}

function get_fixture_markdown(filePath) {
  var content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content
    .split(/\n*\[Markdown\]\n/)
    .slice(1)
    .map(function (block) {
      return (block.split(/\n+\[HTML\]\n/)[0] || '').replace(/\r\n/g, '\n');
    })
    .filter(Boolean);
}

function build_corpus() {
  var fixtureDocs = [];
  var fixturePaths = collect_fixture_paths(testRoot);
  for (var idx = 0; idx < fixturePaths.length; idx++) {
    fixtureDocs = fixtureDocs.concat(get_fixture_markdown(fixturePaths[idx]));
  }

  var newlineDocs = fixtureDocs.concat([
    '漢！\nA',
    '**漢**\nb',
    '漢！\n<span class="note">メモ</span>',
    '漢！\n`code`\n漢？\n`tail`'
  ]);

  var noNewlineDocs = [
    '漢字かな交じり文とASCII mix 12345!?',
    '日本語の文末。Next sentence without line breaks.',
    'Inline `code` and **strong** stay on one line.'
  ];

  var expandedNoNewlineDocs = [];
  for (var repeat = 0; repeat < 200; repeat++) {
    for (var docIdx = 0; docIdx < noNewlineDocs.length; docIdx++) {
      expandedNoNewlineDocs.push(noNewlineDocs[docIdx] + ' #' + repeat);
    }
  }

  return {
    newline: newlineDocs,
    noNewline: expandedNoNewlineDocs
  };
}

function create_processors() {
  return [
    { name: 'baseline', md: MarkdownIt({ html: true }) },
    { name: 'cjk-default', md: MarkdownIt({ html: true }).use(cjkBreaks) },
    { name: 'cjk-either', md: MarkdownIt({ html: true }).use(cjkBreaks, { either: true }) },
    {
      name: 'cjk-either-space',
      md: MarkdownIt({ html: true }).use(cjkBreaks, {
        either: true,
        spaceAfterPunctuation: 'half'
      })
    },
    {
      name: 'strong-ja+cjk',
      md: MarkdownIt({ html: true })
        .use(strongJa)
        .use(cjkBreaks, { either: true, normalizeSoftBreaks: true, spaceAfterPunctuation: 'half' })
    }
  ];
}

function render_batch(md, docs) {
  for (var idx = 0; idx < docs.length; idx++) {
    md.render(docs[idx]);
  }
}

function median(values) {
  var sorted = values.slice().sort(function (a, b) { return a - b; });
  var middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function benchmark(md, docs) {
  for (var warm = 0; warm < warmup; warm++) {
    render_batch(md, docs);
  }

  var timings = [];
  for (var idx = 0; idx < iterations; idx++) {
    var start = performance.now();
    render_batch(md, docs);
    timings.push(performance.now() - start);
  }

  var medianMs = median(timings);

  return {
    medianMs: medianMs,
    perRenderUs: (medianMs * 1000) / docs.length
  };
}

function main() {
  var corpus = build_corpus();
  var processors = create_processors();

  console.log('Benchmark corpus');
  console.log('newline docs   :', corpus.newline.length);
  console.log('no-newline docs:', corpus.noNewline.length);
  console.log('warmup         :', warmup);
  console.log('iterations     :', iterations);

  var corpusNames = Object.keys(corpus);
  for (var corpusIdx = 0; corpusIdx < corpusNames.length; corpusIdx++) {
    var corpusName = corpusNames[corpusIdx];
    var docs = corpus[corpusName];
    console.log('\n[' + corpusName + ']');
    for (var procIdx = 0; procIdx < processors.length; procIdx++) {
      var processor = processors[procIdx];
      var result = benchmark(processor.md, docs);
      console.log(
        processor.name.padEnd(16) +
        ' median=' + result.medianMs.toFixed(2).padStart(8) + ' ms' +
        ' per-render=' + result.perRenderUs.toFixed(2).padStart(8) + ' us'
      );
    }
  }
}

main();
