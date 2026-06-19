export type SemanticTone =
  | "neutral"
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

/** Shared class maps for muted (pill/soft) and solid (button) surfaces per category. */
export const semanticMutedClasses: Record<SemanticTone, string> = {
  neutral: "bg-card-muted text-card-text border-card-border",
  primary: "bg-primary-muted text-primary border-primary-border",
  secondary: "bg-secondary-muted text-secondary border-secondary-border",
  accent: "bg-accent-muted text-accent border-accent-border",
  success: "bg-success-muted text-success border-success-border",
  warning: "bg-warning-muted text-warning border-warning-border",
  danger: "bg-danger-muted text-danger border-danger-border",
  info: "bg-info-muted text-info border-info-border",
};

export const semanticMutedHoverClasses: Record<SemanticTone, string> = {
  neutral: "hover:bg-card-muted-hover",
  primary: "hover:bg-primary-muted-hover",
  secondary: "hover:bg-secondary-muted-hover",
  accent: "hover:bg-accent-muted-hover",
  success: "hover:bg-success-muted-hover",
  warning: "hover:bg-warning-muted-hover",
  danger: "hover:bg-danger-muted-hover",
  info: "hover:bg-info-muted-hover",
};

export const semanticSolidClasses: Record<SemanticTone, string> = {
  neutral: "bg-secondary text-secondary-text border-secondary-border hover:bg-secondary-hover",
  primary: "bg-primary text-primary-text border-primary-border hover:bg-primary-hover",
  secondary: "bg-secondary text-secondary-text border-secondary-border hover:bg-secondary-hover",
  accent: "bg-accent text-accent-text border-accent-border hover:bg-accent-hover",
  success: "bg-success text-success-text border-success-border hover:bg-success-hover",
  warning: "bg-warning text-warning-text border-warning-border hover:bg-warning-hover",
  danger: "bg-danger text-danger-text border-danger-border hover:bg-danger-hover",
  info: "bg-info text-info-text border-info-border hover:bg-info-hover",
};

/** Static pill badge surface (StatusBadge, read-only labels). */
export const semanticBadgeClasses: Record<SemanticTone, string> = semanticMutedClasses;

/** Interactive pill badge surface (Button, IconButton). */
export const semanticBadgeInteractiveClasses: Record<SemanticTone, string> = {
  neutral: `${semanticMutedClasses.neutral} ${semanticMutedHoverClasses.neutral}`,
  primary: `${semanticMutedClasses.primary} ${semanticMutedHoverClasses.primary}`,
  secondary: `${semanticMutedClasses.secondary} ${semanticMutedHoverClasses.secondary}`,
  accent: `${semanticMutedClasses.accent} ${semanticMutedHoverClasses.accent}`,
  success: `${semanticMutedClasses.success} ${semanticMutedHoverClasses.success}`,
  warning: `${semanticMutedClasses.warning} ${semanticMutedHoverClasses.warning}`,
  danger: `${semanticMutedClasses.danger} ${semanticMutedHoverClasses.danger}`,
  info: `${semanticMutedClasses.info} ${semanticMutedHoverClasses.info}`,
};
