"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@synclyft/ui/components/Button";
import { api } from "@synclyft/lib/api";
import { Shield, Building, Mail, Globe, Users, Save, Check } from "lucide-react";

interface OrganizationData {
  name: string;
  contactEmail: string;
  allowedDomains: string[];
  studentLimit: number;
  subscription: string;
  status: string;
  address: string;
  autoApprove: boolean;
}

export default function SettingsPage() {
  const [orgData, setOrgData] = useState<OrganizationData>({
    name: "",
    contactEmail: "",
    allowedDomains: [],
    studentLimit: 0,
    subscription: "",
    status: "",
    address:"",
    autoApprove: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchOrg = async () => {
      setLoading(true);
      try {
        const res = await api.get("college-admin/organization/me");
        console.log("Org settings fetched:", res.data);
        if (res.data) {
          setOrgData({
            name: res.data.data.organization.organizationName || res.data.organization || "",
            contactEmail: res.data.data.organization.primaryContactPerson.email || res.data.email || "",
            allowedDomains: res.data.allowedDomains || (res.data.domain ? [res.data.domain] : []),
            studentLimit: res.data.data.seatManagement || res.data.seatsLimit || 0,
            subscription: res.data.data.subscription || res.data.subscription || "",
            status: res.data.data.status || res.data.status || "",
            address:res.data.data.organization.address.country || res.data.address || "",
            autoApprove: res.data.autoApprove ?? false,
          });
        }
      } catch (err) {
        console.error("Failed to load organization settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch("college-admin/organization/me", orgData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save organization settings:", err);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 text-center text-xs text-[var(--th-text-faint)]">
        Loading organization settings...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-7 text-left">
      <div>
        <p className="label-caption mb-1" style={{ color: "var(--th-text-secondary)" }}>Officer Portal</p>
        <h1
          className="text-[1.75rem] font-bold tracking-tight"
          style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
        >
          Settings
        </h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-6">
          <div className="card-light p-6 space-y-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
              <Building size={18} className="text-[#0062FF]" />
              <h2 className="text-sm font-bold text-[var(--th-text-primary)]">Organization Profile</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Org Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--th-text-secondary)]">Organization Name</label>
                <input
                  type="text"
                  value={JSON.parse(JSON.stringify(orgData)).name}
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  className="input-light !text-xs"
                  required
                />
              </div>

              {/* Contact Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--th-text-secondary)]">Contact Email</label>
                <input
                  type="email"
                  value={orgData.contactEmail}
                  onChange={(e) => setOrgData({ ...orgData, contactEmail: e.target.value })}
                  className="input-light !text-xs"
                  required
                />
              </div>

              {/* Allowed Domains */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--th-text-secondary)]">Allowed Email Domains</label>
                <input
                  type="text"
                  value={orgData.allowedDomains.join(", ")}
                  onChange={(e) => setOrgData({ ...orgData, allowedDomains: e.target.value.split(",").map(d => d.trim()) })}
                  className="input-light !text-xs"
                  placeholder="domain.edu, company.com"
                  required
                />
              </div>

              {/* Student Limit */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--th-text-secondary)]">Max Student Capacity</label>
                <input
                  type="number"
                  value={orgData.studentLimit}
                  onChange={(e) => setOrgData({ ...orgData, studentLimit: parseInt(e.target.value) || 0 })}
                  className="input-light !text-xs"
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--th-text-secondary)]">Address</label>
                <input
                  type="text"
                  value={orgData.address}
                  onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                  className="input-light !text-xs"
                  placeholder="Organization Address"
                  required
                />
              </div>
            </div>

            {/* Auto-approve registrations */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--th-border)" }}>
              <div>
                <p className="text-xs font-semibold text-[var(--th-text-primary)]">Auto-Approve Students</p>
                <p className="text-[10px] text-[var(--th-text-faint)]">Automatically approve student accounts with matching email domains.</p>
              </div>
              <input
                type="checkbox"
                checked={orgData.autoApprove}
                onChange={(e) => setOrgData({ ...orgData, autoApprove: e.target.checked })}
                className="w-4 h-4 rounded accent-[#0062FF] cursor-pointer"
              />
            </div>

            {/* Save Controls */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving} icon={success ? <Check size={14} /> : <Save size={14} />}>
                {saving ? "Saving..." : success ? "Saved Successfully!" : "Save Profile Changes"}
              </Button>
            </div>
          </div>
        </form>

        <div className="lg:col-span-4 space-y-6">
          <div className="card-light p-6 space-y-4" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
              <Shield size={18} className="text-[#3DDC84]" />
              <h2 className="text-sm font-bold text-[var(--th-text-primary)]">License Status</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--th-text-secondary)]">License Plan:</span>
                <span className="font-bold text-[#0062FF]">{orgData.subscription}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--th-text-secondary)]">License Seats:</span>
                <span className="font-bold text-[var(--th-text-primary)]">{orgData.studentLimit} Seats</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--th-text-secondary)]">Status:</span>
                {orgData.status === "ACTIVE" ? (
                  <span className="font-bold text-emerald-500">Active</span>
                ) : (
                  <span className="font-bold text-yellow-500">Inactive</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
