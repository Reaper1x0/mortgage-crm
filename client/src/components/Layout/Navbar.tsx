import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import DropdownMenu from "../Reusable/DropdownMenu";
import Modal from "../Reusable/Modal";
import Button from "../Reusable/Button";
import Avatar from "../Reusable/Avatar";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { cn } from "../../utils/cn";
import { FiSun, FiMoon, FiChevronDown, FiPlus } from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import { usePermissionsOptional } from "../../context/PermissionContext";
import { WorkspaceService } from "../../service/workspaceService";
import { OrganizationService } from "../../service/organizationService";
import { PopoverTrigger } from "../Reusable/PopoverTrigger";
import { buildOrganizationPath, buildWorkspacePath, getTenantFromPath } from "../../utils/tenantRouting";

const Navbar = () => {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnboarding = location.pathname.includes("/onboarding");
  const {
    user,
    logout: handleLogout,
    isAuthenticated,
    workspaces,
    activeOrganizationId,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
  } = useAuth();
  const perm = usePermissionsOptional();

  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [createWsLoading, setCreateWsLoading] = useState(false);

  const userInfo = normalizeUserForAvatar(user);
  const activeWorkspace = workspaces.find((w) => w.workspaceId === activeWorkspaceId) || null;
  const orgReferenceWorkspace =
    activeWorkspace ||
    workspaces.find((w) => w.organization?.organizationId === activeOrganizationId) ||
    workspaces[0] ||
    null;
  const organizationName = orgReferenceWorkspace?.organization?.name || "Mortgage CRM";
  const organizationLogo = orgReferenceWorkspace?.branding?.organization?.logoUrl || null;

  const resolveOrganizationIdForApi = (): string | null => {
    const fromPath = getTenantFromPath(location.pathname).organizationId;
    if (fromPath) return fromPath;
    if (activeOrganizationId && /^[a-f\d]{24}$/i.test(activeOrganizationId)) return activeOrganizationId;
    const fromWorkspace = orgReferenceWorkspace?.organization?.organizationId;
    if (fromWorkspace && /^[a-f\d]{24}$/i.test(fromWorkspace)) return fromWorkspace;
    return null;
  };

  const mode: "light" | "dark" = theme === "dark" ? "dark" : "light";
  const canCreateWorkspace =
    perm?.effective?.isOrgOwner ||
    perm?.canAnyOrg(["organization.workspaces.create"]) ||
    false;

  const toggleTheme = async () => {
    const next = mode === "dark" ? "light" : "dark";
    setTheme(next);
    const orgId = resolveOrganizationIdForApi();
    if (!orgId) return;
    try {
      const form = new FormData();
      form.append("themeMode", next);
      await OrganizationService.updateBranding(form, orgId);
      await refreshWorkspaces();
    } catch (err) {
      console.error("Failed to persist organization theme mode:", err);
    }
  };

  const handleWorkspaceChange = (id: string) => {
    if (id) {
      setActiveWorkspaceId(id);
      const selected = workspaces.find((w) => w.workspaceId === id);
      const orgId = selected?.organization?.organizationId || activeOrganizationId;
      if (orgId) {
        navigate(buildWorkspacePath(orgId, id, "dashboard"));
      }
    }
  };

  const handleCreateWorkspace = async () => {
    const trimmed = newWsName.trim();
    if (trimmed.length < 2) return;
    setCreateWsLoading(true);
    try {
      const orgId = resolveOrganizationIdForApi();
      const res = await WorkspaceService.create(trimmed, orgId);
      const wid = res.data?.workspace?._id;
      await refreshWorkspaces();
      if (wid && orgId) {
        setActiveWorkspaceId(String(wid));
        navigate(buildWorkspacePath(orgId, String(wid), "dashboard"));
        return;
      }
      setNewWsName("");
      setCreateWsOpen(false);
      if (orgId) {
        navigate(buildOrganizationPath(orgId, "dashboard"));
      }
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
          <Link
            to={isAuthenticated && activeOrganizationId ? buildOrganizationPath(activeOrganizationId, "dashboard") : "/"}
            className="ml-10 inline-flex items-center gap-2 text-text"
          >
            {organizationLogo ? (
              <span className="inline-flex h-8 max-w-[64px] items-center justify-center rounded-md border border-card-border bg-background overflow-hidden">
                <img
                  src={organizationLogo}
                  alt={organizationName}
                  className="max-h-full w-auto object-contain"
                />
              </span>
            ) : null}
            <span className="font-extrabold tracking-tight">{organizationName}</span>
          </Link>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <Button variant="primary" onClick={() => navigate("/")}>
                {t("join_now")}
              </Button>
            ) : (
              <>
                {!isOnboarding && workspaces.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mr-1">
                    <PopoverTrigger
                      closeOnSelect
                      content={
                        <div className="w-[280px] rounded-2xl border border-card-border bg-card p-2 shadow-lg">
                          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-card-text">
                            Organization
                          </div>
                          <div className="mt-1 space-y-1">
                            <button
                              type="button"
                              onClick={() =>
                                activeOrganizationId &&
                                navigate(buildOrganizationPath(activeOrganizationId, "settings/organization"))
                              }
                              className={cn(
                                "w-full rounded-xl px-3 py-2 text-left text-sm",
                                "transition-all duration-200",
                                "inline-flex items-center gap-3",
                                activeOrganizationId &&
                                  location.pathname.startsWith(
                                    buildOrganizationPath(activeOrganizationId, "settings/organization")
                                  )
                                  ? "bg-primary/15 text-text border border-primary/30"
                                  : "text-text hover:bg-card-hover border border-transparent"
                              )}
                            >
                              <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-card-border bg-background">
                                {organizationLogo ? (
                                  <img
                                    src={organizationLogo}
                                    alt={organizationName}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <RiBuildingLine className="h-4 w-4 text-card-text" />
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{organizationName || "Organization"}</span>
                                <span className="block text-xs text-card-text">Open organization</span>
                              </span>
                            </button>
                          </div>
                          <div className="mt-2 border-t border-card-border pt-2">
                            <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-card-text">
                              Workspaces
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                            {workspaces.map((w) => {
                              const isActive = w.workspaceId === activeWorkspaceId;
                              return (
                                <button
                                  key={w.workspaceId}
                                  type="button"
                                  onClick={() => handleWorkspaceChange(w.workspaceId)}
                                  className={cn(
                                    "w-full rounded-xl px-3 py-2 text-left text-sm",
                                    "transition-all duration-200",
                                    isActive
                                      ? "bg-card-hover text-text border border-card"
                                      : "text-text hover:bg-card-hover border border-transparent"
                                  )}
                                >
                                  <div className="font-semibold truncate">{w.name}</div>
                                  <div className="text-xs text-card-text">{w.role}</div>
                                </button>
                              );
                            })}
                          </div>
                          {canCreateWorkspace ? (
                            <div className="mt-2 border-t border-card-border pt-2">
                              <button
                                type="button"
                                onClick={() => setCreateWsOpen(true)}
                                className={cn(
                                  "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold",
                                  "inline-flex items-center gap-2",
                                  "text-text hover:bg-card-hover"
                                )}
                              >
                                <FiPlus className="h-4 w-4" />
                                Create workspace
                              </button>
                            </div>
                          ) : null}
                        </div>
                      }
                    >
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm font-medium text-text",
                          "focus:outline-none focus:ring-2 focus:ring-primary/30"
                        )}
                      >
                        <RiBuildingLine className="h-4 w-4 text-card-text" />
                        <span className="max-w-[180px] truncate">{organizationName || "Organization"}</span>
                        <FiChevronDown className="h-4 w-4 text-card-text" />
                      </button>
                    </PopoverTrigger>
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
                        onClick={() =>
                          activeOrganizationId &&
                          navigate(buildOrganizationPath(activeOrganizationId, "account/profile"))
                        }
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold",
                          "transition-all duration-200 hover:bg-card-hover text-text"
                        )}
                      >
                        Account settings
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
        {!canCreateWorkspace ? (
          <p className="mb-4 rounded-xl border border-warning-border bg-warning/10 px-3 py-2 text-sm text-warning-text">
            You do not have permission to create workspaces in this organization.
          </p>
        ) : null}
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
          <Button
            variant="primary"
            onClick={handleCreateWorkspace}
            isLoading={createWsLoading}
            disabled={createWsLoading || !canCreateWorkspace}
          >
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
