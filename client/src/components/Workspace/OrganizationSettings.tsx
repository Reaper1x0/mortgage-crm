import React from "react";
import { useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Callout from "../Reusable/Callout";
import { OrganizationService } from "../../service/organizationService";
import Modal from "../Reusable/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../Reusable/DropdownMenu";
import Input from "../Reusable/Inputs/Input";
import Button from "../Reusable/Button";
import FileUploadZone, { type FileUploadZoneHandle } from "../Reusable/Inputs/FileUploadZone";
import OrgLogo from "../Reusable/OrgLogo";
import AppLoadingCard from "../Reusable/AppLoadingCard";
import {
  readCachedOrganizationLogoUrl,
  resolveOrganizationLogoUrl,
} from "../../utils/orgLogo";

const OrganizationSettings: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { workspaces, organizations, activeWorkspaceId, workspacesLoaded, refreshWorkspaces } =
    useAuth();

  const membership = React.useMemo(() => {
    if (organizationId) {
      return organizations.find((item) => item.organizationId === organizationId) || null;
    }
    return organizations[0] || null;
  }, [organizations, organizationId]);

  const workspaceInOrg = React.useMemo(() => {
    const oid = membership?.organizationId || organizationId;
    if (!oid) return null;
    const inOrg = (w: (typeof workspaces)[0]) => w.organization?.organizationId === oid;
    return (
      workspaces.find((w) => w.workspaceId === activeWorkspaceId && inOrg(w)) ||
      workspaces.find((w) => inOrg(w)) ||
      null
    );
  }, [workspaces, activeWorkspaceId, membership?.organizationId, organizationId]);

  const orgName = membership?.name || workspaceInOrg?.organization?.name || "";
  const orgKey = membership?.organizationId || organizationId || null;

  const [saving, setSaving] = React.useState(false);
  const logoUploadRef = React.useRef<FileUploadZoneHandle | null>(null);
  const [showLogoPreview, setShowLogoPreview] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | undefined>(undefined);
  const [name, setName] = React.useState(orgName);
  const [legalName, setLegalName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [size, setSize] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");

  React.useEffect(() => {
    setName(orgName);
  }, [orgName]);

  if (!workspacesLoaded) {
    return <AppLoadingCard variant="panel" message="Loading organization details…" />;
  }

  if (!membership && !workspaceInOrg) {
    return (
      <div className="mx-auto max-w-3xl">
        <Callout tone="warning" title="Organization not found">
          You do not have access to this organization, or it no longer exists.
        </Callout>
      </div>
    );
  }

  const effectiveLogo = logoFile
    ? URL.createObjectURL(logoFile)
    : resolveOrganizationLogoUrl(membership, workspaceInOrg) ||
      readCachedOrganizationLogoUrl(orgKey) ||
      "";

  const handleDeleteLogo = async () => {
    const fd = new FormData();
    fd.append("removeLogo", "true");
    await OrganizationService.updateBranding(fd, orgKey);
    await refreshWorkspaces();
    setLogoFile(undefined);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await OrganizationService.updateProfile({
        name: name || null,
        legalName: legalName || null,
        website: website || null,
        industry: industry || null,
        size: size || null,
        contactEmail: contactEmail || null,
        phone: phone || null,
        addressLine1: address || null,
      });

      if (logoFile) {
        const orgForm = new FormData();
        orgForm.append("logo", logoFile);
        await OrganizationService.updateBranding(orgForm, orgKey);
      }

      await refreshWorkspaces();
      setLogoFile(undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-2xl border border-card-border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative">
              <DropdownMenu position="left-down">
                <DropdownMenuTrigger>
                  <button
                    type="button"
                    className="rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <OrgLogo
                      src={effectiveLogo || null}
                      alt={orgName || "Organization"}
                      size="settings"
                      className="rounded-xl"
                      initials={(orgName || "O").slice(0, 2)}
                      onLoadError={() => {
                        if (!logoFile) void refreshWorkspaces();
                      }}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[180px]">
                  <DropdownMenuItem onSelect={() => setShowLogoPreview(true)}>View</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => logoUploadRef.current?.open()}>
                    Upload / Update
                  </DropdownMenuItem>
                  <DropdownMenuItem tone="danger" onSelect={() => void handleDeleteLogo()}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold leading-tight text-text">
                {orgName || "Organization"}
              </h1>
              <p className="mt-1 text-sm text-card-text">Manage organization identity and profile.</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            isLoading={saving}
            className="shrink-0 px-4 py-2"
          >
            Save Changes
          </Button>
        </div>
        <FileUploadZone
          ref={logoUploadRef}
          name="organization-logo"
          accept="image/*"
          hideDefaultZone
          onChange={(e) => setLogoFile(e.target.files?.[0])}
        />
      </div>

      <section className="rounded-2xl border border-card-border bg-card p-4 md:p-5">
        <h2 className="mb-4 text-lg font-semibold text-text">Company Profile</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            name="organizationName"
            label="Organization name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            name="legalName"
            label="Legal name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
          <Input
            name="website"
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <Input
            name="industry"
            label="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
          <Input
            name="companySize"
            label="Company size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <Input
            name="contactEmail"
            label="Contact email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Input name="phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            name="organizationAddress"
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="md:col-span-2"
          />
        </div>
      </section>

      <Modal isOpen={showLogoPreview} onClose={() => setShowLogoPreview(false)}>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text">Organization Logo</h3>
          {effectiveLogo ? (
            <img
              src={effectiveLogo}
              alt={orgName || "Organization logo"}
              className="mx-auto h-auto max-h-[420px] w-auto max-w-full rounded-xl border border-card-border object-contain"
            />
          ) : (
            <div className="text-sm text-card-text">No logo uploaded.</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationSettings;
