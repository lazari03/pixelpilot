import Studio from "@/components/Studio";
import { requireUser } from "@/lib/auth/server";
export default async function Page() {
  await requireUser();
  return <Studio />;
}
