# Fundamentals of Catholic Dogma

The full text of Ludwig Ott's *Fundamentals of Catholic Dogma* (4th ed., 1960;
English edition edited by James Canon Bastible, translated by Patrick Lynch) as a
static reading site with search, a navigable table of contents, and light, dark,
and auto color themes.

## Design

A "fine scholarly press" language, built on the book's own furniture: the home
page is a title page after the 1960 printing (small-caps credits, rule-diamond
ornament, Roman numerals for the five Books), chapters open with hairline rules
and rubric-red grade tags (the missal convention for DE FIDE and kin), thesis
statements carry an accent rule marking the definitional sentence, and prose
openings take a drop cap. One accent color (liturgical red) on warm paper; the
dark theme is a retuned lamplight study (cream ink, terracotta red), with every
text pair verified at WCAG AA contrast. System serif stack for the book, sans
for interface labels only, so the site stays a zero-dependency static build.

The text was parsed from the Internet Archive scan of the TAN Books 1974
printing. Structure follows the printed book: front matter, Introduction,
five Books with Parts, Sections and Chapters, 288 numbered thesis sections
with their theological grades of certainty, plus Bibliography, Corrigenda, and
the three indexes. Index page references link to the chapter covering that
printed page. The OCR retains occasional scanning errors. Paragraph breaks
that the scan introduced at page, column, and line boundaries have been
rejoined (about 3,500 merges, checked against the print layout), and the
page-bottom source citations of the print are set off as footnotes.

Printed page numbers were verified page by page against the scan's running
heads and folios. The scan itself lacks seven printed pages, all at Book
boundaries: 12, 77, 78, 124, 218, 471 and 472. The corrigenda opener is an
unnumbered insert, so the Bibliography ends on printed page 503 and the
Index of Persons begins on 505.

## Run locally

Any static file server works:

    python3 -m http.server 8000

Then open http://localhost:8000. Opening `index.html` directly from disk also
works in most browsers, but Safari blocks the `fetch` of `data/book.json`, so a
server is the reliable path.

## Deploy on Render.com

The repository is ready to deploy as a static site; there is no build step.
Once deployed, the site is served at **https://ott-fundamentals.onrender.com**
(the subdomain follows the service name `ott-fundamentals` set in
`render.yaml`).

1. Push this directory to a Git repository (GitHub, GitLab).
2. In Render, choose **New** and then **Blueprint**, and select the repository.
   Render reads `render.yaml` and creates the static site, or
3. Choose **New** then **Static Site**, point it at the repository, leave the
   build command empty, and set the publish directory to the repository root.
   Name the service `ott-fundamentals` to get the same subdomain.

## Files

    index.html          page shell
    assets/style.css    styles (light, dark, responsive)
    assets/app.js       router, search, themes, rendering
    data/book.json      the parsed book (about 1.8 MB)
    render.yaml         Render blueprint

## Keyboard

- `/` focuses search
- `Enter` in search jumps to the first result
- `Escape` closes the menu or clears the search
- `Tab` moves through all controls
