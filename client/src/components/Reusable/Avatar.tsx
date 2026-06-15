import { getUserDisplayName, getAvatarSource, getUserInitials, UserInfo } from "../../utils/userUtils";
import { cn } from "../../utils/cn";
import { useEffect, useState } from "react";

export interface AvatarProps {
  user: UserInfo | null | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg",
};

/** Profile circle (image or initials). For action tooltips use `UserActionAvatar`. */
export default function Avatar({ user, size = "md", className }: AvatarProps) {
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

  return (
    <div className={baseClasses}>
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
    </div>
  );
}
