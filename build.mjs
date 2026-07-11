// ---------------------------------------------------------------------------
// build.mjs — static site generator for junyizhu-ai.github.io
// Zero dependencies. Run with: node build.mjs
// Reads:  _data/papers.bib, _data/news.yml, _data/bio.html
// Writes: index.html, publications/index.html, publications/<slug>/index.html,
//         sitemap.xml, 404.html
// ---------------------------------------------------------------------------

export const SITE = 'https://junyizhu-ai.github.io';
const SCHOLAR = 'https://scholar.google.com/citations?user=3LeC4cMAAAAJ';
const LINKEDIN = 'https://www.linkedin.com/in/junyi-zhu-ai/';
const EMAIL_USER = 'junyizhu.ai';
const EMAIL_DOMAIN = 'gmail.com';

// ---------------------------------------------------------------- utilities

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function parseBib(src) {
  const entries = [];
  let i = 0;
  while ((i = src.indexOf('@', i)) !== -1) {
    const brace = src.indexOf('{', i);
    if (brace < 0) break;
    const type = src.slice(i + 1, brace).trim().toLowerCase();
    if (type === 'comment' || type === 'string') { i = brace + 1; continue; }
    let j = brace + 1, depth = 1, buf = '';
    while (j < src.length && depth > 0) {
      const c = src[j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      if (depth > 0) buf += c;
      j++;
    }
    const comma = buf.indexOf(',');
    const key = buf.slice(0, comma).trim();
    const fields = {};
    let k = comma + 1;
    while (k < buf.length) {
      const eq = buf.indexOf('=', k);
      if (eq < 0) break;
      const name = buf.slice(k, eq).replace(/[,\s]/g, '').toLowerCase();
      let m = eq + 1;
      while (m < buf.length && buf[m] !== '{') m++;
      if (m >= buf.length) break;
      let d = 1, v = '';
      m++;
      while (m < buf.length && d > 0) {
        const c = buf[m];
        if (c === '{') d++;
        else if (c === '}') d--;
        if (d > 0) v += c;
        m++;
      }
      if (name) fields[name] = v.replace(/\s+/g, ' ').trim();
      k = m + 1;
    }
    if (key && fields.title) entries.push({ key, fields });
    i = j;
  }
  return entries;
}

export function parseNews(src) {
  const items = [];
  for (const line of src.split('\n')) {
    const d = line.match(/^-\s*date:\s*(\S+)/);
    if (d) { items.push({ date: d[1], text: '' }); continue; }
    const t = line.match(/^\s+text:\s*(.*)$/);
    if (t && items.length) items[items.length - 1].text = t[1].trim();
  }
  return items;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// author field: "Last, First and Last*, First and ..."
export function parseAuthors(field) {
  return field.split(/\s+and\s+/).map((part) => {
    const bits = part.split(',');
    let last = (bits[0] || '').trim();
    const first = (bits[1] || '').trim();
    const star = last.endsWith('*');
    if (star) last = last.slice(0, -1);
    const me = last === 'Zhu' && first.startsWith('Junyi');
    return { first, last, star, me };
  });
}

function initialise(first) {
  return first.split(/[\s]+/).filter(Boolean).map((w) => (w.endsWith('.') ? w : w[0] + '.')).join(' ');
}

export function authorsHtml(field, { initials = true } = {}) {
  return parseAuthors(field).map((a) => {
    const name = (initials ? initialise(a.first) : a.first) + ' ' + a.last + (a.star ? '*' : '');
    return a.me ? `<strong>${esc(name)}</strong>` : esc(name);
  }).join(', ');
}

// ---------------------------------------------------------------- fragments

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap" rel="stylesheet">`;

// Cloudflare Web Analytics — data is only visible in the owner's Cloudflare dashboard.
const ANALYTICS = `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "1bd5bd56d1134e6e8b20307f6f4d03bc"}'></script>`;

function head({ title, desc, path, rel, jsonld, image, type = 'website', extra = '' }) {
  const canonical = SITE + '/' + path;
  const img = SITE + '/' + (image || 'assets/img/profile.jpg');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23141414'/%3E%3Ctext x='32' y='43' font-family='Helvetica,Arial,sans-serif' font-size='28' font-weight='700' fill='%23fff' text-anchor='middle'%3EJZ%3C/text%3E%3C/svg%3E">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary">
${extra}${FONTS}
<link rel="stylesheet" href="${rel}assets/css/main.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
${ANALYTICS}
</head>`;
}

// Email is assembled client-side so the address never appears in the HTML source.
const EMAIL_JS = `<script>document.querySelectorAll('.js-email').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();location.href='mailto:'+a.dataset.u+'@'+a.dataset.d;});});</script>`;
const emailLink = (cls = '') => `<a href="#contact" class="js-email ${cls}" data-u="${EMAIL_USER}" data-d="${EMAIL_DOMAIN}" rel="nofollow">Email</a>`;

function topBar(rel, active) {
  return `<header class="top"><div class="top-inner">
<a class="top-name" href="${rel}">Junyi Zhu</a>
<nav class="top-nav">
<a href="${rel}publications/"${active === 'pubs' ? ' style="color:var(--ink);font-weight:700"' : ''}>Publications</a>
<a href="${SCHOLAR}">Google Scholar</a>
${emailLink('accent')}
</nav>
</div></header>`;
}

const FOOTER = '';

function venueLine(f) {
  return `<span class="venue">${esc(f.abbr || '')} ${esc(f.year)}</span>${f.note ? `<span class="pub-note">${esc(f.note)}</span>` : ''}`;
}

function pubRow(p, rel) {
  const f = p.fields;
  const thumb = f.preview ? `${rel}assets/img/pub/${f.preview.replace(/\.\w+$/, '.jpg')}` : '';
  const href = f.slug ? `${rel}publications/${f.slug}/` : (f.html || '');
  const ext = f.slug && f.html ? ` <a class="pub-ext" href="${esc(f.html)}">paper ↗</a>` : '';
  return `<article class="pub">
${thumb ? `<img class="pub-thumb" src="${thumb}" alt="" loading="lazy" width="96" height="64">` : ''}
<div class="pub-body">
${href ? `<a class="pub-title" href="${esc(href)}">${esc(f.title)}</a>` : `<span class="pub-title">${esc(f.title)}</span>`}
<p class="pub-authors">${authorsHtml(f.author)}</p>
${venueLine(f)}${ext}
</div>
</article>`;
}

// ---------------------------------------------------------------- pages

function renderIndex(bio, news, papers) {
  const selected = papers.filter((p) => p.fields.selected === 'true')
    .sort((a, b) => Number(b.fields.year) - Number(a.fields.year));
  const jsonld = [{
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Junyi Zhu',
    url: SITE,
    image: SITE + '/assets/img/profile.jpg',
    jobTitle: 'Senior Applied Scientist',
    worksFor: { '@type': 'Organization', name: 'Microsoft', url: 'https://www.microsoft.com' },
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'KU Leuven', url: 'https://www.kuleuven.be' },
      { '@type': 'CollegeOrUniversity', name: 'Karlsruhe Institute of Technology', url: 'https://www.kit.edu' },
    ],
    knowsAbout: ['post-training of large language models', 'large language models', 'Microsoft 365 Copilot', 'federated learning', 'generative models', 'privacy-preserving machine learning'],
    sameAs: [SCHOLAR, LINKEDIN],
  }, {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Junyi Zhu',
    url: SITE,
  }];
  return `${head({
    title: 'Junyi Zhu — AI Researcher · Post-training for Microsoft 365 Copilot',
    desc: 'Junyi Zhu is a Senior Applied Scientist at Microsoft, driving post-training for Microsoft 365 Copilot.',
    path: '', rel: '', jsonld,
  })}
<body>
<div class="home">
<aside class="sidebar"><div class="sidebar-inner">
<img class="avatar" src="assets/img/profile.jpg" alt="Portrait of Junyi Zhu" width="136" height="136">
<h1 class="name">Junyi Zhu</h1>
<p class="role">Senior Applied Scientist at <a href="https://www.microsoft.com/en-gb/about/offices/paddington/">Microsoft UK</a></p>
<nav class="side-nav">
<a href="publications/">Publications</a>
<a href="${SCHOLAR}">Google Scholar</a>
<a href="${LINKEDIN}">LinkedIn</a>
${emailLink('accent')}
</nav>
</div></aside>
<main class="content">
<div class="bio">
${bio.trim()}
</div>
<h2 class="sec">News</h2>
<div class="news">
${news.map((n) => `<div class="news-item"><span class="news-date">${fmtDate(n.date)}</span><span>${n.text}</span></div>`).join('\n')}
</div>
<h2 class="sec">Selected publications</h2>
<div class="pubs">
${selected.map((p) => pubRow(p, '')).join('\n')}
</div>
<a class="all-link" href="publications/">All publications →</a>
<!--
  Projects & demos — hidden until populated. To enable, move this section above
  the footer and add cards (each may embed a <video> or link out to a project):
  <h2 class="sec" id="projects">Projects &amp; demos</h2>
  <div class="pubs"> ... </div>
-->
${FOOTER}
</main>
</div>
${EMAIL_JS}
</body>
</html>`;
}

function renderPublications(papers) {
  const years = [...new Set(papers.map((p) => p.fields.year))].sort((a, b) => Number(b) - Number(a));
  return `${head({
    title: 'Publications — Junyi Zhu',
    desc: 'Publications by Junyi Zhu (Microsoft) at NeurIPS, ICLR, CVPR, ICML, EMNLP, KDD, ACL, WACV and TMLR — post-training of LLMs, generative models, federated learning, privacy-preserving machine learning.',
    path: 'publications/', rel: '../',
  })}
<body>
${topBar('../', 'pubs')}
<main class="page">
<h1 class="page-title">Publications</h1>
${years.map((y) => `<h2 class="year-h">${y}</h2>\n<div class="pubs">\n${papers.filter((p) => p.fields.year === y).map((p) => pubRow(p, '../')).join('\n')}\n</div>`).join('\n')}
</main>
${FOOTER}
${EMAIL_JS}
</body>
</html>`;
}

export function bibtexFor(p) {
  const f = p.fields;
  const authors = parseAuthors(f.author).map((a) => `${a.last}, ${a.first}`).join(' and ');
  const isJournal = /TMLR/i.test(f.abbr || '');
  const isPreprint = /^arxiv$/i.test(f.abbr || '');
  const type = isJournal ? 'article' : isPreprint ? 'misc' : 'inproceedings';
  const lines = [`@${type}{zhu_${p.key},`,
    `  title     = {${f.title}},`,
    `  author    = {${authors}},`,
    `  year      = {${f.year}},`];
  if (isJournal) lines.push(`  journal   = {${f.publisher}},`);
  else if (isPreprint) lines.push(`  eprint    = {${f.arxiv || ''}},`, `  archivePrefix = {arXiv},`);
  else lines.push(`  booktitle = {${f.publisher}},`);
  if (f.arxiv && !isPreprint) lines.push(`  url       = {https://arxiv.org/abs/${f.arxiv}},`);
  lines.push('}');
  return lines.join('\n');
}

function renderPaper(p) {
  const f = p.fields;
  const path = `publications/${f.slug}/`;
  const rel = '../../';
  const thumb = f.preview ? `assets/img/pub/${f.preview.replace(/\.\w+$/, '.jpg')}` : '';
  const arxivUrl = f.arxiv ? `https://arxiv.org/abs/${f.arxiv}` : '';
  const doi = f.arxiv ? `10.48550/arXiv.${f.arxiv}` : '';
  const citationMeta = [
    `<meta name="citation_title" content="${esc(f.title)}">`,
    ...parseAuthors(f.author).map((a) => `<meta name="citation_author" content="${esc(a.first + ' ' + a.last)}">`),
    `<meta name="citation_publication_date" content="${esc(f.year)}">`,
    f.arxiv ? `<meta name="citation_arxiv_id" content="${f.arxiv}">` : '',
    f.arxiv ? `<meta name="citation_pdf_url" content="https://arxiv.org/pdf/${f.arxiv}">` : '',
    doi ? `<meta name="citation_doi" content="${doi}">` : '',
  ].filter(Boolean).join('\n') + '\n';
  const links = [];
  if (arxivUrl) links.push(`<a class="btn" href="${arxivUrl}">arXiv</a>`);
  if (f.html && f.html !== arxivUrl) links.push(`<a class="btn" href="${esc(f.html)}">Publisher page</a>`);
  if (f.code) links.push(`<a class="btn" href="${esc(f.code)}">Code</a>`);
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: f.title,
    name: f.title,
    author: parseAuthors(f.author).map((a) => {
      const person = { '@type': 'Person', name: `${a.first} ${a.last}` };
      if (a.me) { person.url = SITE; person.sameAs = [SCHOLAR, LINKEDIN]; }
      return person;
    }),
    datePublished: f.year,
    publisher: { '@type': 'Organization', name: f.publisher },
    abstract: f.abstract || undefined,
    url: SITE + '/' + path,
    mainEntityOfPage: SITE + '/' + path,
    sameAs: [arxivUrl, f.html, doi ? 'https://doi.org/' + doi : ''].filter(Boolean),
    identifier: f.arxiv ? [
      { '@type': 'PropertyValue', propertyID: 'arXiv', value: f.arxiv },
      { '@type': 'PropertyValue', propertyID: 'DOI', value: doi },
    ] : undefined,
    image: thumb ? SITE + '/' + thumb : undefined,
  };
  return `${head({
    title: `${f.title} (${f.abbr} ${f.year}) — Junyi Zhu`,
    desc: (f.summary || f.abstract || f.title).split(/(?<=\.)\s/)[0],
    path, rel, jsonld, image: thumb, type: 'article', extra: citationMeta,
  })}
<body>
${topBar(rel, 'pubs')}
<main class="page">
<a class="back-link" href="../">← All publications</a>
<article>
<h1 class="paper-title">${esc(f.title)}</h1>
<p class="paper-authors">${authorsHtml(f.author, { initials: false })}</p>
<p class="paper-venue">${venueLine(f)}<span style="margin-left:8px">${esc(f.publisher)}</span></p>
<div class="paper-links">${links.join('\n')}</div>
${thumb ? `<img class="paper-fig" src="${rel}assets/img/pub/fig/${f.preview.replace(/\.\w+$/, '.jpg')}" alt="Key figure from the paper" loading="lazy">` : ''}
${f.summary ? `<h2 class="paper-h">In brief</h2>\n<p class="paper-summary">${esc(f.summary)}</p>` : ''}
${f.takeaways ? `<h2 class="paper-h">Key takeaways</h2>\n<ul class="paper-takeaways">\n${f.takeaways.split('|').map((t) => `<li>${esc(t.trim())}</li>`).join('\n')}\n</ul>` : ''}
${f.abstract ? `<h2 class="paper-h">Abstract</h2>\n<p class="paper-abstract">${esc(f.abstract)}</p>` : ''}
<h2 class="paper-h">BibTeX</h2>
<pre class="bibtex">${esc(bibtexFor(p))}</pre>
</article>
</main>
${FOOTER}
${EMAIL_JS}
</body>
</html>`;
}

function render404() {
  return `${head({ title: 'Page not found — Junyi Zhu', desc: 'Page not found.', path: '404.html', rel: '/' })}
<body>
${topBar('/')}
<main class="page"><h1 class="page-title">Page not found</h1><p><a href="/">← Back to the homepage</a></p></main>
</body></html>`;
}

function llmsTxt(papers) {
  const pages = papers.filter((p) => p.fields.slug).map((p) => {
    const f = p.fields;
    const brief = f.summary ? ' — ' + f.summary.split(/(?<=\.)\s/)[0] : '';
    return `  - [${f.title} (${f.abbr} ${f.year})](${SITE}/publications/${f.slug}/)${brief}`;
  }).join('\n');
  return `# Junyi Zhu\n\n> Junyi Zhu is an AI researcher and Senior Applied Scientist at Microsoft, where he drives post-training for Microsoft 365 Copilot — post-training OpenAI models to synergize with Microsoft's tools, applications, and ecosystem, with a focus on enterprise and workplace scenarios. His research spans post-training of LLMs, generative models, federated learning, and privacy-preserving machine learning, with publications at NeurIPS, ICLR, CVPR, ICML, and EMNLP. He holds a PhD from KU Leuven (advised by Prof. Matthew Blaschko) and a Master's degree from the Karlsruhe Institute of Technology, and previously worked at Samsung Research.\n\nContact: via the email link on the homepage. Profiles: [Google Scholar](${SCHOLAR}), [LinkedIn](${LINKEDIN}).\n\n## Site structure\n\n- [Home](${SITE}/): bio, news, selected publications\n- [Publications](${SITE}/publications/): full publication list, generated from BibTeX\n- Individual paper pages, linked from titles in the publications list (each has the abstract, a plain-language summary, key takeaways, BibTeX, and links to arXiv/code):\n${pages}\n`;
}

// Meta-refresh stubs for URLs that existed on the old (al-folio) site.
function redirect(target) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Redirecting…</title><meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${target}"><meta name="robots" content="noindex"></head><body><a href="${target}">This page has moved</a></body></html>`;
}

function sitemap(paths) {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `<url><loc>${SITE}/${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>`;
}

// ---------------------------------------------------------------- build

export function build(read) {
  const papers = parseBib(read('_data/papers.bib'));
  const news = parseNews(read('_data/news.yml'));
  const bio = read('_data/bio.html');
  const out = {};
  out['index.html'] = renderIndex(bio, news, papers);
  out['publications/index.html'] = renderPublications(papers);
  const paperPages = papers.filter((p) => p.fields.slug);
  for (const p of paperPages) out[`publications/${p.fields.slug}/index.html`] = renderPaper(p);
  out['404.html'] = render404();
  out['llms.txt'] = llmsTxt(papers);
  out['news/index.html'] = redirect(SITE + '/');
  out['repositories/index.html'] = redirect(SITE + '/');
  out['sitemap.xml'] = sitemap(['', 'publications/', ...paperPages.map((p) => `publications/${p.fields.slug}/`)]);
  return out;
}

// Node entrypoint
if (globalThis.process?.versions?.node) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const out = build((p) => fs.readFileSync(p, 'utf8'));
  for (const [file, content] of Object.entries(out)) {
    fs.mkdirSync(path.dirname(file) || '.', { recursive: true });
    fs.writeFileSync(file, content);
    console.log('wrote', file);
  }
}
