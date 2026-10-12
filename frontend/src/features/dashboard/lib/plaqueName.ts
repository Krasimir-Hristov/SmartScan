/**
 * Printable plaque name constraints.
 *
 * The space name is printed on the plaque in Roboto Bold, uppercased, using the
 * title metrics of the strictest supported format (A5). The limit below is
 * derived from those exact metrics, so a validated name always stays on a
 * single title line — no truncation, no wrapping and therefore no extra page:
 *
 *   content width = 419.53 pt (A5 width) - 2 x 28 pt padding = 363.53 pt
 *   title width   = 363.53 pt x 90 % (`maxWidth` in `plaquePdfStyles`)
 *                 = 327.18 pt
 *   per character = 21 pt x 0.892 em (worst-case Roboto Bold uppercase) + 0.5 pt tracking
 *                 = 19.23 pt
 *   limit         = floor(327.18 / 19.23) = 17 characters
 */

/** Roboto Bold title size for the strictest supported format (A5), in points. */
export const PLAQUE_TITLE_SIZE_PT = 21;

/** A5 page width in points (148 x 210 mm). */
export const PLAQUE_A5_PAGE_WIDTH_PT = 419.53;

/** A5 inner padding in points. */
export const PLAQUE_A5_PAGE_PADDING_PT = 28;

/** Letter spacing applied to the printed title, in points. */
export const PLAQUE_TITLE_LETTER_SPACING_PT = 0.5;

/** Share of the content width the title may occupy (`maxWidth: '90%'`). */
export const PLAQUE_TITLE_MAX_WIDTH_RATIO = 0.9;

/** Worst-case advance width (in em) of Roboto Bold uppercase glyphs (e.g. 'W', 'Щ'). */
const ROBOTO_BOLD_UPPERCASE_WORST_ADVANCE_EM = 0.892;

const PLAQUE_TITLE_AVAILABLE_WIDTH_PT =
  (PLAQUE_A5_PAGE_WIDTH_PT - 2 * PLAQUE_A5_PAGE_PADDING_PT) *
  PLAQUE_TITLE_MAX_WIDTH_RATIO;

const PLAQUE_TITLE_CHARACTER_WIDTH_PT =
  PLAQUE_TITLE_SIZE_PT * ROBOTO_BOLD_UPPERCASE_WORST_ADVANCE_EM +
  PLAQUE_TITLE_LETTER_SPACING_PT;

/** Maximum number of characters that fits on one A5 title line. */
export const PLAQUE_NAME_MAX_LENGTH = Math.floor(
  PLAQUE_TITLE_AVAILABLE_WIDTH_PT / PLAQUE_TITLE_CHARACTER_WIDTH_PT,
);

/** True when the name fits the printed plaque without truncation. */
export const isPlaqueNameWithinLimit = (name: string): boolean =>
  name.trim().length <= PLAQUE_NAME_MAX_LENGTH;
