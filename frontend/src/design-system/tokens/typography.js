/**
 * Design System — Typography Tokens
 * Font family: Inter
 * Scale designed for medical UI readability
 */

export const typography = {
  fontFamily: {
    sans:  ["Inter", "system-ui", "sans-serif"],
    mono:  ["JetBrains Mono", "Fira Code", "monospace"],
  },

  fontSizes: {
    xs:    "0.75rem",    // 12px — captions, hints
    sm:    "0.875rem",   // 14px — secondary text, labels
    base:  "1rem",       // 16px — body text
    lg:    "1.125rem",   // 18px — section headings
    xl:    "1.25rem",    // 20px — card titles
    "2xl": "1.5rem",     // 24px — page headings
    "3xl": "1.875rem",   // 30px — dashboard titles
    vital: "2rem",       // 32px — vital sign values (HR, BP, etc.)
    "4xl": "2.25rem",    // 36px — large numbers
  },

  fontWeights: {
    light:    300,
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold: 800,
  },

  lineHeights: {
    tight:   1.2,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
    loose:   2,
  },

  letterSpacings: {
    tight:  "-0.025em",
    normal: "0em",
    wide:   "0.025em",
    wider:  "0.05em",
    widest: "0.1em",
  },
};

/** Named text styles for semantic usage */
export const textStyles = {
  /** Page title (h1 equivalent) */
  pageTitle: {
    fontSize:   typography.fontSizes["2xl"],
    fontWeight: typography.fontWeights.bold,
    lineHeight: typography.lineHeights.tight,
    color:      "#111827",
  },

  /** Section heading (h2 equivalent) */
  sectionTitle: {
    fontSize:   typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    lineHeight: typography.lineHeights.snug,
    color:      "#1F2937",
  },

  /** Card title (h3 equivalent) */
  cardTitle: {
    fontSize:   typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    lineHeight: typography.lineHeights.snug,
    color:      "#1F2937",
  },

  /** Body text */
  body: {
    fontSize:   typography.fontSizes.base,
    fontWeight: typography.fontWeights.regular,
    lineHeight: typography.lineHeights.normal,
    color:      "#374151",
  },

  /** Secondary / muted text */
  muted: {
    fontSize:   typography.fontSizes.sm,
    fontWeight: typography.fontWeights.regular,
    lineHeight: typography.lineHeights.normal,
    color:      "#6B7280",
  },

  /** Labels (form fields, table headers) */
  label: {
    fontSize:   typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    lineHeight: typography.lineHeights.snug,
    color:      "#374151",
  },

  /** Vital sign values */
  vital: {
    fontSize:   typography.fontSizes.vital,
    fontWeight: typography.fontWeights.bold,
    lineHeight: typography.lineHeights.tight,
  },

  /** Small captions */
  caption: {
    fontSize:   typography.fontSizes.xs,
    fontWeight: typography.fontWeights.regular,
    lineHeight: typography.lineHeights.normal,
    color:      "#9CA3AF",
  },
};

export default typography;
