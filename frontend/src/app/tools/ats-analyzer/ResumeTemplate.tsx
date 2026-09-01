"use client";

import React from "react";
import { TemplateType, PaperColorType, SectionType, ProfileState, ExpItem, EduItem, ProjectItem, CertItem } from "./types";
export * from "./types";
import { MinimalistTemplate } from "./MinimalistTemplate";
import { ExecutiveTemplate } from "./ExecutiveTemplate";

export interface ResumeTemplateProps {
  template: TemplateType;
  paperColor: PaperColorType;
  profile: ProfileState;
  skills: string;
  experience: ExpItem[];
  education: EduItem[];
  projects: ProjectItem[];
  certificates: CertItem[];
  sectionsOrder: SectionType[];
}

export const paperBgStyles: Record<PaperColorType, string> = {
  white: "bg-[#FFFFFF] text-gray-800 border-gray-200",
  cream: "bg-[#FDFBF7] text-[#2F2A21] border-[#E8E1CE]",
  slate: "bg-slate-900 text-slate-100 border-slate-800",
  emerald: "bg-[#F3FAF6] text-[#1B3024] border-[#D8EFE0]",
  blue: "bg-[#F0F6FF] text-[#1E2E4A] border-[#D1E3FF]"
};

export function ResumeTemplate(props: ResumeTemplateProps) {
  return (
    <div className="space-y-6" id="resume-sheet-content">
      {props.template === "minimalist" && (
        <MinimalistTemplate {...props} />
      )}

      {props.template === "executive" && (
        <ExecutiveTemplate {...props} />
      )}
    </div>
  );
}
