import Avatar from "./Avatar";
import { UserInfo, normalizeUserForAvatar } from "../../utils/userUtils";
import { cn } from "../../utils/cn";
import { timeAgo } from "../../utils/date";
import { BACKEND_URL } from "../../constants/env.constants";

export interface AvatarAction {
  user: UserInfo | null | undefined;
  action: string; // e.g., "uploaded by", "extracted by", "edited by"
  timestamp?: string | Date;
}

export interface AvatarGroupProps {
  actions: AvatarAction[];
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

  const formatTooltip = (action: AvatarAction): string => {
    const userName = action.user?.fullName || action.user?.name || action.user?.username || action.user?.email || "Unknown";
    let tooltip = `${action.action} ${userName}`;
    if (action.timestamp) {
      const timeAgoStr = timeAgo(action.timestamp);
      tooltip += ` ${timeAgoStr}`;
    }
    return tooltip;
  };

  return (
    <div className={cn("inline-flex items-center", overlap && "-space-x-1", className)}>
      {visibleActions.map((action, index) => (
        <div
          key={index}
          className={cn(
            "relative z-10",
            overlap && index > 0 && "rounded-full",
            !overlap && index > 0 && "ml-1"
          )}
        >
          <Avatar
            user={normalizeUserForAvatar(action.user, BACKEND_URL)}
            size={size}
            showTooltip={true}
            tooltipText={formatTooltip(action)}
          />
        </div>
      ))}
      {remainingCount > 0 && (
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
      )}
    </div>
  );
}

