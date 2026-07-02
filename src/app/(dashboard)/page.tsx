/*
File description:
This protected root route sends signed-in users to the primary `/dashboard` workspace. Keeping the
redirect server-side gives older bookmarks a stable entry point while the sidebar can use `/dashboard`
as the main overview URL.
*/

import { redirect } from "next/navigation";

export default function RootDashboardRedirectPage() {
  redirect("/dashboard");
}
