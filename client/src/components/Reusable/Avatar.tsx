import { getUserDisplayName, getAvatarSource, getUserInitials, UserInfo } from "../../utils/userUtils";
import { cn } from "../../utils/cn";
import { useEffect, useState } from "react";

export interface AvatarProps {
  user: UserInfo | null | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
}

const sizeClasses = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg",
};

export default function Avatar({ user, size = "md", className, showTooltip = false, tooltipText }: AvatarProps) {
  const displayName = getUserDisplayName(user);
  const avatarSource = getAvatarSource(user);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [avatarSource.type, avatarSource.value]);

  const baseClasses = cn(
    "inline-flex items-center justify-center rounded-full font-semibold text-background bg-text border border-background",
    sizeClasses[size],
    className
  );

  const avatarContent = (
    <>
      {avatarSource.type === "url" && !imageLoadFailed ? (
        <img
          src={avatarSource.value}
          alt={displayName}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImageLoadFailed(true)}
        />
      ) : (
        <span className="select-none">{getUserInitials(user)}</span>
      )}
    </>
  );

  if (showTooltip && tooltipText) {
    return (
      <div className="group relative inline-block">
        <div className={baseClasses}>{avatarContent}</div>
        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-text bg-card border border-card-border rounded-md shadow-lg whitespace-nowrap z-50">
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-card-border"></div>
        </div>
      </div>
    );
  }

  return <div className={baseClasses}>{avatarContent}</div>;
}

