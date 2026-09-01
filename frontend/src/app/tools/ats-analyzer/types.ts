export type TemplateType = "minimalist" | "modern" | "executive";
export type PaperColorType = "white" | "cream" | "slate" | "emerald" | "blue";
export type SectionType = "education" | "experience" | "projects" | "skills" | "certificates";

export interface ProfileState {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
}

export interface ExpItem {
  id: string;
  role: string;
  company: string;
  date: string;
  bullet1: string;
  bullet2: string;
}

export interface EduItem {
  id: string;
  college: string;
  degree: string;
  gradYear: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  technologies: string;
  description: string;
}

export interface CertItem {
  id: string;
  title: string;
  issuer: string;
  date: string;
}
