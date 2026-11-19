import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTheme } from "../../context/ThemeContext";
import DropdownMenu from "../Reusable/DropdownMenu";
import Modal from "../Reusable/Modal";
import Button from "../Reusable/Button";
import Avatar from "../Reusable/Avatar";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { cn } from "../../utils/cn";
import { FiSun, FiMoon, FiChevronDown, FiCheck } from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import OrgLogo from "../Reusable/OrgLogo";
import { resolveOrganizationLogoUrl } from "../../utils/orgLogo";
import { useAuth } from "../../context/AuthContext";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";
import Tooltip from "../Reusable/Tooltip";

const Navbar = () => {
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
    refreshWorkspaces,
  } = useAuth();
  const logoRefreshAt = useRef(0);

  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const organizationLogo = resolveOrganizationLogoUrl(activeOrganization, activeWorkspace);
  const refreshLogo = () => {
    const now = Date.now();
    if (now - logoRefreshAt.current < 15000) return;
    logoRefreshAt.current = now;
    void refreshWorkspaces();
  };
  const pickerPrimary = activeWorkspace?.name || organizationName || "Organization";
  const pickerSecondary = activeWorkspace ? organizationName : "Organization";
  const currentOrganizationId = activeOrganization?.organizationId || activeOrganizationId;
  const orderedOrganizations = [...organizations].sort((a, b) => {
    const aCurrent = a.organizationId === currentOrganizationId;
    const bCurrent = b.organizationId === currentOrganizationId;
    if (aCurrent === bCurrent) return 0;
    return aCurrent ? -1 : 1;
  });

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [pickerOpen]);

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
          "border-b border-card-border bg-card"
        )}
      >
        <div className="flex h-14 w-full items-center justify-between px-3 sm:px-4 lg:px-6">
          <Link
            to={
              isAuthenticated && activeOrganizationId
                ? activeWorkspaceId && activeWorkspace
                  ? buildWorkspacePath(activeOrganizationId, activeWorkspace.workspaceId, "dashboard")
                  : buildOrganizationPath(activeOrganizationId, "settings/organization")
                : "/"
            }
            className="min-w-0 inline-flex items-center gap-2 text-text"
          >
            <OrgLogo
              src={organizationLogo}
              alt={organizationName}
              size="nav"
              fallback="none"
              onLoadError={refreshLogo}
            />
            <span className="truncate font-extrabold tracking-tight">{organizationName}</span>
            {activeWorkspace?.name ? (
              <span className="hidden md:inline text-sm font-medium text-card-text">· {activeWorkspace.name}</span>
            ) : null}
          </Link>

          <div className="ml-3 flex shrink-0 items-center gap-2">
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => navigate("/")}>
                  Login
                </Button>
                <Button variant="primary" onClick={() => navigate("/register")}>
                  Register
                </Button>
              </div>
            ) : (
              <>
                {!isOnboarding && organizations.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mr-1 relative" ref={pickerRef}>
                    <button
                      type="button"
                      onClick={() => setPickerOpen((open) => !open)}
                      aria-haspopup="menu"
                      aria-expanded={pickerOpen}
                      aria-label="Switch workspace"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border border-card-border bg-background px-2.5 py-1 text-left",
                        "focus:outline-none focus:ring-2 focus:ring-primary-shadow"
                      )}
                    >
                      <RiBuildingLine className="h-4 w-4 shrink-0 text-card-text" />
                      <span className="min-w-0 max-w-[200px] leading-tight">
                        <span className="block truncate text-sm font-medium text-text">{pickerPrimary}</span>
                        <span className="block truncate text-[11px] text-card-text">{pickerSecondary}</span>
                      </span>
                      <FiChevronDown className={cn("h-4 w-4 shrink-0 text-card-text transition-transform", pickerOpen && "rotate-180")} />
                    </button>

                    {pickerOpen ? (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-50 mt-2 w-[300px] rounded-xl border border-card-border bg-card py-1.5 shadow-lg"
                      >
                        <div className="max-h-80 overflow-y-auto">
                          {orderedOrganizations.map((org, orgIndex) => {
                            const orgLogo = resolveOrganizationLogoUrl(org, org.workspaces[0]);
                            const hasWorkspaces = org.workspaces.length > 0;

                            return (
                              <div key={org.organizationId}>
                                {orgIndex > 0 ? (
                                  <div className="my-1.5 border-t border-card-border" />
                                ) : null}

                                <div className="flex items-center gap-2.5 px-3 py-2">
                                  <OrgLogo
                                    src={orgLogo}
                                    alt=""
                                    size="menu"
                                    onLoadError={refreshLogo}
                                  />
                                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                                    {org.name}
                                  </span>
                                  <span className="shrink-0 text-[11px] text-card-text">
                                    {org.organizationRole || "Member"}
                                  </span>
                                </div>

                                {hasWorkspaces ? (
                                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-card-text">
                                    Workspaces
                                  </p>
                                ) : (
                                  <p className="px-3 pb-1 text-sm text-card-text">No workspaces yet</p>
                                )}

                                {org.workspaces.map((workspace) => {
                                  const isActiveWorkspace =
                                    workspace.workspaceId === activeWorkspaceId &&
                                    org.organizationId === currentOrganizationId;
                                  return (
                                    <button
                                      key={workspace.workspaceId}
                                      type="button"
                                      role="menuitem"
                                      onClick={() =>
                                        handleWorkspaceChange(org.organizationId, workspace.workspaceId)
                                      }
                                      className={cn(
                                        "mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                                        "hover:bg-card-hover",
                                        isActiveWorkspace && "bg-primary-muted"
                                      )}
                                    >
                                      <span className="min-w-0 flex-1 truncate text-text">
                                        {workspace.name}
                                      </span>
                                      {isActiveWorkspace ? (
                                        <FiCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                                      ) : null}
                                    </button>
                                  );
                                })}

                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleOrganizationSelect(org.organizationId)}
                                  className="mx-2 mb-1 mt-0.5 flex w-[calc(100%-1rem)] items-center rounded-lg px-2 py-1.5 text-left text-xs font-medium text-card-text transition-colors hover:bg-card-hover hover:text-text"
                                >
                                  Organization settings
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
                {/* Theme Toggle (icon-only, replaces dropdown) */}
                <Tooltip
                  content={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  placement="bottom"
                >
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
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
                </Tooltip>

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
                        Logout
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
        <h2 className="text-lg font-semibold mb-2 text-text">Log out?</h2>
        <p className="mb-6 text-card-text">Are you sure you want to log out of your account?</p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setLogoutModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleLogoutClick} isLoading={logoutLoading}>
            Logout
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default Navbar;
