import { useMemo, useState } from "react";
import { User } from "../../types/auth.types";
import { Link, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { logout } from "../../redux/slices/logoutSlice";
import DropdownMenu from "../Reusable/DropdownMenu";
import { useTheme } from "../../context/ThemeContext";
import Modal from "../Reusable/Modal";
import Button from "../Reusable/Button";
import { cn } from "../../utils/cn";
import { FiSun, FiMoon } from "react-icons/fi";

const Navbar = ({ user }: { user: User | null }) => {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.logout);

  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);

  const initials = useMemo(() => {
    const ch = user?.fullName?.trim()?.charAt(0);
    return (ch || "U").toUpperCase();
  }, [user?.fullName]);

  const mode: "light" | "dark" = theme === "dark" ? "dark" : "light";

  const toggleTheme = () => {
    setTheme(mode === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 w-full z-40",
          "bg-card border-b border-card-border"
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-text font-extrabold tracking-tight ml-10">
            Mortgage CRM
          </Link>

          <div className="flex items-center gap-2">
            {!user ? (
              <Button variant="primary" onClick={() => navigate("/")}>
                {t("join_now")}
              </Button>
            ) : (
              <>
                {/* Theme Toggle (icon-only, replaces dropdown) */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  className={cn(
                    "group inline-flex items-center justify-center",
                    "h-10 w-10 rounded-full",
                    "border border-card-border bg-background",
                    "shadow-sm transition-all duration-200",
                    "hover:bg-card-hover"
                  )}
                >
                  {/* Animated swap */}
                  <span
                    className={cn(
                      "transition-all duration-200",
                      mode === "dark" ? "scale-100 rotate-0" : "scale-0 -rotate-45",
                      "absolute"
                    )}
                  >
                    <FiMoon className="h-5 w-5 text-text" />
                  </span>

                  <span
                    className={cn(
                      "transition-all duration-200",
                      mode === "light" ? "scale-100 rotate-0" : "scale-0 rotate-45",
                      "absolute"
                    )}
                  >
                    <FiSun className="h-5 w-5 text-text" />
                  </span>

                  {/* keeps button height stable */}
                  <span className="h-5 w-5 opacity-0">.</span>
                </button>

                {/* User dropdown */}
                <DropdownMenu
                  position="left-down"
                  button={
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2",
                        "rounded-full border border-card-border bg-background",
                        "px-2 py-1.5",
                        "shadow-sm transition-all duration-200",
                        "hover:bg-card-hover"
                      )}
                      aria-label="User menu"
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full",
                          "border border-secondary-border bg-secondary text-secondary-text"
                        )}
                      >
                        <span className="text-sm font-extrabold">{initials}</span>
                      </span>

                      <div className="hidden sm:flex flex-col pr-2">
                        <span className="text-sm font-semibold text-text leading-tight">
                          {user.fullName}
                        </span>
                      </div>
                    </button>
                  }
                >
                  <div className="min-w-[240px]">
                    <div className="px-2 py-2">
                      <div className="text-sm font-semibold text-text">{user.fullName}</div>
                      <div className="text-xs text-card-text">{user.email}</div>
                    </div>

                    <div className="my-2 border-t border-card-border" />

                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => navigate("/workspace/submissions")}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold",
                          "transition-all duration-200 hover:bg-card-hover text-text"
                        )}
                      >
                        Workspace
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/profile")}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold",
                          "transition-all duration-200 hover:bg-card-hover text-text"
                        )}
                      >
                        {t("profile")}
                      </button>

                      <button
                        type="button"
                        onClick={() => setLogoutModalOpen(true)}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold",
                          "transition-all duration-200 hover:bg-card-hover",
                          "text-danger"
                        )}
                      >
                        {t("logout")}
                      </button>
                    </div>
                  </div>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </header>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setLogoutModalOpen(false)}>
        <h2 className="text-lg font-semibold mb-2 text-text">{t("confirm_logout")}</h2>
        <p className="mb-6 text-card-text">{t("are_you_sure_logout")}</p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setLogoutModalOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={handleLogout} isLoading={loading}>
            {t("logout")}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default Navbar;
