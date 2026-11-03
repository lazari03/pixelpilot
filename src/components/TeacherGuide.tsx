"use client";
import Link from "next/link";
import { useLocale, LanguagePicker } from "@/i18n/LocaleProvider";
import { useCourse } from "@/features/course/useCourse";
export default function TeacherGuide() {
  const { locale, t } = useLocale();
  const { state } = useCourse();
  return (
    <main>
      <LanguagePicker />
      <Link href="/">← {t("course")}</Link>
      <section className="card lesson">
        <h1>
          {locale === "sq" ? "Udhëzuesi i javës" : "One-week teaching guide"}
        </h1>
        <p>
          {locale === "sq"
            ? "Çdo ditë: 10 minuta prezantim, 15 minuta ushtrime të udhëzuara, 20 minuta sfida, 10 minuta kuiz dhe 5 minuta reflektim. Ora shtesë është për projekte krijuese dhe prova me shokët. Mos e mat të mësuarit vetëm me shpejtësi."
            : "Each day: 10 minutes introduction, 15 guided practice, 20 challenges, 10 quiz and 5 reflection. The optional second hour is for creative projects and peer testing. Do not measure learning only by speed."}
        </p>
        {state?.chapters.map((c) => (
          <div key={c.day}>
            <h2>
              {c.day + 1}. {c.title[locale]}
            </h2>
            {c.units.map((u) => (
              <p key={u.id}>
                <strong>{u.title[locale]}:</strong> {u.predict[locale]}
              </p>
            ))}
          </div>
        ))}
        <h2>{t("leaderboard")}</h2>
        <p>
          {locale === "sq"
            ? "Krijo llogaritë dhe grupet e klasës përmes panelit të Supabase. Regjistro pseudonime në class_members. Nxënësit nuk mund të ndryshojnë vetë pikët ose anëtarësinë. Renditja shfaq vetëm klasat ku bën pjesë nxënësi."
            : "Create accounts and classroom groups through the Supabase dashboard. Register nicknames in class_members. Students cannot edit points or membership. Rankings show only classrooms the student belongs to."}
        </p>
        <h2>{t("exam")}</h2>
        <p>{t("examIntro")}</p>
        <p>
          {locale === "sq"
            ? "Nxënësit mund të ndërrojnë gjuhën para një përpjekjeje të re. Pikët nuk varen nga gjuha ose shpejtësia."
            : "Students can switch language before a fresh attempt. Scores do not depend on language or speed."}
        </p>
      </section>
    </main>
  );
}
