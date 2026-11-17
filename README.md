# Fundamentals of Catholic Dogma

The full text of Ludwig Ott's *Fundamentals of Catholic Dogma* (4th ed., 1960;
English edition edited by James Canon Bastible, translated by Patrick Lynch) as a
static reading site with search, a navigable table of contents, and light, dark,
and auto color themes.

The text was parsed from the Internet Archive scan of the TAN Books 1974
printing. Structure follows the printed book: front matter, Introduction,
five Books with Parts, Sections and Chapters, 288 numbered thesis sections
with their theological grades of certainty, plus Bibliography, Corrigenda, and
the three indexes. Index page references link to the chapter covering that
printed page. The OCR retains occasional scanning errors.

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

1. Push this directory to a Git repository (GitHub, GitLab).
2. In Render, choose **New** and then **Blueprint**, and select the repository.
   Render reads `render.yaml` and creates the static site, or
3. Choose **New** then **Static Site**, point it at the repository, leave the
   build command empty, and set the publish directory to the repository root.

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
