import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/session";

export default async function Home() {
  if (await isLoggedIn()) redirect("/admin");
  redirect("/login");
}
