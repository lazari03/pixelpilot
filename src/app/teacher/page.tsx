import { requireUser } from "@/lib/auth/server";
import TeacherStudio from "@/components/TeacherStudio";
export default async function Teacher() {
  await requireUser();
  return <TeacherStudio />;
}
