"use client";

import { useEffect, useState } from "react";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { api, toApiError } from "@synclyft/lib/api";
import { authService, collegeAdminService, notificationService } from "@synclyft/lib/api/services";
import { planLabel } from "@synclyft/lib/utils";
import { useAuthStore } from "@synclyft/lib/store/auth";
import toast from "react-hot-toast";
import { Building2, Shield, KeyRound, Bell, FileCheck2, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface Form {
  organizationName: string;
  organizationType: string;
  registrationNumber: string;
  phone: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactDesignation: string;
  city: string;
  state: string;
  country: string;
}

const EMPTY: Form = {
  organizationName: "", organizationType: "college", registrationNumber: "", phone: "", website: "",
  contactName: "", contactEmail: "", contactDesignation: "", city: "", state: "", country: "India",
};

export default function OfficerSettingsPage() {
  const { logout } = useAuthStore();
  const [form, setForm] = useState<Form>(EMPTY);
  const [meta, setMeta] = useState<{ status?: string; subscription?: string; seats?: number; isVerified?: boolean; docCount?: number }>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/college-admin/organization/me");
        const ctx = (res.data?.data ?? res.data) as Record<string, unknown>;
        const org = (ctx.organization ?? {}) as Record<string, unknown>;
        const contact = (org.primaryContactPerson ?? {}) as Record<string, unknown>;
        const address = (org.address ?? {}) as Record<string, unknown>;
        const sub = (ctx.subscription ?? {}) as Record<string, unknown>;
        const seatMgmt = (ctx.seatManagement ?? {}) as Record<string, unknown>;
        setForm({
          organizationName: String(org.organizationName ?? ""),
          organizationType: String(org.organizationType ?? "college"),
          registrationNumber: String(org.registrationNumber ?? ""),
          phone: String(org.phone ?? ""),
          website: String(org.website ?? ""),
          contactName: String(contact.name ?? ""),
          contactEmail: String(contact.email ?? ""),
          contactDesignation: String(contact.designation ?? ""),
          city: String(address.city ?? ""),
          state: String(address.state ?? ""),
          country: String(address.country ?? "India"),
        });
        setMeta({
          status: String(org.status ?? ctx.status ?? ""),
          subscription: planLabel(sub.planType as string),
          seats: Number(seatMgmt.totalSeatsAllocated ?? 0),
          isVerified: Boolean(org.isVerified),
          docCount: Array.isArray(org.verificationDocuments) ? org.verificationDocuments.length : 0,
        });
      } catch (err) {
        toast.error(toApiError(err).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadKey]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName.trim()) return toast.error("Primary contact name is required");
    setSaving(true);
    try {
      await api.put("/college-admin/update/organization/me", {
        organizationName: form.organizationName,
        organizationType: form.organizationType,
        registrationNumber: form.registrationNumber,
        phone: form.phone,
        website: form.website || undefined,
        address: { city: form.city, state: form.state, country: form.country },
        primaryContactPerson: {
          name: form.contactName,
          email: form.contactEmail,
          designation: form.contactDesignation,
        },
      });
      toast.success("Organization details saved");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof Form, opts: { type?: string; required?: boolean } = {}) => (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>{label}</label>
      <input
        type={opts.type ?? "text"}
        value={form[key]}
        required={opts.required}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border text-xs"
        style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}
      />
    </div>
  );

  return (
    <div className="p-5 sm:p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Account"
        icon={<Building2 size={18} />}
        title="Organization settings"
        subtitle="Your institute profile and placement-cell contact"
      />

      {loading ? (
        <div className="space-y-3"><SkeletonBlock height="h-9" /><SkeletonBlock height="h-9" /><SkeletonBlock height="h-9" /></div>
      ) : (
        <>
          <div className="rounded-2xl border p-5 flex flex-wrap gap-4 text-sm" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Status</p>
              <Badge variant={meta.isVerified ? "verdant" : "amber"}>{meta.isVerified ? "Verified" : (meta.status || "pending verification").replace(/_/g, " ")}</Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Plan</p>
              <p style={{ color: "var(--th-text-primary)" }}>{meta.subscription}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Seats allocated</p>
              <p style={{ color: "var(--th-text-primary)" }}>{meta.seats ?? 0}</p>
            </div>
          </div>

          <form onSubmit={save} className="rounded-2xl border p-6 space-y-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
            <div className="grid sm:grid-cols-2 gap-4">
              {field("Institute name", "organizationName")}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Type</label>
                <select value={form.organizationType} onChange={(e) => setForm((f) => ({ ...f, organizationType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-xs"
                  style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
                  {["college", "university", "institute", "training_center"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {field("Registration number", "registrationNumber")}
              {field("Phone", "phone")}
              {field("Website", "website", { type: "url" })}
              {field("City", "city")}
              {field("State", "state")}
              {field("Country", "country")}
            </div>
            <div className="pt-4 border-t" style={{ borderColor: "var(--th-border)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--th-text-primary)" }}>Primary contact</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {field("Name", "contactName", { required: true })}
                {field("Email", "contactEmail", { type: "email" })}
                {field("Designation", "contactDesignation")}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button type="button" onClick={() => logout()} className="text-xs flex items-center gap-1.5" style={{ color: "var(--th-text-faint)" }}>
                <Shield size={12} /> Sign out
              </button>
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>

          {!meta.isVerified && (
            <VerificationCard docCount={meta.docCount ?? 0} onUploaded={() => setReloadKey((k) => k + 1)} />
          )}
          <NotificationPrefsCard />
          <PasswordCard />
        </>
      )}
    </div>
  );
}

const DOC_TYPES = [
  { value: "registration_certificate", label: "Registration / affiliation certificate" },
  { value: "gst_certificate", label: "GST certificate" },
  { value: "pan_certificate", label: "PAN certificate" },
  { value: "udyam_aadhar", label: "Udyam / Aadhaar" },
];

function VerificationCard({ docCount, onUploaded }: { docCount: number; onUploaded: () => void }) {
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file to upload");
    if (file.size > 3 * 1024 * 1024) return toast.error("File must be under 3MB");
    setUploading(true);
    try {
      await collegeAdminService.addVerificationDocument(file, docType);
      toast.success("Document uploaded — our team will review it shortly");
      setFile(null);
      onUploaded();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
      <div>
        <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
          <FileCheck2 size={15} /> Institute verification
        </p>
        <p className="text-[11px] mt-1" style={{ color: "var(--th-text-faint)" }}>
          {docCount > 0
            ? `${docCount} document${docCount === 1 ? "" : "s"} submitted · pending review. You can add more.`
            : "Upload an official document so the Synclyft team can verify your institute and activate all features."}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Document type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>File (JPG / PNG, max 3MB)</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--th-primary)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            style={{ color: "var(--th-text-secondary)" }} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={uploading} icon={<Upload size={13} />}>Upload document</Button>
      </div>
    </form>
  );
}

function NotificationPrefsCard() {
  const [prefs, setPrefs] = useState<{ inApp: boolean; email: boolean }>({ inApp: true, email: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await notificationService.getPreferences();
        const g = (((res as Record<string, unknown>)?.data as Record<string, unknown>)?.globalChannels ?? {}) as Record<string, unknown>;
        setPrefs({ inApp: g.inApp !== false, email: g.email !== false });
      } catch {
        /* keep defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (next: { inApp: boolean; email: boolean }) => {
    setPrefs(next);
    setSaving(true);
    try {
      await notificationService.updatePreferences({ globalChannels: next });
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
      <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
        <Bell size={15} /> Notifications
      </p>
      {loading ? (
        <SkeletonBlock height="h-8" />
      ) : (
        <div className="space-y-2">
          {([
            ["inApp", "In-app notifications", "Alerts inside the portal"],
            ["email", "Email notifications", "Approvals, campaign updates and reminders"],
          ] as const).map(([k, label, desc]) => (
            <label key={k} className="flex items-center justify-between gap-4 rounded-lg border p-3" style={{ borderColor: "var(--th-border)" }}>
              <span>
                <span className="text-xs font-medium block" style={{ color: "var(--th-text-primary)" }}>{label}</span>
                <span className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>{desc}</span>
              </span>
              <input type="checkbox" checked={prefs[k]} disabled={saving}
                onChange={(e) => save({ ...prefs, [k]: e.target.checked })} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function PasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword.length < 8) return toast.error("New password must be at least 8 characters");
    if (form.newPassword !== form.confirm) return toast.error("Passwords do not match");
    setSaving(true);
    try {
      await authService.changePassword(form.currentPassword, form.newPassword);
      toast.success("Password updated. Other devices signed out.");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
      <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
        <KeyRound size={15} /> Change password
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        {([
          ["currentPassword", "Current password"],
          ["newPassword", "New password"],
          ["confirm", "Confirm new password"],
        ] as const).map(([k, label]) => (
          <div key={k} className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>{label}</label>
            <input type="password" value={form[k]} autoComplete={k === "currentPassword" ? "current-password" : "new-password"}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-xs"
              style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>Update password</Button>
      </div>
    </form>
  );
}
