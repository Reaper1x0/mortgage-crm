import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import DropdownMenu from "../Reusable/DropdownMenu";
import Modal from "../Reusable/Modal";
import Button from "../Reusable/Button";
import Avatar from "../Reusable/Avatar";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { cn } from "../../utils/cn";
import { FiSun, FiMoon } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { WorkspaceService } from "../../service/workspaceService";

const Navbar = () => {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const {
    user,
    logout: handleLogout,
    isAuthenticated,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
  } = useAuth();

  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [createWsLoading, setCreateWsLoading] = useState(false);

  const userInfo = normalizeUserForAvatar(user);

  const mode: "light" | "dark" = theme === "dark" ? "dark" : "light";

  const toggleTheme = () => {
    setTheme(mode === "dark" ? "light" : "dark");
  };

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      setActiveWorkspaceId(id);
      navigate("/workspace/dashboard/analytics");
    }
  };

  const handleCreateWorkspace = async () => {
    const trimmed = newWsName.trim();
    if (trimmed.length < 2) return;
    setCreateWsLoading(true);
    try {
      const res = await WorkspaceService.create(trimmed);
      const wid = res.data?.workspace?._id;
      await refreshWorkspaces();
      if (wid) {
        setActiveWorkspaceId(String(wid));
      }
      setNewWsName("");
      setCreateWsOpen(false);
      navigate("/workspace/dashboard/analytics");
    } catch (err) {
      console.error(err);
    } finally {
      setCreateWsLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    setLogoutLoading(true);
    try {
      await handleLogout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    } finally {
      setLogoutLoading(false);
      setLogoutModalOpen(false);
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
            {!isAuthenticated ? (
              <Button variant="primary" onClick={() => navigate("/")}>
                {t("join_now")}
              </Button>
            ) : (
              <>
                {workspaces.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mr-1">
                    <label htmlFor="workspace-select" className="sr-only">
                      Workspace
                    </label>
                    <select
                      id="workspace-select"
                      value={activeWorkspaceId ?? ""}
                      onChange={handleWorkspaceChange}
                      className={cn(
                        "max-w-[200px] rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm font-medium text-text",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30"
                      )}
                    >
                      {workspaces.map((w) => (
                        <option key={w.workspaceId} value={w.workspaceId}>
                          {w.name} ({w.role})
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="secondary" className="!py-1.5 !px-2 text-xs" onClick={() => setCreateWsOpen(true)}>
                      New workspace
                    </Button>
                  </div>
                )}
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
                      <Avatar user={userInfo} size="sm" />

                      <div className="hidden sm:flex flex-col pr-2">
                        <span className="text-sm font-semibold text-text leading-tight">
                          {user?.fullName || "User"}
                        </span>
                      </div>
                    </button>
                  }
                >
                  <div className="min-w-[240px]">
                    <div className="px-2 py-2">
                      <div className="text-sm font-semibold text-text">{user?.fullName || "User"}</div>
                      <div className="text-xs text-card-text">{user?.email || ""}</div>
                    </div>

                    <div className="my-2 border-t border-card-border" />

                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => navigate("/workspace/dashboard/analytics")}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold",
                          "transition-all duration-200 hover:bg-card-hover text-text"
                        )}
                      >
                        Workspace
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/workspace/profile")}
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

      <Modal isOpen={createWsOpen} onClose={() => setCreateWsOpen(false)}>
        <h2 className="text-lg font-semibold mb-2 text-text">New workspace</h2>
        <p className="text-sm text-card-text mb-4">Create another workspace. You will be switched to it after creation.</p>
        <input
          type="text"
          value={newWsName}
          onChange={(e) => setNewWsName(e.target.value)}
          placeholder="Workspace name"
          className={cn(
            "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-text mb-4",
            "placeholder:text-card-text/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
          )}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateWsOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="primary" onClick={handleCreateWorkspace} isLoading={createWsLoading} disabled={createWsLoading}>
            Create
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setLogoutModalOpen(false)}>
        <h2 className="text-lg font-semibold mb-2 text-text">{t("confirm_logout")}</h2>
        <p className="mb-6 text-card-text">{t("are_you_sure_logout")}</p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setLogoutModalOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={handleLogoutClick} isLoading={logoutLoading}>
            {t("logout")}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default Navbar;
