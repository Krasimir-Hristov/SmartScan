/**
 * Printable plaque name constraints.
 *
 * The space name is printed on the plaque in Roboto Bold, uppercased, using the
 * title metrics of the strictest supported format (A6). The limit below is
 * derived from those exact metrics, so a validated name always stays on a
 * single title line — no truncation, no wrapping and therefore no extra page:
 *
 *   content width = 297.64 pt (A6 width) - 2 x 20 pt padding = 257.64 pt
 *   title width   = 257.64 pt x 90 % (`maxWidth` in `plaquePdfStyles`)
 *                 = 231.88 pt
 *   per character = 16 pt x 0.6246 em (mean advance width of Roboto Bold
 *                   uppercase Latin + Cyrillic + Greek glyphs) + 0.5 pt tracking
 *                 = 10.49 pt
 *   limit         = floor(231.88 / 10.49) = 22 characters
 */

/** Roboto Bold title size for the strictest supported format (A6), in points. */
export const PLAQUE_TITLE_SIZE_PT = 16;

/** A6 page width in points (105 x 148 mm). */
export const PLAQUE_A6_PAGE_WIDTH_PT = 297.64;

/** A6 inner padding in points. */
export const PLAQUE_A6_PAGE_PADDING_PT = 20;

/** Letter spacing applied to the printed title, in points. */
export const PLAQUE_TITLE_LETTER_SPACING_PT = 0.5;

/** Share of the content width the title may occupy (`maxWidth: '90%'`). */
export const PLAQUE_TITLE_MAX_WIDTH_RATIO = 0.9;

/** Mean advance width (in em) of Roboto Bold uppercase glyphs. */
const ROBOTO_BOLD_UPPERCASE_MEAN_ADVANCE_EM = 0.6246;

const PLAQUE_TITLE_AVAILABLE_WIDTH_PT =
  (PLAQUE_A6_PAGE_WIDTH_PT - 2 * PLAQUE_A6_PAGE_PADDING_PT) *
  PLAQUE_TITLE_MAX_WIDTH_RATIO;

const PLAQUE_TITLE_CHARACTER_WIDTH_PT =
  PLAQUE_TITLE_SIZE_PT * ROBOTO_BOLD_UPPERCASE_MEAN_ADVANCE_EM +
  PLAQUE_TITLE_LETTER_SPACING_PT;

/** Maximum number of characters that fits on one A6 title line. */
export const PLAQUE_NAME_MAX_LENGTH = Math.floor(
  PLAQUE_TITLE_AVAILABLE_WIDTH_PT / PLAQUE_TITLE_CHARACTER_WIDTH_PT,
);

/** True when the name fits the printed plaque without truncation. */
export const isPlaqueNameWithinLimit = (name: string): boolean =>
  name.trim().length <= PLAQUE_NAME_MAX_LENGTH;
