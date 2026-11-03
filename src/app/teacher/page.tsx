"use client";
import Link from "next/link";
import { useLearning } from "@/hooks/useLearning";
export default function Teacher() {
  const { curriculum, curriculumStatus } = useLearning();
  const days = curriculum.lessons;
  return (
    <main>
      <Link href="/">← Back to Creator Lab</Link>
      <div className="card lesson" style={{ margin: "30px auto" }}>
        <div className="eyebrow">TEACHER FIELD GUIDE</div>
        <h1>Five days. Many ways to create.</h1>
        <p className="curriculum-status">{curriculumStatus}</p>
        <p>
          This pilot assumes five 60-minute sessions for ages 8–12. Start with a
          short demonstration, then let pairs build, test and explain. Use
          Explorer for supported practice, Builder for independent routes, and
          Inventor for additional design constraints.
        </p>
        {days.map((d, i) => (
          <section key={d.title}>
            <h2>
              Day {i + 1}: {d.title}
            </h2>
            <p>{d.lesson}</p>
            <p>
              <strong>Challenge:</strong> {d.goal}
            </p>
            <p>
              <strong>Prompt goal:</strong> {d.prompt}.{" "}
              <strong>Constraint:</strong> {d.rule}
            </p>
          </section>
        ))}
        <h2>Classroom access</h2>
        <p>
          Create accounts in your Supabase Authentication dashboard, using
          teacher-managed aliases rather than children’s personal email
          addresses. Give each pupil a unique passphrase. Disable public
          signups, enable provider login rate limits and CAPTCHA where
          appropriate, and handle password resets through the teacher. Never
          share your service-role key with this app or students.
        </p>
        <h2>What this pilot includes</h2>
        <p>
          Working movement and repeat blocks, editable Boolean gate rules, five
          lesson guides, three scaffolding levels, local demo progress, and
          account progress once Supabase is connected. Switch, do/while and
          functions are introduced in the guides; dedicated executable blocks
          for those concepts are a future extension.
        </p>
        <h2>AI literacy</h2>
        <p>
          The practice assistant uses a local command interpreter and retrieves
          explanations from the course knowledge library, not a language model.
          Ask pupils to identify whether each response follows their goal, rules
          and format. It deliberately does not promise to follow arbitrary
          prompts. Discuss uncertainty, private information and checking an
          answer.
        </p>
        <h2>Before classroom use</h2>
        <p>
          Apply the database schema and test account isolation with two student
          accounts. Review school data policies and retention. This guide is
          public; it contains no student roster or private information.
        </p>
      </div>
    </main>
  );
}
