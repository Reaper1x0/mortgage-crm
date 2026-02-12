import { useState, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { AuthService } from "../../service/authService";
import { ButtonProps } from "../Reusable/Button";
import Form, { FormSection } from "../Reusable/Inputs/Form";
import { UserService } from "../../service/userService";
import Button from "../Reusable/Button";
import Surface from "../Reusable/Surface";
import PageHeader from "../Reusable/PageHeader";
import { FiCamera, FiLock, FiUser, FiMail } from "react-icons/fi";
import Modal from "../Reusable/Modal";
import { getUserDisplayName, normalizeUserForAvatar, getAvatarSource, getUserInitials } from "../../utils/userUtils";
import { useAuth } from "../../context/AuthContext";
import { BACKEND_URL } from "../../constants/env.constants";
import StatusBadge from "../Reusable/StatusBadge";

const Profile = () => {
  const { t } = useLanguage();
  const { user, refreshProfile } = useAuth();
  const [usernameError, setUserNameError] = useState<string | undefined>(undefined);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (username: String) => {
    try {
      await AuthService.getUsernameAvailibility(username);
      setUserNameError(undefined);
    } catch {
      setUserNameError("Username not available");
    }
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      alert(error?.message || "Failed to upload profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handlePasswordChange = async (values: Record<string, any>) => {
    setPasswordError(undefined);
    setChangingPassword(true);
    try {
      await UserService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setPasswordModalOpen(false);
      alert("Password changed successfully");
    } catch (error: any) {
      setPasswordError(error?.response?.data?.message || error?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const userInfo = normalizeUserForAvatar(user, BACKEND_URL);

  const fields: FormSection["fields"] = [
    { fieldtype: "input", name: "fullName", label: t("full_name"), placeholder: t("full_name"), type: "text", required: true },
    { fieldtype: "input", name: "username", label: t("username"), placeholder: t("username"), type: "text", required: true, handlechange: handleChange },
    { fieldtype: "input", name: "email", label: t("email"), placeholder: t("email"), type: "email", required: true, disabled: true },
    { fieldtype: "input", name: "role", label: "Role", placeholder: "Role", type: "text", required: true, disabled: true },
  ];

  const buttons: ButtonProps[] = [
    { 
      type: "submit", 
      children: savingProfile ? "Saving..." : "Save Changes", 
      variant: "primary",
      isLoading: savingProfile,
      disabled: savingProfile
    },
  ];
  const sections: FormSection[] = [{ title: "Personal Information", fields }];

  const handleSubmit = async (values: Record<string, any>) => {
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("fullName", values.fullName || "");
      formData.append("username", values.username || "");

      await UserService.updateProfile(formData);
      // Refresh from API to get latest data (this will update all components via context)
      await refreshProfile();
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordFields: FormSection["fields"] = [
    { fieldtype: "input", name: "currentPassword", label: "Current Password", placeholder: "Enter current password", type: "password", required: true },
    { fieldtype: "input", name: "newPassword", label: "New Password", placeholder: "Enter new password", type: "password", required: true },
    { fieldtype: "input", name: "confirmPassword", label: "Confirm New Password", placeholder: "Confirm new password", type: "password", required: true },
  ];

  const passwordSections: FormSection[] = [{ title: "Change Password", fields: passwordFields }];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <PageHeader
        title={"Profile"}
        description={"Manage your profile information and settings"}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Profile Picture Card */}
        <div className="lg:col-span-4">
          <Surface variant="card" className="p-8">
            <div className="flex flex-col items-center gap-6">
              {/* Profile Picture Section */}
              <div className="relative group">
                <div 
                  className="relative cursor-pointer"
                  onClick={() => !uploadingPicture && fileInputRef.current?.click()}
                >
                  <div className="relative h-32 w-32 rounded-full overflow-hidden ring-4 ring-background shadow-lg">
                    {userInfo && (() => {
                      const avatarSource = getAvatarSource(userInfo, BACKEND_URL);
                      const displayName = getUserDisplayName(userInfo);
                      
                      return avatarSource.type === "url" ? (
                        <img
                          src={avatarSource.value}
                          alt={displayName}
                          className="h-full w-full rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent) {
                              target.style.display = "none";
                              const fallbackSpan = document.createElement("span");
                              fallbackSpan.className = "select-none h-full w-full flex items-center justify-center text-4xl font-bold text-background bg-text rounded-full";
                              fallbackSpan.textContent = getUserInitials(userInfo);
                              parent.appendChild(fallbackSpan);
                            }
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-background bg-text rounded-full">
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
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
                isLoading={uploadingPicture}
                className="w-full"
              >
                <span className="flex items-center gap-2">
                  <FiCamera />
                  {uploadingPicture ? "Uploading..." : "Change Profile Picture"}
                </span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
            </div>
          </Surface>
        </div>

        {/* Right Column: Profile Information & Security */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Information Form */}
          <Surface variant="card" className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text">Personal Information</h2>
              <p className="text-sm text-card-text mt-1">Update your personal details and preferences</p>
            </div>
            <Form
              title=""
              sections={sections}
              buttons={buttons}
              onSubmit={handleSubmit}
              errors={usernameError ? { username: usernameError } : {}}
              defaultValues={user || {}}
              sectionClassName="!space-y-4"
            />
          </Surface>

          {/* Security Section */}
          <Surface variant="card" className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text mb-1">Security</h2>
                <p className="text-sm text-card-text">Manage your password and account security settings</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setPasswordModalOpen(true)}
                className="w-full sm:w-auto"
              >
                <span className="flex items-center gap-2">
                  <FiLock />
                  Change Password
                </span>
              </Button>
            </div>
          </Surface>
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text">Change Password</h2>
          <Form
            title=""
            sections={passwordSections}
            buttons={[
              { type: "button", children: "Cancel", variant: "secondary", onClick: () => { setPasswordModalOpen(false); setPasswordError(undefined); } },
              { type: "submit", children: changingPassword ? "Changing..." : "Change Password", variant: "primary", disabled: changingPassword, isLoading: changingPassword },
            ]}
            onSubmit={(values) => {
              if (values.newPassword !== values.confirmPassword) {
                setPasswordError("New passwords do not match");
                return;
              }
              handlePasswordChange(values);
            }}
            errors={passwordError ? { newPassword: passwordError, confirmPassword: passwordError } : {}}
            defaultValues={{}}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
