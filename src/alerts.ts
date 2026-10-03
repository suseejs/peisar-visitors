/**
 * GitHub-style alerts for Peisar.
 *
 * Transforms GitHub-flavored Markdown "alerts" — a block quote whose first
 * line is a bare marker such as `[!NOTE]` — into a rendered badge: the
 * marker line becomes a small colored label ("NOTE", "TIP", ...), while the
 * rest of the quote keeps its content and position.
 *
 * ```markdown
 * > [!WARNING]
 * > This action cannot be undone.
 * ```
 *
 * Register the visitor through `Peisar#useVisitor`:
 *
 * ```ts
 * import { alertsVisitor } from "@peisar/peisar-visitors";
 *
 * const peisar = new Peisar(markdown);
 * peisar.useVisitor(alertsVisitor());
 * console.log(peisar.html);
 * ```
 */
import type { Visitor, Block, Span } from "peisar";

/**
 * The alert markers recognized by {@link alertsVisitor}.
 *
 * A marker only matches when it is the *entire* first text node of the
 * quote's first paragraph — lowercase `[!note]`, trailing punctuation, or
 * extra text in the same node (e.g. `[!NOTE] Read this`) do **not** match.
 *
 * The `as const` is what turns this array into the literal union type
 * `Markers` below.
 */
const markers = [
  "[!NOTE]",
  "[!TIP]",
  "[!IMPORTANT]",
  "[!WARNING]",
  "[!CAUTION]",
] as const;

/** Union of the recognized marker strings, e.g. `"[!NOTE]"`. */
type Markers = (typeof markers)[number];

/**
 * Extracts the bare label from a marker: `"[!NOTE]"` → `"NOTE"`.
 *
 * The `as string` cast on the return is safe: callers have already validated
 * the marker against `markers`, so the regex always captures one of the five
 * labels.
 *
 * @remarks The regex's trailing `s*` matches literal `s` characters, not
 * whitespace (`\s*`) — likely a typo, but harmless because every entry in
 * `markers` ends right after the closing `]`. Check before "fixing" this.
 *
 * @param mkr - A validated alert marker.
 * @returns The label without the `[!...]` wrapper, e.g. `"IMPORTANT"`.
 */
function getLabel(mkr: Markers) {
  const re = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]s*$/;
  const m = mkr.match(re);
  return m?.[1] as string;
}

/**
 * Badge background color for a marker, following GitHub's alert palette:
 * NOTE → blue, TIP → green, IMPORTANT → purple, CAUTION → red.
 *
 * @remarks WARNING currently falls back to IMPORTANT's purple (`#8250df`)
 * instead of GitHub's yellow (`#9a6700`) — the last fallback in the chain
 * is where to change that.
 *
 * @param mkr - A validated alert marker.
 * @returns Hex color string for the badge background.
 */
function getColor(mkr: Markers) {
  return mkr === "[!CAUTION]"
    ? "#cf222e"
    : mkr === "[!IMPORTANT]"
      ? "#8250df"
      : mkr === "[!NOTE]"
        ? "#0969da"
        : mkr === "[!TIP]"
          ? "#1a7f37"
          : "#8250df";
}

/**
 * Builds the badge paragraph that replaces a marker line.
 *
 * The result is a `Paragraph` block whose only styling is an inline
 * `style` attribute (marker-colored background, white bold text, rounded
 * corners, capped width) and whose single child is a `Text` node carrying
 * the bare label, e.g. `"NOTE"`. Inside the surrounding block quote it
 * renders as a small colored badge.
 *
 * @param mkr - The alert marker being rendered, e.g. `"[!NOTE]"`.
 * @param pos - Source span to attach to the badge paragraph.
 * @param textPos - Source span to attach to the label text node.
 * @returns A `Paragraph` block that renders as a colored badge.
 */
function badgeBlock(mkr: Markers, pos: Span, textPos: Span): Block {
  const label = getLabel(mkr);
  const color = getColor(mkr);

  // Inline styles keep the badge self-contained — no external CSS needed.
  // The embedded newlines/spaces are harmless inside a style attribute.
  return {
    type: "Paragraph",
    attrs: {
      attributes: [
        [
          "style",
          `font-family: Arial, Helvetica, sans-serif;
        background-color: ${color};
        color: white;
        padding: 4px;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        max-width: 100px;
        border-radius: 5px;`,
        ],
      ],
    },
    children: [{ type: "Text", value: label, pos: textPos }],
    pos,
  };
}

/**
 * Creates the visitor that turns GitHub-style alerts into badges.
 *
 * A `BlockQuote` is an alert when its first child is a `Paragraph` whose
 * first inline node is a `Text` exactly equal to one of `markers`. On a
 * match the quote is rebuilt as `[badge, ...rest]`:
 *
 * - the marker paragraph is replaced by {@link badgeBlock};
 * - every other child of the quote (the alert body) is kept verbatim;
 * - Kramdown attributes on the quote (`.attrs`, e.g. `{:.custom}`) are
 *   copied to the replacement.
 *
 * Maintainer notes:
 *
 * - `visitBlock` is invoked with a **one-item tuple** (`[block]`) per
 *   visited block, so the `for...of` below runs at most once per call —
 *   it is just the unpacking idiom shared by every visitor in this package.
 * - On a match we return `replaceWith` *without* `recurse`, so the rebuilt
 *   quote's children are not revisited: an alert nested inside another
 *   alert (`> > [!TIP]`) stays untouched. Add `recurse: true` next to
 *   `replaceWith` to transform nested alerts too.
 * - Non-alert blocks fall through to `{ recurse: true }`, keeping the tree
 *   walk alive so quotes elsewhere in the document still get visited.
 *
 * @returns A `Visitor` to pass to `Peisar#useVisitor`.
 */
export function alertsVisitor(): Visitor {
  const visitor: Visitor = {
    visitBlock(blocks) {
      // `blocks` is a one-item tuple: `[block]` (see the JSDoc above).
      for (const block of blocks) {
        if (block.type === "BlockQuote") {
          // First child = potential marker paragraph; the rest = the alert
          // body, which must survive the transformation untouched.
          const firstChild = block.children[0];
          const restChild = block.children.slice(1);
          if (firstChild && firstChild.type === "Paragraph") {
            // It's an alert only if the paragraph starts with a text node
            // that is *exactly* one of the markers.
            if (
              firstChild.children[0] &&
              firstChild.children[0].type === "Text" &&
              markers.includes(firstChild.children[0].value as any)
            ) {
              // The matched `[!NOTE]`-style text node.
              const marker = firstChild.children[0];
              const replaceBlock = badgeBlock(
                marker.value as Markers, // Safe: validated by includes() above.
                firstChild.pos,
                marker.pos,
              );
              // Rebuild the quote: badge in place of the marker paragraph,
              // alert body preserved after it.
              const replacement: Block = {
                type: "BlockQuote",
                pos: block.pos,
                children: [replaceBlock, ...restChild],
              };
              if (block.attrs) {
                // Keep Kramdown attributes ({:#id .class key="val"}) intact.
                replacement.attrs = block.attrs;
              }
              return {
                replaceWith: [replacement],
              };
            }
          }
        }
      }
      return { recurse: true };
    },
  };
  return visitor;
}
