/**
 * Design System — Color Tokens
 * Healthcare UI: Medical Blue + White palette
 * NO dark mode variants
 */

export const colors = {
  /** Primary Medical Blue */
  primary: {
    50:  "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  /** Medical Greens (mint/teal for healthy/normal status) */
  medical: {
    mint:  "#ECFDF5",
    teal:  "#0D9488",
    light: "#F0FDFA",
    bg:    "#F8FAFF",
  },

  /** Danger / Error (allergies, critical values, cancellations) */
  danger: {
    light: "#FEF2F2",
    main:  "#EF4444",
    dark:  "#DC2626",
  },

  /** Warning (borderline values, pending states) */
  warning: {
    light: "#FFFBEB",
    main:  "#F59E0B",
    dark:  "#D97706",
  },

  /** Success (completed, normal values) */
  success: {
    light: "#F0FDF4",
    main:  "#22C55E",
    dark:  "#16A34A",
  },

  /** Neutral grays for text, borders, backgrounds */
  neutral: {
    50:  "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  /** Pure whites */
  white: "#FFFFFF",
  black: "#000000",
};

/** Status color mapping for appointment/test statuses */
export const statusColors = {
  cho_kham:   { bg: "warning-light",  text: "warning-dark",  border: "warning-main" },
  dang_kham:  { bg: "primary-100",    text: "primary-700",   border: "primary-500" },
  hoan_thanh: { bg: "success-light",  text: "success-dark",  border: "success-main" },
  da_huy:     { bg: "danger-light",   text: "danger-dark",   border: "danger-main" },
  khan_cap:   { bg: "danger-main",    text: "white",         border: "danger-dark" },
  binh_thuong: { bg: "neutral-100",   text: "neutral-600",   border: "neutral-300" },
};

export default colors;
