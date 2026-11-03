import { requireUser } from "@/lib/auth/server";
import TeacherGuide from "@/components/TeacherGuide";
export default async function Teacher() {
  await requireUser();
  return <TeacherGuide />;
}
