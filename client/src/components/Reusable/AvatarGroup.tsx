import UserActionAvatar, { type UserAction } from "./UserActionAvatar";
import { cn } from "../../utils/cn";

export type { UserAction };
export type AvatarAction = UserAction;

export interface AvatarGroupProps {
  actions: UserAction[];
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  maxVisible?: number;
  className?: string;
  overlap?: boolean;
}

export default function AvatarGroup({
  actions,
  size = "md",
  maxVisible = 3,
  className,
  overlap = true,
}: AvatarGroupProps) {
  if (!actions || actions.length === 0) return null;

  const visibleActions = actions.slice(0, maxVisible);
  const remainingCount = Math.max(0, actions.length - maxVisible);

  return (
    <div className={cn("inline-flex items-center", overlap && "-space-x-1", className)}>
      {visibleActions.map((action, index) => (
        <div
          key={`${index}-${action.action}`}
          className={cn(
            "relative z-10",
            overlap && index > 0 && "rounded-full",
            !overlap && index > 0 && "ml-1"
          )}
        >
          <UserActionAvatar
            user={action.user}
            action={action.action}
            timestamp={action.timestamp}
            size={size}
          />
        </div>
      ))}
      {remainingCount > 0 ? (
        <div
          className={cn(
            "relative z-10 inline-flex items-center justify-center rounded-full font-semibold text-text border border-card-border bg-card-hover",
            overlap && "ring-2 ring-background",
            size === "xs" && "h-5 w-5 text-[10px]",
            size === "sm" && "h-6 w-6 text-xs",
            size === "md" && "h-8 w-8 text-sm",
            size === "lg" && "h-10 w-10 text-base",
            size === "xl" && "h-12 w-12 text-lg"
          )}
          title={`+${remainingCount} more`}
        >
          +{remainingCount}
        </div>
      ) : null}
    </div>
  );
}
