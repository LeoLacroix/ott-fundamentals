/* Fundamentals of Catholic Dogma: reader application.
   Zero-dependency static site. State lives in the hash: #/page-id or #/page-id/block. */
(function () {
  'use strict';

  var DATA_URL = 'data/book.json';

  var book = null;          // parsed book.json
  var pageById = null;      // id -> page
  var pageOrder = [];       // ordered page ids (front, body, back)
  var refRanges = null;     // print page -> page id, for index references
  var searchIndex = [];     // {pi, bi, hay, title}
  var currentQuery = '';

  // ------------------------------------------------ common helpers
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ------------------------------------------------ theme
  var themeOrder = ['auto', 'light', 'dark'];
  var themeMode = 'auto';
  try {
    var saved = localStorage.getItem('ott-theme');
    if (themeOrder.indexOf(saved) >= 0) themeMode = saved;
  } catch (e) {}

  function resolvedTheme() {
    if (themeMode === 'auto') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeMode;
  }

  function applyTheme() {
    document.documentElement.dataset.theme = resolvedTheme();
    $('theme-btn').textContent = themeMode.charAt(0).toUpperCase() + themeMode.slice(1);
  }

  $('theme-btn').addEventListener('click', function () {
    themeMode = themeOrder[(themeOrder.indexOf(themeMode) + 1) % 3];
    try { localStorage.setItem('ott-theme', themeMode); } catch (e) {}
    applyTheme();
  });

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { if (themeMode === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }

  // ------------------------------------------------ data loading
  function loadBook() {
    $('state-loading').hidden = false;
    $('state-error').hidden = true;
    $('article').hidden = true;
    $('results').hidden = true;
    fetch(DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (data) {
        book = data;
        prepare();
        applyTheme();
        $('state-loading').hidden = true;
        buildToc();
        route();
      })
      .catch(function () {
        $('state-loading').hidden = true;
        $('state-error').hidden = false;
      });
  }

  $('retry-btn').addEventListener('click', loadBook);

  function prepare() {
    pageById = {};
    pageOrder = [];
    book.pages.forEach(function (p) { pageById[p.id] = p; pageOrder.push(p.id); });

    // print-page reference map from body pages only (print pp. 1-489)
    refRanges = {};
    var bodyPages = book.pages.filter(function (p) { return p.kind === 'chapter' || p.kind === 'intro'; });
    for (var i = 0; i < bodyPages.length; i++) {
      var a = bodyPages[i].pp;
      var b = i + 1 < bodyPages.length ? bodyPages[i + 1].pp - 1 : 489;
      for (var n = a; n <= b && n <= 489; n++) refRanges[n] = bodyPages[i].id;
    }

    // footer
    $('footer-line').textContent =
      'Ludwig Ott, Fundamentals of Catholic Dogma. Edited in English by James Canon Bastible, ' +
      'translated by Patrick Lynch. ' + book.meta.edition + '. ' +
      'Source scan: Internet Archive.';

    // search index
    searchIndex = [];
    book.pages.forEach(function (p, pi) {
      searchIndex.push({ pi: pi, bi: -1, hay: (p.crumb.join(' ') + ' ' + p.title).toLowerCase(), title: p.title });
      p.blocks.forEach(function (b, bi) {
        var hay = b.x;
        if (b.t === 'sh' && b.n != null) hay = b.n + '. ' + hay;
        searchIndex.push({ pi: pi, bi: bi, hay: hay.toLowerCase(), title: b.t === 'sh' ? b.x : p.title });
      });
    });
  }

  // ------------------------------------------------ table of contents
  function tocLink(page) {
    var a = el('a', 'toc-item', page.title);
    a.href = '#/' + page.id;
    return a;
  }

  function buildToc() {
    var sidebar = $('sidebar');
    sidebar.textContent = '';

    // Drawer head: labels the pane, carries the close control on mobile.
    var head = el('div', 'drawer-head');
    head.appendChild(el('span', 'drawer-title', 'Contents'));
    var closeBtn = el('button', 'drawer-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close contents');
    closeBtn.appendChild(el('span', null, '\u00D7'));
    closeBtn.addEventListener('click', function () {
      closeDrawer();
      menuBtn.focus();
    });
    head.appendChild(closeBtn);
    sidebar.appendChild(head);

    var root = el('ul', 'toc-root');
    var t = book.toc;

    function group(node, depth) {
      var li = el('li', 'toc-group toc-group-depth-' + Math.min(depth, 3));
      var btn = el('button', 'toc-toggle');
      var tw = el('span', 'tw', '\u25B8');
      tw.setAttribute('aria-hidden', 'true');
      btn.appendChild(tw);
      btn.appendChild(document.createTextNode(node.title));
      btn.setAttribute('aria-expanded', 'false');
      var kids = el('ul', 'toc-children');
      node.children.forEach(function (c) {
        if (c.children) {
          kids.appendChild(group(c, depth + 1));
        } else if (c.id) {
          var li2 = el('li');
          li2.appendChild(tocLink(pageById[c.id]));
          kids.appendChild(li2);
        }
      });
      btn.addEventListener('click', function () {
        var open = li.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        tw.textContent = open ? '\u25BE' : '\u25B8';
      });
      li.appendChild(btn);
      li.appendChild(kids);
      return li;
    }

    function label(txt) {
      var li = el('li');
      li.appendChild(el('div', 'toc-label', txt));
      return li;
    }

    function leafList(entries) {
      var ul = el('ul', 'toc-children');
      entries.forEach(function (e) {
        var li = el('li');
        li.appendChild(tocLink(pageById[e.id]));
        ul.appendChild(li);
      });
      return ul;
    }

    var liF = el('li', 'toc-group open');
    liF.appendChild(el('div', 'toc-label', 'Front Matter'));
    liF.appendChild(leafList(t.front));
    root.appendChild(liF);

    var liI = el('li');
    liI.appendChild(tocLink(pageById[t.body[0].id]));
    root.appendChild(liI);

    t.body.slice(1).forEach(function (b) {
      root.appendChild(group(b, 0));
    });

    var liB = el('li', 'toc-group');
    liB.appendChild(el('div', 'toc-label', 'Reference'));
    liB.appendChild(leafList(t.back));
    root.appendChild(liB);

    sidebar.appendChild(root);
  }

  function markCurrentToc(pageId) {
    var links = $('sidebar').querySelectorAll('a.toc-item');
    for (var i = 0; i < links.length; i++) {
      var isCur = links[i].getAttribute('href') === '#/' + pageId;
      if (isCur) links[i].setAttribute('aria-current', 'page');
      else links[i].removeAttribute('aria-current');
      if (isCur) {
        var n = links[i];
        while (n && n !== $('sidebar')) {
          if (n.classList && n.classList.contains('toc-group')) {
            n.classList.add('open');
            var btn = n.querySelector(':scope > .toc-toggle');
            if (btn) {
              btn.setAttribute('aria-expanded', 'true');
              var tw = btn.querySelector('.tw');
              if (tw) tw.textContent = '\u25BE';
            }
          }
          n = n.parentNode;
        }
        links[i].scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ------------------------------------------------ rendering
  function linkifyRefs(html) {
    return html.replace(/(^|[\s,;:(["\u2018\u201C\u2014\u2013])((?:\d{1,3})(?:\s?[-f]\.?\s?\d{1,3})*(?:f+\.?|ff\.?)?)/g,
      function (all, pre, numstr) {
        var m = numstr.match(/^(\d{1,3})/);
        var first = parseInt(m[1], 10);
        var target = refRanges[first];
        if (!target) return all;
        return pre + '<a class="ref" href="#/' + target + '">' + esc(numstr) + '</a>';
      });
  }

  // Scripture index rows read "chapter, verse, then page": only the page
  // number after the dash is a page reference, so only that links.
  function linkifyScriptureRefs(html) {
    return html.replace(/([\u2014\u2013]\s*)(\d{1,3})/g,
      function (all, dash, numstr) {
        var target = refRanges[parseInt(numstr, 10)];
        if (!target) return all;
        return dash + '<a class="ref" href="#/' + target + '">' + esc(numstr) + '</a>';
      });
  }

  function renderBlocks(page, container) {
    var frag = document.createDocumentFragment();
    var inList = false;
    var list = null;

    function endList() {
      if (inList) { frag.appendChild(list); inList = false; list = null; }
    }

    page.blocks.forEach(function (b, bi) {
      if (b.t === 'ix') {
        if (!inList) { list = el('ul', 'ix-list'); inList = true; }
        var li = el('li');
        li.dataset.bi = bi;
        if (page.kind === 'back') {
          li.innerHTML = page.id.indexOf('index-to-the-old') === 0
            ? linkifyScriptureRefs(esc(b.x))
            : linkifyRefs(esc(b.x));
        }
        else li.textContent = b.x;
        list.appendChild(li);
        return;
      }
      endList();
      var node;
      if (b.t === 'sh') {
        var sec = el('section', 'thesis');
        sec.id = 'b' + bi;
        sec.dataset.bi = bi;
        var h = el('h3', 'thesis-title');
        if (b.n != null) {
          var num = el('span', 'tnum', '\u00A7 ' + b.n + '.');
          h.appendChild(num);
          h.appendChild(document.createTextNode(' ' + b.x));
        } else {
          h.appendChild(document.createTextNode(b.x));
        }
        if (b.g) h.appendChild(el('span', 'grade', b.g));
        sec.appendChild(h);
        node = sec;
      } else if (b.t === 'th') {
        node = el('p', 'thesis-statement');
        node.dataset.bi = bi;
        node.textContent = b.x;
        if (b.g) {
          var g = el('span', 'grade', b.g);
          node.appendChild(g);
        }
      } else if (b.t === 'h4') {
        node = el('h4'); node.dataset.bi = bi; node.textContent = b.x;
      } else if (b.t === 'h5') {
        node = el('h5'); node.dataset.bi = bi; node.textContent = b.x;
      } else if (b.t === 'h6') {
        node = el('h6'); node.dataset.bi = bi; node.textContent = b.x;
      } else if (b.t === 'fn') {
        // citation lifted from a page-bottom footnote of the print
        node = el('p', 'fn'); node.dataset.bi = bi; node.textContent = b.x;
      } else {
        node = el('p', bi === 0 ? 'opening' : null); node.dataset.bi = bi; node.textContent = b.x;
      }
      frag.appendChild(node);
    });
    endList();
    container.appendChild(frag);
  }

  function renderPage(page, targetBlock) {
    var art = $('article');
    art.textContent = '';
    art.hidden = false;
    $('results').hidden = true;

    var crumb = el('p', 'crumb');
    page.crumb.forEach(function (c, i) {
      if (i > 0) crumb.appendChild(el('span', 'sep', '\u203A'));
      crumb.appendChild(document.createTextNode(c));
    });
    if (page.crumb.length) art.appendChild(crumb);

    var h1 = el('h1', 'page-title', page.title);
    h1.id = 'top';
    art.appendChild(h1);

    if (page.kind === 'chapter' || page.kind === 'intro') {
      art.appendChild(el('p', 'page-pp', 'Pp. ' + page.pp + ' ff.'));
    }

    renderBlocks(page, art);

    // previous / next
    var idx = pageOrder.indexOf(page.id);
    var nav = el('nav', 'page-nav');
    nav.setAttribute('aria-label', 'Page navigation');
    if (idx > 0) {
      var prev = pageById[pageOrder[idx - 1]];
      var a1 = el('a');
      a1.href = '#/' + prev.id;
      a1.innerHTML = '<span class="dir">Previous</span>' + esc(prev.title);
      nav.appendChild(a1);
    }
    if (idx >= 0 && idx < pageOrder.length - 1) {
      var next = pageById[pageOrder[idx + 1]];
      var a2 = el('a', 'next');
      a2.href = '#/' + next.id;
      a2.innerHTML = '<span class="dir">Next</span>' + esc(next.title);
      nav.appendChild(a2);
    }
    art.appendChild(nav);

    markCurrentToc(page.id);
    document.title = page.title + ' \u00B7 Fundamentals of Catholic Dogma';

    if (targetBlock != null) {
      var target = art.querySelector('[data-bi="' + targetBlock + '"]');
      if (target) {
        target.scrollIntoView({ block: 'center' });
        target.classList.add('flash');
        setTimeout(function () { target.classList.remove('flash'); }, 2400);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }

  function roman(n) {
    var table = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var out = '';
    for (var i = 0; i < table.length; i++) {
      while (n >= table[i][0]) { out += table[i][1]; n -= table[i][0]; }
    }
    return out;
  }

  function renderHome() {
    var art = $('article');
    art.textContent = '';
    art.hidden = false;
    $('results').hidden = true;
    markCurrentToc(null);

    // Title page, after the 1960 printing: author, title, rule-diamond
    // ornament, small-caps credits, edition lines.
    var tp = el('div', 'titlepage');
    tp.appendChild(el('p', 'tp-author', book.meta.author));
    tp.appendChild(el('h1', 'tp-title', book.meta.title));
    var orn = el('div', 'tp-ornament');
    orn.setAttribute('aria-hidden', 'true');
    orn.appendChild(el('span', 'tp-diamond'));
    tp.appendChild(orn);
    var cred = el('p', 'tp-credits');
    var l1 = el('span', 'line', 'Edited in English by ' + book.meta.editor);
    var l2 = el('span', 'line', 'Translated by ' + book.meta.translator);
    cred.appendChild(l1);
    cred.appendChild(l2);
    tp.appendChild(cred);
    var edBits = book.meta.edition.split('(');
    tp.appendChild(el('p', 'tp-edition', edBits[0].trim().replace(/,$/, '')));
    if (edBits[1]) {
      tp.appendChild(el('p', 'tp-edition', edBits[1].replace(/\)$/, '').trim()));
    }
    tp.appendChild(el('p', 'tp-original', 'From the German ' + book.meta.original));
    art.appendChild(tp);

    // Contents: the Introduction and the five Books as the featured list.
    var contents = el('div', 'tp-contents');
    var books = el('ul', 'tp-books');

    var liIntro = el('li');
    var aIntro = el('a', 'tp-book tp-intro');
    aIntro.href = '#/' + book.toc.body[0].id;
    aIntro.appendChild(el('span', 'tp-book-title', 'Introduction'));
    aIntro.appendChild(el('span', 'tp-count', '\u00A7\u00A7 1-9'));
    liIntro.appendChild(aIntro);
    books.appendChild(liIntro);

    book.toc.body.slice(1).forEach(function (b, i) {
      var li = el('li');
      var a = el('a', 'tp-book');
      a.href = '#/' + firstLeaf(b);
      var count = 0;
      (function countTheses(n) {
        n.children.forEach(function (c) {
          if (c.children) countTheses(c);
          else if (c.id && pageById[c.id]) count += pageById[c.id].blocks.filter(function (x) { return x.t === 'sh'; }).length;
        });
      })(b);
      a.appendChild(el('span', 'tp-num', roman(i + 1)));
      a.appendChild(el('span', 'tp-book-title', b.title));
      a.appendChild(el('span', 'tp-count', count + ' numbered sections'));
      li.appendChild(a);
      books.appendChild(li);
    });
    contents.appendChild(books);

    // Front matter and reference as quiet link columns.
    contents.appendChild(el('p', 'tp-label', 'Front matter'));
    var fm = el('ul', 'tp-links');
    book.toc.front.forEach(function (f) {
      var li = el('li');
      var a = el('a', null, pageById[f.id].title);
      a.href = '#/' + f.id;
      li.appendChild(a);
      fm.appendChild(li);
    });
    contents.appendChild(fm);

    contents.appendChild(el('p', 'tp-label', 'Reference'));
    var ref = el('ul', 'tp-links');
    book.toc.back.forEach(function (f) {
      var li = el('li');
      var a = el('a', null, pageById[f.id].title);
      a.href = '#/' + f.id;
      li.appendChild(a);
      ref.appendChild(li);
    });
    contents.appendChild(ref);

    art.appendChild(contents);

    document.title = 'Fundamentals of Catholic Dogma';
    window.scrollTo(0, 0);
  }

  function firstLeaf(node) {
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        var r = firstLeaf(node.children[i]);
        if (r) return r;
      }
    }
    return node.id || null;
  }

  // ------------------------------------------------ search
  function excerptFor(hay, terms) {
    var lower = hay.toLowerCase();
    var pos = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = lower.indexOf(terms[i]);
      if (p >= 0 && (pos < 0 || p < pos)) pos = p;
    }
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - 70);
    var end = Math.min(hay.length, pos + 160);
    var s = (start > 0 ? '\u2026 ' : '') + hay.slice(start, end) + (end < hay.length ? ' \u2026' : '');
    return highlight(s, terms);
  }

  function highlight(s, terms) {
    var escaped = esc(s);
    terms.forEach(function (t) {
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      escaped = escaped.replace(re, '<mark>$1</mark>');
    });
    return escaped;
  }

  function runSearch(query) {
    currentQuery = query;
    var art = $('article');
    var res = $('results');
    art.hidden = true;
    res.hidden = false;
    res.textContent = '';
    markCurrentToc(null);
    document.title = 'Search: ' + query + ' \u00B7 Fundamentals of Catholic Dogma';

    var terms = query.toLowerCase().split(/\s+/).filter(function (t) { return t.length >= 2; });
    if (!terms.length) {
      res.appendChild(el('p', 'no-results', 'Type at least two letters.'));
      return;
    }

    var hits = [];
    for (var i = 0; i < searchIndex.length; i++) {
      var e = searchIndex[i];
      var ok = true;
      for (var j = 0; j < terms.length; j++) {
        if (e.hay.indexOf(terms[j]) < 0) { ok = false; break; }
      }
      if (ok) hits.push(e);
    }

    hits.sort(function (a, b) {
      var at = a.bi < 0 ? 0 : 1, bt = b.bi < 0 ? 0 : 1;
      if (at !== bt) return at - bt;
      return a.pi - b.pi || a.bi - b.bi;
    });

    if (!hits.length) {
      var none = el('p', 'no-results', 'No results for "' + query + '". Check the spelling, or browse the contents.');
      res.appendChild(none);
      return;
    }

    var head = el('p', 'results-head');
    var shown = Math.min(hits.length, 100);
    var strong = el('strong', null, hits.length === 1 ? '1 match' : hits.length + ' matches');
    head.appendChild(strong);
    head.appendChild(document.createTextNode(hits.length > shown ? ' (showing first ' + shown + ')' : ''));
    res.appendChild(head);

    var body = document.createElement('div');
    for (var k = 0; k < shown; k++) {
      var h = hits[k];
      var page = book.pages[h.pi];
      var a = el('a', 'result');
      a.href = '#/' + page.id + (h.bi >= 0 ? '/' + h.bi : '');
      var rTitle = el('div', 'r-title');
      var block = h.bi >= 0 ? page.blocks[h.bi] : null;
      if (block && block.t === 'sh' && block.n != null) {
        rTitle.appendChild(el('span', 'r-num', '\u00A7 ' + block.n));
      }
      rTitle.appendChild(document.createTextNode(h.title));
      var rCrumb = el('div', 'r-crumb', page.crumb.concat(page.title).join(' \u203A '));
      var rEx = el('div', 'r-excerpt');
      if (block) {
        rEx.innerHTML = excerptFor(block.x, terms);
      } else {
        rEx.textContent = page.blocks.length ? page.blocks[0].x.slice(0, 150) : '';
      }
      a.appendChild(rTitle);
      a.appendChild(rCrumb);
      a.appendChild(rEx);
      body.appendChild(a);
    }
    res.appendChild(body);
    window.scrollTo(0, 0);
  }

  var searchTimer = null;
  $('search-input').addEventListener('input', function () {
    var v = this.value.trim();
    clearTimeout(searchTimer);
    if (!v) {
      if (location.hash && location.hash !== '#/') route();
      return;
    }
    searchTimer = setTimeout(function () { runSearch(v); }, 220);
  });

  $('search-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = $('search-input').value.trim();
    if (!v) return;
    clearTimeout(searchTimer);
    runSearch(v);
    var first = $('results').querySelector('a.result');
    if (first) first.click();
  });

  // ------------------------------------------------ router
  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    if (!hash) {
      renderHome();
      return;
    }
    var parts = hash.split('/');
    var id = parts[0], block = parts[1] != null ? parseInt(parts[1], 10) : null;
    var page = pageById[id];
    if (!page) {
      renderHome();
      return;
    }
    var input = $('search-input');
    if (document.activeElement !== input) input.value = '';
    renderPage(page, isNaN(block) ? null : block);
  }

  window.addEventListener('hashchange', route);

  // ------------------------------------------------ drawer
  var sidebar = $('sidebar');
  var overlay = $('overlay');
  var menuBtn = $('menu-btn');

  function openDrawer() {
    sidebar.classList.add('open');
    overlay.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var first = sidebar.querySelector('a, button');
    if (first) first.focus();
  }

  function closeDrawer() {
    sidebar.classList.remove('open');
    overlay.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) closeDrawer();
    else openDrawer();
  });
  overlay.addEventListener('click', closeDrawer);

  sidebar.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) closeDrawer();
  });

  // ------------------------------------------------ keyboard
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      ev.preventDefault();
      $('search-input').focus();
      $('search-input').select();
    } else if (ev.key === 'Escape') {
      if (sidebar.classList.contains('open')) {
        closeDrawer();
        menuBtn.focus();
      } else if (document.activeElement === $('search-input') && $('search-input').value) {
        $('search-input').value = '';
        if (location.hash && location.hash !== '#/') route();
      }
    }
  });

  loadBook();
})();
