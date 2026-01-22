import { useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { AuthService } from "../../service/authService";
import { ButtonProps } from "../Reusable/Button";
import Form, { FormSection } from "../Reusable/Inputs/Form";
import { UserService } from "../../service/userService";
import Card from "../Reusable/Card";
import HoverBorderGradient from "../Reusable/Aceternity UI/HoverBorderGradient";
import Spotlight from "../Reusable/Aceternity UI/Spotlight";

const Profile = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [usernameError, setUserNameError] = useState<string | undefined>(undefined);

  const fetchProfile = async () => {
    const { user: userProfile } = await UserService.getProfile();
    setProfile(userProfile);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = async (username: String) => {
    try {
      await AuthService.getUsernameAvailibility(username);
      setUserNameError(undefined);
    } catch {
      setUserNameError("Username not available");
    }
  };

  const fields: FormSection["fields"] = [
    { fieldtype: "input", name: "fullName", label: t("full_name"), placeholder: t("full_name"), type: "text", required: true },
    { fieldtype: "input", name: "username", label: t("username"), placeholder: t("username"), type: "text", required: true, handlechange: handleChange },
    { fieldtype: "input", name: "email", label: t("email"), placeholder: t("email"), type: "email", required: true, disabled: true },
  ];

  const buttons: ButtonProps[] = [{ type: "submit", children: "Save", variant: "primary" }];
  const sections: FormSection[] = [{ title: "", fields }];

  const handleSubmit = async (values: Record<string, any>) => {
    const { user } = await UserService.updateProfile(values);
    setProfile(user);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-text">{t("profile")}</h1>
        <p className="mt-1 text-sm text-card-text">{t("manage_profile_details") || ""}</p>
      </div>

      <HoverBorderGradient containerClassName="w-full" roundedClassName="rounded-3xl">
        <Card className="rounded-3xl p-6 md:p-8">
          <div className="relative overflow-hidden rounded-2xl">
            <Spotlight />
            <div className="relative z-10">
              <Form
                title=""
                sections={sections}
                buttons={buttons}
                onSubmit={handleSubmit}
                errors={usernameError ? { username: usernameError } : {}}
                defaultValues={profile}
              />
            </div>
          </div>
        </Card>
      </HoverBorderGradient>
    </div>
  );
};

export default Profile;
