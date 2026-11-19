import { FiMoon, FiSun } from "react-icons/fi";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../utils/cn";
import type { Theme } from "../../constants/theme.constants";

const APPEARANCE_OPTIONS: {
  id: Theme;
  label: string;
  description: string;
  icon: typeof FiSun;
}[] = [
  {
    id: "light",
    label: "Light",
    description: "Bright interface for daytime use",
    icon: FiSun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Lower glare for low-light environments",
    icon: FiMoon,
  },
];

export default function PreferencesSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Preferences"
        description="Personalize how the app looks and feels on this device"
      />

      <Surface variant="card" className="p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-text">Appearance</h2>
          <p className="mt-0.5 text-sm text-card-text">
            Theme is saved on this browser and applies across the app.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {APPEARANCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-card-border bg-background hover:bg-card-hover",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    selected ? "bg-primary text-primary-text" : "bg-muted text-card-text",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text">{option.label}</div>
                  <div className="mt-0.5 text-xs text-card-text">{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
