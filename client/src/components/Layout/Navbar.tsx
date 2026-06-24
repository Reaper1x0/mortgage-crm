import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import DropdownMenu from "../Reusable/DropdownMenu";
import Modal from "../Reusable/Modal";
import Button from "../Reusable/Button";
import Avatar from "../Reusable/Avatar";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { cn } from "../../utils/cn";
import { FiSun, FiMoon, FiChevronDown } from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";

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
    organizations,
    activeOrganizationId,
    activeWorkspaceId,
    setActiveOrganizationId,
    setActiveWorkspaceId,
  } = useAuth();

  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const userInfo = normalizeUserForAvatar(user);
  const activeWorkspace = activeWorkspaceId
    ? workspaces.find((w) => w.workspaceId === activeWorkspaceId) || null
    : null;
  const activeOrganization =
    organizations.find((o) => o.organizationId === activeOrganizationId) ||
    (activeWorkspace?.organization?.organizationId
      ? organizations.find((o) => o.organizationId === activeWorkspace.organization?.organizationId)
      : null) ||
    null;
  const organizationName = activeOrganization?.name || activeWorkspace?.organization?.name || "Mortgage CRM";
  const organizationLogo =
    activeOrganization?.branding?.logoUrl || activeWorkspace?.branding?.organization?.logoUrl || null;
  const pickerLabel = activeWorkspace
    ? `${organizationName} · ${activeWorkspace.name}`
    : organizationName || "Organization";

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  useEffect(() => {
    if (pickerOpen && activeOrganizationId) {
      setExpandedOrgId(activeOrganizationId);
    }
  }, [pickerOpen, activeOrganizationId]);

  const mode: "light" | "dark" = theme === "dark" ? "dark" : "light";

  const toggleTheme = () => {
    setTheme(mode === "dark" ? "light" : "dark");
  };

  const handleOrganizationSelect = (organizationId: string) => {
    setActiveOrganizationId(organizationId);
    setActiveWorkspaceId(null);
    setPickerOpen(false);
    navigate(buildOrganizationPath(organizationId, "settings/organization"));
  };

  const handleWorkspaceChange = (organizationId: string, workspaceId: string) => {
    setActiveOrganizationId(organizationId);
    setActiveWorkspaceId(workspaceId);
    setPickerOpen(false);
    navigate(buildWorkspacePath(organizationId, workspaceId, "dashboard"));
  };

  const toggleOrgExpanded = (organizationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedOrgId((prev) => (prev === organizationId ? null : organizationId));
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
            to={
              isAuthenticated && activeOrganizationId
                ? activeWorkspaceId && activeWorkspace
                  ? buildWorkspacePath(activeOrganizationId, activeWorkspace.workspaceId, "dashboard")
                  : buildOrganizationPath(activeOrganizationId, "settings/organization")
                : "/"
            }
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
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => navigate("/")}>
                  {t("login")}
                </Button>
                <Button variant="primary" onClick={() => navigate("/register")}>
                  {t("register")}
                </Button>
              </div>
            ) : (
              <>
                {!isOnboarding && organizations.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mr-1 relative" ref={pickerRef}>
                    <button
                      type="button"
                      onClick={() => setPickerOpen((open) => !open)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm font-medium text-text",
                        "focus:outline-none focus:ring-2 focus:ring-primary-shadow"
                      )}
                    >
                      <RiBuildingLine className="h-4 w-4 text-card-text" />
                      <span className="max-w-[220px] truncate">{pickerLabel}</span>
                      <FiChevronDown className={cn("h-4 w-4 text-card-text transition-transform", pickerOpen && "rotate-180")} />
                    </button>

                    {pickerOpen ? (
                      <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-2xl border border-card-border bg-card p-2 shadow-lg">
                        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-card-text">
                          Organizations
                        </div>
                        <div className="mt-1 max-h-80 overflow-y-auto space-y-2 pr-1">
                          {organizations.map((org) => {
                            const isActiveOrg = org.organizationId === activeOrganizationId && !activeWorkspaceId;
                            const isExpanded = expandedOrgId === org.organizationId;
                            const orgLogo = org.branding?.logoUrl || null;
                            const hasWorkspaces = org.workspaces.length > 0;

                            return (
                              <div
                                key={org.organizationId}
                                className={cn(
                                  "overflow-hidden rounded-xl border",
                                  isActiveOrg ? "border-primary-border bg-primary-muted" : "border-card-border bg-background"
                                )}
                              >
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => handleOrganizationSelect(org.organizationId)}
                                    className={cn(
                                      "min-w-0 flex-1 px-3 py-2.5 text-left text-sm transition-colors duration-200",
                                      "inline-flex items-center gap-3 hover:bg-card-hover"
                                    )}
                                  >
                                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-card-border bg-card">
                                      {orgLogo ? (
                                        <img src={orgLogo} alt={org.name} className="h-full w-full object-contain" />
                                      ) : (
                                        <RiBuildingLine className="h-4 w-4 text-card-text" />
                                      )}
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate font-semibold text-text">{org.name}</span>
                                      <span className="block text-xs text-card-text">
                                        {org.organizationRole || "Member"}
                                      </span>
                                    </span>
                                  </button>
                                  {hasWorkspaces ? (
                                    <button
                                      type="button"
                                      aria-label={`${isExpanded ? "Collapse" : "Expand"} workspaces for ${org.name}`}
                                      onClick={(event) => toggleOrgExpanded(org.organizationId, event)}
                                      className="mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-card-text transition-colors hover:bg-card-hover"
                                    >
                                      <FiChevronDown
                                        className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")}
                                      />
                                    </button>
                                  ) : null}
                                </div>

                                {isExpanded && hasWorkspaces ? (
                                  <div className="space-y-1 border-t border-card-border bg-card px-2 py-2">
                                    <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-card-text">
                                      Workspaces
                                    </div>
                                    {org.workspaces.map((workspace) => {
                                      const isActiveWorkspace = workspace.workspaceId === activeWorkspaceId;
                                      return (
                                        <button
                                          key={workspace.workspaceId}
                                          type="button"
                                          onClick={() =>
                                            handleWorkspaceChange(org.organizationId, workspace.workspaceId)
                                          }
                                          className={cn(
                                            "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200",
                                            isActiveWorkspace
                                              ? "bg-primary-muted text-text border border-primary-border"
                                              : "text-text hover:bg-card-hover border border-transparent"
                                          )}
                                        >
                                          <div className="font-medium truncate">{workspace.name}</div>
                                          <div className="text-xs text-card-text">{workspace.role}</div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
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
