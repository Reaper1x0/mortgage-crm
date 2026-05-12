import React from "react";
import { useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Callout from "../Reusable/Callout";
import { OrganizationService } from "../../service/organizationService";
import Modal from "../Reusable/Modal";
import ColorPicker from "../Reusable/Inputs/ColorPicker";
import DropdownMenu from "../Reusable/DropdownMenu";
import Input from "../Reusable/Inputs/Input";
import Button from "../Reusable/Button";

const OrganizationSettings: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { workspaces, activeWorkspaceId, refreshWorkspaces } = useAuth();

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
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [showLogoPreview, setShowLogoPreview] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | undefined>(undefined);
  const [orgPrimaryColor, setOrgPrimaryColor] = React.useState(
    active?.branding?.organization?.primaryColor || "#3b82f6"
  );
  const [orgSecondaryColor, setOrgSecondaryColor] = React.useState(
    active?.branding?.organization?.secondaryColor || "#8b5cf6"
  );
  const [name, setName] = React.useState(active?.organization?.name || "");
  const [legalName, setLegalName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [size, setSize] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");

  React.useEffect(() => {
    setOrgPrimaryColor(active?.branding?.organization?.primaryColor || "#3b82f6");
    setOrgSecondaryColor(active?.branding?.organization?.secondaryColor || "#8b5cf6");
    setName(active?.organization?.name || "");
  }, [active?.branding?.organization, active?.organization?.name]);

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
  const effectiveLogo = logoFile
    ? URL.createObjectURL(logoFile)
    : active?.branding?.organization?.logoUrl || "";

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

      const orgForm = new FormData();
      orgForm.append("primaryColor", orgPrimaryColor);
      orgForm.append("secondaryColor", orgSecondaryColor);
      if (logoFile) orgForm.append("logo", logoFile);
      await OrganizationService.updateBranding(orgForm);
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
                    <div className="h-20 max-w-[180px] rounded-xl border border-card-border bg-background flex items-center justify-center overflow-hidden">
                      <img
                        src={effectiveLogo}
                        alt={org?.name || "Organization"}
                        className="max-h-full w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 min-w-[5rem] rounded-xl border border-card-border bg-background flex items-center justify-center text-card-text text-xs text-center px-2 leading-tight">
                      No Logo
                    </div>
                  )}
                </button>
              }
            >
              <button type="button" onClick={() => setShowLogoPreview(true)} className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-card-hover">View</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-card-hover">Upload / Update</button>
              <button type="button" onClick={handleDeleteLogo} className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-card-hover">Delete</button>
            </DropdownMenu>
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-text leading-tight">{org?.name || "Organization"}</h1>
            <p className="text-sm text-card-text mt-1">Manage organization identity, branding, and profile.</p>
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setLogoFile(e.target.files?.[0])}
        />
      </div>

      <section className="rounded-2xl border border-card-border bg-card p-4 md:p-5">
        <h2 className="text-lg font-semibold text-text mb-4">Company Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="organizationName" placeholder="Organization name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input name="legalName" placeholder="Legal name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          <Input name="website" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Input name="industry" placeholder="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <Input name="companySize" placeholder="Company size" value={size} onChange={(e) => setSize(e.target.value)} />
          <Input name="contactEmail" placeholder="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          <Input name="phone" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            name="organizationAddress"
            placeholder="Organization address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="md:col-span-2"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-4 md:p-5 space-y-5">
        <h2 className="text-lg font-semibold text-text">Brand Kit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorPicker label="Organization primary color" value={orgPrimaryColor} onChange={setOrgPrimaryColor} />
          <ColorPicker label="Organization secondary color" value={orgSecondaryColor} onChange={setOrgSecondaryColor} />
        </div>
      </section>

      <Modal isOpen={showLogoPreview} onClose={() => setShowLogoPreview(false)}>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text">Organization Logo</h3>
          {effectiveLogo ? (
            <img
              src={effectiveLogo}
              alt={org?.name || "Organization logo"}
              className="w-full rounded-xl border border-card-border object-contain max-h-[420px]"
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
