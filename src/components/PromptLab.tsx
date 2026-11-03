"use client";
import { useState } from "react";
import {
  interpretStructured,
  type StructuredPrompt,
  type TutorAction,
} from "@pixelpilot/local-tutor";
import { useLocale } from "@/i18n/LocaleProvider";
import type { CourseRepository } from "@/features/course/repository";
interface Props {
  day: number;
  learned: boolean;
  repository: CourseRepository;
  onSaved: () => Promise<void>;
  onAction: (action: TutorAction) => void;
}
export default function PromptLab({
  day,
  learned,
  repository,
  onSaved,
  onAction,
}: Props) {
  const { t, locale } = useLocale();
  const [ack, setAck] = useState(false),
    [form, setForm] = useState<StructuredPrompt>({
      goal: "",
      context: "",
      rules: "",
      format: "",
    }),
    [action, setAction] = useState<TutorAction | null>(null),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setAction(null);
    if (!learned || !ack) {
      setStatus(t("promptLocked"));
      return;
    }
    const result = interpretStructured(form, [], locale);
    if (!result.action) {
      setStatus(
        t(result.intent === "privacy" ? "promptPrivacy" : "promptInvalid"),
      );
      return;
    }
    setBusy(true);
    try {
      const accepted = await repository.submitPrompt(day, form);
      if (accepted) {
        setAction(result.action);
        setStatus(t("promptSaved"));
        await onSaved();
      } else setStatus(t("promptInvalid"));
    } catch {
      setStatus(t("saveError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card prompt-course">
      <h2>✦ {t("promptLesson")}</h2>
      <p>{t("promptIntro")}</p>
      <blockquote>{t("promptExample")}</blockquote>
      <label className="check-label">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        {t("understand")}
      </label>
      {!learned && (
        <p className="feedback">
          {t("promptLocked")} —{" "}
          {locale === "sq" ? "Kapitulli 1, mësimi 3" : "Chapter 1, lesson 3"}
        </p>
      )}
      <div className="prompt-fields">
        {(["goal", "context", "rules"] as const).map((field, i) => (
          <label key={field}>
            <span className="eyebrow">
              0{i + 1} · {t(field)}
            </span>
            <textarea
              aria-label={t(field)}
              maxLength={600}
              value={form[field]}
              onChange={(e) => {
                setForm({ ...form, [field]: e.target.value });
                setAction(null);
              }}
            />
          </label>
        ))}
        <label>
          <span className="eyebrow">04 · {t("format")}</span>
          <select
            aria-label={t("format")}
            value={form.format}
            onChange={(e) => {
              setForm({ ...form, format: e.target.value });
              setAction(null);
            }}
          >
            <option value="">—</option>
            <option value={locale === "sq" ? "plan veprimi" : "action plan"}>
              {locale === "sq" ? "Plan veprimi" : "Action plan"}
            </option>
          </select>
        </label>
      </div>
      <p className="small muted">{t("promptHint")}</p>
      <button className="primary" disabled={busy} onClick={submit}>
        {t("preview")}
      </button>
      <p role="status">{status}</p>
      {action && (
        <div className="response">
          <strong>
            {action.type === "move"
              ? `${t("move")} ${t(action.direction)} × ${action.steps}`
              : action.type === "reset"
                ? t("reset")
                : `${t("gate")}: ${action.operator}`}
          </strong>
          <button
            className="primary"
            onClick={() => {
              onAction(action);
              setAction(null);
            }}
          >
            {t("apply")}
          </button>
        </div>
      )}
      <p className="small muted">{t("promptPrivacy")}</p>
    </section>
  );
}
