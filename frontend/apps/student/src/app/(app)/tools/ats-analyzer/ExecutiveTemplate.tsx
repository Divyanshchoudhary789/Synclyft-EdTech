"use client";

import React from "react";
import { cn } from "@synclyft/lib/utils";
import { PaperColorType, ProfileState, ExpItem, EduItem, ProjectItem, CertItem, SectionType } from "./types";

interface ExecutiveTemplateProps {
  paperColor: PaperColorType;
  profile: ProfileState;
  skills: string;
  experience: ExpItem[];
  education: EduItem[];
  projects: ProjectItem[];
  certificates: CertItem[];
  sectionsOrder: SectionType[];
}

export function ExecutiveTemplate({
  paperColor,
  profile,
  skills,
  experience,
  education,
  projects,
  certificates,
  sectionsOrder
}: ExecutiveTemplateProps) {

  const getHeaderColor = () => {
    if (paperColor === "cream") return "text-[#2F2A21] border-[#E8E1CE]";
    if (paperColor === "emerald") return "text-[#1B3024] border-[#D8EFE0]";
    if (paperColor === "blue") return "text-[#1E2E4A] border-[#D1E3FF]";
    if (paperColor === "slate") return "text-white border-slate-800";
    if (paperColor === "white") return "text-gray-900 border-gray-200";
    return "text-gray-900 border-gray-200 dark:text-white dark:border-gray-800";
  };

  const getSubTextColor = () => {
    if (paperColor === "cream") return "text-[#615745]";
    if (paperColor === "emerald") return "text-[#395F4A]";
    if (paperColor === "blue") return "text-[#3F5B8F]";
    if (paperColor === "slate") return "text-slate-400";
    if (paperColor === "white") return "text-gray-500";
    return "text-gray-500 dark:text-gray-400";
  };

  const renderPreviewSection = (secName: SectionType) => {
    if (secName === "education" && education.length > 0) {
      return (
        <div className="mb-5" key="education">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-wider border-b pb-0.5 mb-2", getHeaderColor())}>Education</h3>
          {education.map((edu) => (
            <div key={edu.id} className="mb-2">
              <div className="flex justify-between font-semibold">
                <span>{edu.college}</span>
                <span>{edu.gradYear}</span>
              </div>
              <p className={cn("italic text-[11px]", getSubTextColor())}>{edu.degree}</p>
            </div>
          ))}
        </div>
      );
    }

    if (secName === "experience" && experience.length > 0) {
      return (
        <div className="mb-5" key="experience">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-wider border-b pb-0.5 mb-2", getHeaderColor())}>Experience</h3>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between font-semibold">
                  <span>{exp.role} — {exp.company}</span>
                  <span className={cn("font-normal", getSubTextColor())}>{exp.date}</span>
                </div>
                <ul className="list-disc pl-4 mt-1.5 space-y-1 opacity-90">
                  <li>{exp.bullet1}</li>
                  {exp.bullet2 && <li>{exp.bullet2}</li>}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (secName === "projects" && projects.length > 0) {
      return (
        <div className="mb-5" key="projects">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-wider border-b pb-0.5 mb-2", getHeaderColor())}>Projects</h3>
          <div className="space-y-3">
            {projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between font-semibold">
                  <span>{proj.title} <span className={cn("font-normal text-[9px]", getSubTextColor())}>({proj.technologies})</span></span>
                </div>
                <p className="text-[11px] opacity-90 mt-0.5">{proj.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (secName === "skills") {
      return (
        <div key="skills" className="mb-5">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-wider border-b pb-0.5 mb-2", getHeaderColor())}>Skills</h3>
          <p className="text-[11px] leading-relaxed opacity-90">{skills}</p>
        </div>
      );
    }

    if (secName === "certificates" && certificates.length > 0) {
      return (
        <div className="mb-5" key="certificates">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-wider border-b pb-0.5 mb-2", getHeaderColor())}>Certificates</h3>
          <div className="space-y-2">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex justify-between text-xs">
                <div>
                  <span className="font-semibold">{cert.title}</span>
                  <span className={cn("italic text-[11px] ml-1.5", getSubTextColor())}>— {cert.issuer}</span>
                </div>
                <span className={cn("text-[11px]", getSubTextColor())}>{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="font-sans leading-relaxed text-xs">
      {/* Header slate banner */}
      <div className="bg-slate-800 dark:bg-slate-950 text-white -mx-6 -mt-6 p-6 mb-5 rounded-t-2xl">
        <h1 className="text-2xl font-bold tracking-wide uppercase">{profile.name}</h1>
        <div className="flex flex-wrap gap-x-4 mt-2 text-[9px] opacity-80 gap-y-1">
          <span>Email: {profile.email}</span>
          {profile.phone && <span>| Tel: {profile.phone}</span>}
          {profile.linkedin && <span>| LinkedIn: {profile.linkedin}</span>}
          {profile.github && <span>| GitHub: {profile.github}</span>}
        </div>
      </div>

      {/* Summary */}
      {profile.summary && (
        <div className="mb-5 text-left">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-wider border-b pb-0.5 mb-2", getHeaderColor())}>Summary</h3>
          <p className="text-[11px] leading-relaxed opacity-90">{profile.summary}</p>
        </div>
      )}

      {/* Loop sections in user preferred hierarchy order */}
      {sectionsOrder.map((secName) => renderPreviewSection(secName))}
    </div>
  );
}
