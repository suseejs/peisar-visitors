import type { Visitor } from "peisar";

/**
 * Highlighter callback shape: raw code in, highlighted HTML out.
 *
 * `lang` is typed `any` on purpose so the visitor stays decoupled from
 * Shiki's own type definitions.
 */
export type HighlighterFunction = (code: string, lang: any) => string;

/**
 * Code Block Wrapper
 *
 * @param html
 * @param lang
 * @param preClass
 * @returns
 */
function codeBlockWrapper(html: string, lang: any, preClass?: string): string {
  const classNames = preClass
    ? `language-${lang} ${preClass}`
    : `language-${lang}`;
  return `<pre class="${classNames}"><code>${html}</code></pre>`;
}
/**
 * Syntax highlighting for Peisar via shiki,highlight.js or prismjs.
 *
 * For each `CodeBlock`, calls `fn(block.code, block.lang)` — defaulting the
 * language to `"text"` for fences without a language tag — and replaces the
 * block with an `HtmlBlock` holding the returned HTML. The block's source
 * span is preserved so the AST still maps back to the original text.
 *
 * Maintainer notes:
 *
 * - `visitBlock` is invoked with a **one-item tuple** (`[block]`) per
 *   visited block, so the `for...of` below runs at most once per call.
 * - `replaceWith` is returned without `recurse`; code blocks have no child
 *   blocks to visit.
 *
 * @param fn highlighter function
 * @param shiki use shiki or not(for pre,code wrapper)[optional] default - false
 * @param preClass if shiki is false custom class for `<pre>` element, [optional] default - undefined
 * @returns
 */
export function highlightVisitor(
  fn: HighlighterFunction,
  shiki = false,
  preClass?: string,
): Visitor {
  const visitor: Visitor = {
    visitBlock(blocks) {
      // `blocks` is a one-item tuple: `[block]` (see the JSDoc above).
      for (const block of blocks) {
        if (block.type === "CodeBlock") {
          // Fences with no language tag highlight as plain text.
          const lang = block.lang ?? "text";
          const highlighted = fn(block.code, lang);
          const htmlString = shiki
            ? highlighted
            : codeBlockWrapper(highlighted, lang, preClass);
          // Replace the code block with the highlighted HTML fragment,
          // keeping the original source span.
          return {
            replaceWith: [
              {
                type: "HtmlBlock",
                html: htmlString,
                pos: block.pos,
              },
            ],
          };
        }
      }
      return { recurse: true };
    },
  };
  return visitor;
}
