import { redirect } from "next/navigation";

// The interview flow always begins at setup. A bare /interview visit is a
// mistake / stale bookmark — send them to the configuration screen.
export default function InterviewIndexPage() {
  redirect("/interview/setup");
}
