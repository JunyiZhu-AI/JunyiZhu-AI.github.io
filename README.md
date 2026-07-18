# junyizhu-ai.github.io

Source of my personal academic homepage: **[junyizhu-ai.github.io](https://junyizhu-ai.github.io)**

A fully static site generated from a few data files by a zero-dependency Node
script — no framework, no npm install, no build toolchain. Pushing to `master`
triggers a GitHub Actions workflow that runs the generator and deploys to
GitHub Pages.

## How it works

```
_data/papers.bib    publications (BibTeX) — the single source of truth for all paper data
_data/news.yml      news items (date + one line of HTML)
_data/bio.html      homepage bio paragraphs
build.mjs           generator: data → index.html, publications/, paper pages, sitemap, llms.txt
assets/             CSS and web-optimized images
.github/workflows/  build + deploy to GitHub Pages
```

Generated files (`index.html`, `publications/**`, `sitemap.xml`, `404.html`,
`llms.txt`) are rebuilt on every push — edit the `_data/` files, never the
generated HTML.

## Updating content

- **New paper**: append a BibTeX entry to `_data/papers.bib`. Optional fields:
  `selected={true}` shows it on the homepage; `slug={...}` (plus `arxiv`, `code`,
  `abstract`, `summary`, `takeaways`) creates a dedicated page at
  `/publications/<slug>/` with citation metadata and ScholarlyArticle JSON-LD.
  Add a preview image in `assets/img/publication_preview/` and a web-sized copy
  at `assets/img/pub/<name>.jpg`.
- **News**: add an item at the top of `_data/news.yml`.
- **Bio**: edit `_data/bio.html`.

## Local preview

```
node build.mjs
python3 -m http.server   # then open http://localhost:8000
```
