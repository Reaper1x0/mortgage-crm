export const languages = ["en"] as const;

export type Language = (typeof languages)[number];
