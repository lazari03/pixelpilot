"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  interpret,
  type KnowledgeEntry,
  type TutorAction,
  type TutorResult,
} from "@pixelpilot/local-tutor";
import type { LearningEvent } from "@/domain/models";
interface Props {
  knowledge: KnowledgeEntry[];
  day: number;
  busy: boolean;
  onAction: (action: TutorAction) => void;
  onRecord: (event: LearningEvent) => Promise<void>;
}
export default function PromptLab({
  knowledge,
  day,
  busy,
  onAction,
  onRecord,
}: Props) {
  const [request, setRequest] = useState("Explain OR");
  const [result, setResult] = useState<TutorResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [reflection, setReflection] = useState("");
  function submit() {
    const next = interpret(request, knowledge);
    setResult(next);
    setApplied(false);
    setReflection("");
    if (next.intent !== "privacy")
      void onRecord({
        lessonDay: day,
        intent: next.intent,
        knowledgeId: next.knowledgeId,
        actionType: next.action?.type,
      });
  }
  return (
    <div className="card ai">
      <div className="card-heading">
        <h3>
          <Sparkles size={20} />
          Local AI Practice Lab
        </h3>
        <span className="tiny-badge purple">ON DEVICE</span>
      </div>
      <p className="muted small">
        A tiny classroom interpreter. No model downloads, API key, or external
        AI requests.
      </p>
      <label>
        <span className="field-label">
          <strong>What would you like to try?</strong>
        </span>
        <textarea
          aria-label="Ask the local tutor"
          value={request}
          onChange={(e) => {
            setRequest(e.target.value);
            setResult(null);
          }}
          maxLength={600}
        />
      </label>
      <div className="suggestions">
        {[
          "Move right 3 steps",
          "Set gate to AND",
          "Explain loops",
          "Give me a hint",
        ].map((example) => (
          <button
            key={example}
            onClick={() => {
              setRequest(example);
              setResult(null);
            }}
          >
            {example}
          </button>
        ))}
      </div>
      <button className="primary full" onClick={submit}>
        <Sparkles size={16} />
        Understand my request
      </button>
      {result ? (
        <div className="response">
          <span className="eyebrow">
            {result.intent === "action"
              ? "ACTION PREVIEW"
              : "LOCAL KNOWLEDGE RESPONSE"}
          </span>
          <p style={{ whiteSpace: "pre-line" }} role="status">
            {result.message}
          </p>
          {result.action && (
            <button
              className="primary full"
              disabled={busy || applied}
              onClick={() => {
                onAction(result.action!);
                setApplied(true);
                void onRecord({
                  lessonDay: day,
                  intent: "applied",
                  actionType: result.action!.type,
                });
              }}
            >
              {applied ? "Action applied" : "Apply this action"}
            </button>
          )}
          {result.intent === "explain" && (
            <>
              <div className="reflection">
                <button
                  onClick={() => {
                    setReflection(
                      "Explain how this example matches your question. Can you test it?",
                    );
                    void onRecord({
                      lessonDay: day,
                      intent: "reflection",
                      knowledgeId: result.knowledgeId,
                      feedback: "fits",
                    });
                  }}
                >
                  Fits my question
                </button>
                <button
                  onClick={() => {
                    setReflection(
                      "Name what was missing, then make your question more specific.",
                    );
                    void onRecord({
                      lessonDay: day,
                      intent: "reflection",
                      knowledgeId: result.knowledgeId,
                      feedback: "improve",
                    });
                  }}
                >
                  Needs work
                </button>
              </div>
              <p className="small" role="status">
                {reflection}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="response placeholder">
          <span>✧</span>
          <p>
            Ask about a coding idea,
            <br />
            or preview one small action.
          </p>
        </div>
      )}
      <p className="privacy">
        Only supported commands can change the game, after you confirm.
        Knowledge answers come from the course library. Your raw question is not
        saved or sent to AI services.
      </p>
    </div>
  );
}
