/**
 * User utility functions for profile pictures and initials
 */

export interface FileRef {
  _id?: string;
  display_name?: string;
  original_name?: string;
  storage_path?: string;
  url?: string;
  type?: string;
  content_type?: string;
  extension?: string;
  size_in_bytes?: number;
}

export interface UserInfo {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  username?: string;
  profilePicture?: string;
  avatar?: string;
  profile_picture?: FileRef | string | null; // Support both FileRef object and string URL
}

/**
 * Get user's display name (fullName, name, username, or email)
 */
export function getUserDisplayName(user: UserInfo | null | undefined): string {
  if (!user) return "Unknown";
  return user.fullName || user.name || user.username || user.email || "Unknown";
}

/**
 * Get user's initials from name
 */
export function getUserInitials(user: UserInfo | null | undefined): string {
  if (!user) return "?";
  
  const name = user.fullName || user.name || user.username || user.email || "";
  
  if (!name) return "?";
  
  // Split by space and get first letter of each word
  const parts = name.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    // First letter of first name + first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  // Single word - take first 2 letters
  return name.substring(0, 2).toUpperCase();
}

/**
 * Get profile picture URL from user object
 * Handles both FileRef objects and string URLs
 */
export function getProfilePictureUrl(user: UserInfo | null | undefined, baseUrl?: string): string | null {
  if (!user) return null;

  // Check if profile_picture is a FileRef object
  if (user.profile_picture) {
    // If profile_picture is an object (FileRef)
    if (typeof user.profile_picture === "object" && user.profile_picture !== null) {
      // Handle FileRef object - check for url property
      const fileRef = user.profile_picture as FileRef;
      const url = fileRef.url;
      
      if (url) {
        // If it's already a full URL, return it
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return url;
        }
        // Otherwise, construct full URL if baseUrl is provided
        if (baseUrl) {
          // Remove trailing slash from baseUrl if present
          const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
          // Ensure url starts with /
          const cleanUrl = url.startsWith("/") ? url : `/${url}`;
          return `${cleanBaseUrl}${cleanUrl}`;
        }
        // Return relative URL if no baseUrl
        return url.startsWith("/") ? url : `/${url}`;
      }
      
      // If FileRef exists but no url, try to construct from storage_path
      if (fileRef.storage_path && baseUrl) {
        const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = fileRef.storage_path.startsWith("/") ? fileRef.storage_path : `/${fileRef.storage_path}`;
        return `${cleanBaseUrl}${cleanPath}`;
      }
    }
    // If profile_picture is a string (URL or ObjectId), handle it
    if (typeof user.profile_picture === "string") {
      // If it looks like a URL, return it
      if (user.profile_picture.startsWith("http://") || user.profile_picture.startsWith("https://") || user.profile_picture.startsWith("/")) {
        if (baseUrl && user.profile_picture.startsWith("/")) {
          const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
          return `${cleanBaseUrl}${user.profile_picture}`;
        }
        return user.profile_picture;
      }
      // If it's an ObjectId string, we can't use it directly - return null
      // (This means the profile_picture wasn't populated)
    }
  }

  // Fallback to profilePicture or avatar string properties
  return user.profilePicture || user.avatar || null;
}

/**
 * Generate avatar URL from name/email (using a service like UI Avatars or Gravatar)
 * For now, returns null - can be extended to use external services
 */
export function generateAvatarUrl(user: UserInfo | null | undefined): string | null {
  if (!user) return null;
  
  const name = getUserDisplayName(user);
  const initials = getUserInitials(user);
  
  // Option 1: UI Avatars (free service)
  // return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
  
  // Option 2: Gravatar (requires email)
  // if (user.email) {
  //   const hash = md5(user.email.toLowerCase());
  //   return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=128`;
  // }
  
  // For now, return null and use initials fallback
  return null;
}

/**
 * Get the best available avatar source
 * Priority: profilePicture > generatedAvatar > null (use initials)
 */
export function getAvatarSource(user: UserInfo | null | undefined, baseUrl?: string): {
  type: "url" | "initials";
  value: string;
} {
  const profilePic = getProfilePictureUrl(user, baseUrl);
  if (profilePic) {
    return { type: "url", value: profilePic };
  }
  
  const generated = generateAvatarUrl(user);
  if (generated) {
    return { type: "url", value: generated };
  }
  
  return { type: "initials", value: getUserInitials(user) };
}

/**
 * Convert user object to UserInfo format for Avatar components
 * Handles profile_picture FileRef objects and constructs proper URLs
 */
export function normalizeUserForAvatar(user: any, baseUrl?: string): UserInfo | null {
  if (!user) return null;

  return {
    _id: user._id || user.id,
    fullName: user.fullName || user.name,
    email: user.email,
    username: user.username,
    profile_picture: user.profile_picture, // Pass the FileRef object directly - Avatar will handle URL construction
  };
}

