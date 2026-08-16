import { initialWindowMetrics } from 'react-native-safe-area-context';

// How much the system keeps for itself at the bottom of the screen — the
// gesture pill or the three-button navigation bar.
//
// Bottom sheets across the app anchor with `justifyContent: 'flex-end'`, and the
// window runs behind that strip, so their action button ended up sitting under
// the phone's own back/home buttons with nothing in between. Padding the sheet
// by this much lifts it clear.
//
// Read once at startup rather than through the hook: these are plain StyleSheet
// entries, not components, and the app is portrait-locked so the value does not
// change under us.
export const BOTTOM_INSET = initialWindowMetrics?.insets?.bottom ?? 0;

/** Padding for the inside bottom edge of a bottom sheet. */
export const SHEET_PAD = 20 + BOTTOM_INSET;

/** Room a scroll inside the tab navigator must leave so its last card clears the tab bar. */
export const TAB_BAR_SPACE = 70 + BOTTOM_INSET + 16;
