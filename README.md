<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<div align="center">
<img src="https://pub-c9ba018358dd48a99b70013b65a25e5f.r2.dev/logo/peisar.webp" width="160" height="160" alt="peisar" />
  <h1>Peisar Visitors</h1>
  <p>AST visitor hooks for Peisar</p>
</div>

## Install

```sh
npm i @peisar/peisar-visitors
```

## Visitors

### 1. Syntax Highlighting

Syntax highlighting for Peisar via `shiki`,`highlight.js` or `prismjs`.

#### API

```ts
highlightVisitor(fn: HighlighterFunction, shiki?: boolean, preClass?: string): Visitor
```

- `fn` — highlighter callback `(code, lang) => html`.
- `shiki` — pass `true` when using shiki, since its output already includes the
  `<pre><code>` wrapper; other libraries get wrapped automatically.
  Default: `false`.
- `preClass` — extra class for the generated `<pre>` element (non-shiki only).

Every `CodeBlock` is replaced with the HTML returned by `fn`. Fences without a
language tag are highlighted as plain text.

#### Use example

##### With `shiki`

```sh
npm i shiki
```

```ts
import { createHighlighter } from "shiki";
import { Peisar } from "peisar";
import { highlightVisitor } from "@peisar/peisar-visitors";

const code = "const a = 1";

const highlighter = await createHighlighter({
  themes: ["slack-dark"],
  langs: ["js"],
});

function shiki_hl(code: string, lang: any) {
  return highlighter.codeToHtml(code, { lang: lang, theme: "slack-dark" });
}

const peisar = new Peisar(code);
peisar.useVisitor(highlightVisitor(shiki_hl, true));

const html = peisar.html;

console.log(html);
```

##### With `highlight.js`

```sh
npm i highlight.js
```

````ts
import hljs from "highlight.js";
import { Peisar } from "peisar";
import { highlightVisitor } from "@peisar/peisar-visitors";

const markdown = "```js\nconst a = 1\n```";

function hljs_hl(code: string, lang: any) {
  return hljs.highlight(code, { language: lang }).value;
}

const peisar = new Peisar(markdown);
peisar.useVisitor(highlightVisitor(hljs_hl));

console.log(peisar.html);
````

##### With `prismjs`

```sh
npm i prismjs
```

````ts
import Prism from "prismjs";
import { Peisar } from "peisar";
import { highlightVisitor } from "@peisar/peisar-visitors";

const markdown = "```js\nconst a = 1\n```";

function prism_hl(code: string, lang: any) {
  const grammar = Prism.languages[lang] ?? Prism.languages.javascript;
  return Prism.highlight(code, grammar, lang);
}

const peisar = new Peisar(markdown);
peisar.useVisitor(highlightVisitor(prism_hl));

console.log(peisar.html);
````

### 2. GitHub Alerts

GitHub-style alerts for Peisar — turns a block quote whose first line is a
marker like `[!NOTE]` into a colored badge, keeping the rest of the quote as
the alert body.

```markdown
> [!WARNING]
> This action cannot be undone.
```

Supported markers: `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and
`[!CAUTION]`. A marker only matches when it is the entire first text node of
the quote — `[!NOTE] Read this` renders as a normal block quote.

#### API

```ts
alertsVisitor(): Visitor
```

#### Use example

```ts
import { Peisar } from "peisar";
import { alertsVisitor } from "@peisar/peisar-visitors";

const markdown = "> [!NOTE]\n> Useful information.";

const peisar = new Peisar(markdown);
peisar.useVisitor(alertsVisitor());

console.log(peisar.html);
```
