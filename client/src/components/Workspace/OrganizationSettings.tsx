import React from "react";
import { useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Callout from "../Reusable/Callout";
import { OrganizationService } from "../../service/organizationService";
import Modal from "../Reusable/Modal";
import DropdownMenu from "../Reusable/DropdownMenu";
import Input from "../Reusable/Inputs/Input";
import Button from "../Reusable/Button";
import FileUploadZone, { type FileUploadZoneHandle } from "../Reusable/Inputs/FileUploadZone";
import OrgLogo from "../Reusable/OrgLogo";
import { resolveOrganizationLogoUrl } from "../../utils/orgLogo";

const OrganizationSettings: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { workspaces, organizations, activeWorkspaceId, refreshWorkspaces } = useAuth();

  const active = React.useMemo(() => {
    const oid = organizationId;
    if (!oid) {
      return workspaces.find((w) => w.workspaceId === activeWorkspaceId) || null;
    }
    const inOrg = (w: (typeof workspaces)[0]) => w.organization?.organizationId === oid;
    return (
      workspaces.find((w) => w.workspaceId === activeWorkspaceId && inOrg(w)) ||
      workspaces.find((w) => inOrg(w)) ||
      null
    );
  }, [workspaces, activeWorkspaceId, organizationId]);
  const [saving, setSaving] = React.useState(false);
  const logoUploadRef = React.useRef<FileUploadZoneHandle | null>(null);
  const [showLogoPreview, setShowLogoPreview] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | undefined>(undefined);
  const [name, setName] = React.useState(active?.organization?.name || "");
  const [legalName, setLegalName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [size, setSize] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");

  React.useEffect(() => {
    setName(active?.organization?.name || "");
  }, [active?.organization?.name]);

  if (!active) {
    return (
      <div className="max-w-3xl mx-auto">
        <Callout tone="warning" title="No workspace in this organization">
          Create a workspace from onboarding or the workspace switcher, then open organization settings again.
        </Callout>
      </div>
    );
  }

  const org = active.organization;
  const membership = organizations.find((item) => item.organizationId === (organizationId || org?.organizationId));
  const effectiveLogo = logoFile
    ? URL.createObjectURL(logoFile)
    : resolveOrganizationLogoUrl(membership, active) || "";

  const handleDeleteLogo = async () => {
    const fd = new FormData();
    fd.append("removeLogo", "true");
    await OrganizationService.updateBranding(fd);
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
        await OrganizationService.updateBranding(orgForm);
      }

      await refreshWorkspaces();
      setLogoFile(undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="rounded-2xl border border-card-border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
          <div className="relative">
            <DropdownMenu
              position="left-down"
              menuClassName="min-w-[180px]"
              button={
                <button
                  type="button"
                  className="rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {effectiveLogo ? (
                    <OrgLogo
                      src={effectiveLogo}
                      alt={org?.name || "Organization"}
                      size="settings"
                      className="rounded-xl"
                      onLoadError={() => {
                        if (!logoFile) void refreshWorkspaces();
                      }}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-card-border bg-primary text-xl font-semibold text-primary-text">
                      {(org?.name || "O").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </button>
              }
            >
              <button type="button" onClick={() => setShowLogoPreview(true)} className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-card-hover">View</button>
              <button type="button" onClick={() => logoUploadRef.current?.open()} className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-card-hover">Upload / Update</button>
              <button type="button" onClick={handleDeleteLogo} className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-card-hover">Delete</button>
            </DropdownMenu>
          </div>
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight text-text">{org?.name || "Organization"}</h1>
            <p className="text-sm text-card-text mt-1">Manage organization identity and profile.</p>
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
        <h2 className="text-lg font-semibold text-text mb-4">Company Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="organizationName" label="Organization name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input name="legalName" label="Legal name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          <Input name="website" label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Input name="industry" label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <Input name="companySize" label="Company size" value={size} onChange={(e) => setSize(e.target.value)} />
          <Input name="contactEmail" label="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
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
              alt={org?.name || "Organization logo"}
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
