import { useState } from "react";
import { FiLock, FiShield } from "react-icons/fi";
import Form, { FormSection } from "../Reusable/Inputs/Form";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import { UserService } from "../../service/userService";
import { showSuccessToast } from "../../utils/errorHandler";

export default function SecuritySettings() {
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);

  const passwordFields: FormSection["fields"] = [
    {
      fieldtype: "input",
      name: "currentPassword",
      label: "Current password",
      placeholder: "Enter current password",
      type: "password",
      required: true,
    },
    {
      fieldtype: "input",
      name: "newPassword",
      label: "New password",
      placeholder: "Enter new password",
      type: "password",
      required: true,
    },
    {
      fieldtype: "input",
      name: "confirmPassword",
      label: "Confirm new password",
      placeholder: "Confirm new password",
      type: "password",
      required: true,
    },
  ];

  const passwordSections: FormSection[] = [
    { title: "", fields: passwordFields },
  ];

  const handlePasswordChange = async (values: Record<string, any>) => {
    setPasswordError(undefined);
    setSuccessMessage(undefined);

    if (values.newPassword !== values.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await UserService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccessMessage("Password changed successfully.");
      showSuccessToast("Password changed successfully");
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message || error?.message || "Failed to change password",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Security"
        description="Manage your password and account security"
      />

      <Surface variant="card" className="p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FiLock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Change password</h2>
            <p className="mt-0.5 text-sm text-card-text">
              Use a strong password you do not reuse on other sites.
            </p>
          </div>
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-xl border border-success-border bg-success-muted px-4 py-3 text-sm text-success">
            {successMessage}
          </div>
        ) : null}

        <Form
          title=""
          sections={passwordSections}
          buttons={[
            {
              type: "submit",
              children: changingPassword ? "Updating..." : "Update password",
              variant: "primary",
              disabled: changingPassword,
              isLoading: changingPassword,
            },
          ]}
          onSubmit={handlePasswordChange}
          errors={
            passwordError
              ? { newPassword: passwordError, confirmPassword: passwordError }
              : {}
          }
          defaultValues={{}}
        />
      </Surface>

      <Surface variant="card" className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-card-text">
            <FiShield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Account protection</h2>
            <p className="mt-0.5 text-sm text-card-text">
              Two-factor authentication and active session management can be added here later.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
