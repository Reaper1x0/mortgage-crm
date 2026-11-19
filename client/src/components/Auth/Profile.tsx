import { useState, useRef, useEffect, FormEvent } from "react";
import { AuthService } from "../../service/authService";
import Input from "../Reusable/Inputs/Input";
import { UserService } from "../../service/userService";
import Button from "../Reusable/Button";
import Surface from "../Reusable/Surface";
import PageHeader from "../Reusable/PageHeader";
import { FiCamera, FiUser, FiMail } from "react-icons/fi";
import { getUserDisplayName, normalizeUserForAvatar, getAvatarSource } from "../../utils/userUtils";
import { useAuth } from "../../context/AuthContext";
import StatusBadge from "../Reusable/StatusBadge";
import FileUploadZone, { type FileUploadZoneHandle } from "../Reusable/Inputs/FileUploadZone";

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const [usernameError, setUserNameError] = useState<string | undefined>(undefined);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileUploadRef = useRef<FileUploadZoneHandle>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameHint, setUsernameHint] = useState<string | undefined>(undefined);
  const [usernameHintTone, setUsernameHintTone] = useState<"success" | "muted">("muted");
  const [usernameChecking, setUsernameChecking] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || "");
    setUsername(user.username || "");
    setUserNameError(undefined);
    setUsernameHint(undefined);
  }, [user]);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);

    const trimmed = value.trim();
    if (!trimmed || trimmed === user?.username) {
      setUserNameError(undefined);
      setUsernameHint(undefined);
      setUsernameChecking(false);
      return;
    }

    setUsernameChecking(true);
    setUsernameHint("Checking availability...");
    setUsernameHintTone("muted");
    setUserNameError(undefined);

    usernameCheckTimer.current = setTimeout(async () => {
      try {
        await AuthService.getUsernameAvailibility(trimmed);
        setUserNameError(undefined);
        setUsernameHint("Username is available");
        setUsernameHintTone("success");
      } catch {
        setUsernameHint(undefined);
        setUserNameError("Username not available");
      } finally {
        setUsernameChecking(false);
      }
    }, 400);
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append("profilePicture", file);
      formData.append("fullName", user?.fullName || "");
      formData.append("username", user?.username || "");

      await UserService.updateProfile(formData);
      // Refresh from API to get latest data (this will update all components via context)
      await refreshProfile();
      fileUploadRef.current?.clear();
    } catch (error: any) {
      alert(error?.message || "Failed to upload profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  const userInfo = normalizeUserForAvatar(user);
  const avatarSource = getAvatarSource(userInfo);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [avatarSource.type, avatarSource.value]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (usernameChecking || usernameError) return;

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName || "");
      formData.append("username", username || "");

      await UserService.updateProfile(formData);
      await refreshProfile();
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal details and profile picture"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <Surface variant="card" className="p-6">
            <div className="flex flex-col items-center gap-6">
              {/* Profile Picture Section */}
              <div className="relative group">
                <div 
                  className="relative cursor-pointer"
                  onClick={() => !uploadingPicture && fileUploadRef.current?.open()}
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-background shadow-lg">
                    {userInfo && (() => {
                      const displayName = getUserDisplayName(userInfo);

                      return avatarSource.type === "url" && !profileImageFailed ? (
                        <img
                          src={avatarSource.value}
                          alt={displayName}
                          className="h-full w-full rounded-full object-cover"
                          onError={() => setProfileImageFailed(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-text">
                          <span className="select-none">{avatarSource.value}</span>
                        </div>
                      );
                    })()}
                    {uploadingPicture && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full z-10">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>
                  {/* Camera Icon Overlay on Hover */}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none z-20">
                    <FiCamera className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="text-center w-full space-y-3">
                <div>
                  <div className="text-2xl font-bold text-text">{getUserDisplayName(userInfo)}</div>
                  <div className="flex items-center justify-center gap-2 mt-2 text-sm text-card-text">
                    <FiMail className="h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>
                </div>
                <StatusBadge tone="neutral" className="inline-flex items-center gap-1.5">
                  <FiUser className="h-3 w-3" />
                  {user?.role}
                </StatusBadge>
              </div>

              {/* Upload Picture Button */}
              <Button
                variant="secondary"
                onClick={() => fileUploadRef.current?.open()}
                disabled={uploadingPicture}
                isLoading={uploadingPicture}
                className="w-full"
              >
                <span className="flex items-center gap-2">
                  <FiCamera />
                  {uploadingPicture ? "Uploading..." : "Change Profile Picture"}
                </span>
              </Button>
              <FileUploadZone
                ref={fileUploadRef}
                name="profilePicture"
                accept="image/*"
                hideDefaultZone
                onChange={handleProfilePictureChange}
              />
            </div>
          </Surface>
        </div>

        <div>
          <Surface variant="card" className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text">Personal information</h2>
              <p className="mt-1 text-sm text-card-text">Update your name and username</p>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  name="fullName"
                  label="Full name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  name="username"
                  label="Username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  error={usernameError}
                  hint={usernameHint}
                  hintTone={usernameHintTone}
                />
                <Input
                  name="email"
                  label="Email"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  hint="Read only"
                />
                <Input
                  name="role"
                  label="Role"
                  type="text"
                  value={user?.role || ""}
                  readOnly
                  hint="Read only"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                isLoading={savingProfile}
                disabled={savingProfile || usernameChecking || Boolean(usernameError)}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Surface>
        </div>
      </div>
    </div>
  );
};

export default Profile;
