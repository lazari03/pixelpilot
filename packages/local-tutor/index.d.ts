export type Direction = "right" | "left" | "up" | "down";
export type TutorAction =
  | { type: "move"; direction: Direction; steps: number }
  | { type: "reset" }
  | { type: "gate"; operator: "AND" | "OR" | "NOT" };
export interface KnowledgeEntry {
  id: string;
  title: string;
  keywords: string[];
  explanation: string;
  example: string;
}
export interface TutorResult {
  intent: "action" | "explain" | "hint" | "clarify" | "privacy";
  message: string;
  action?: TutorAction;
  knowledgeId?: string;
}
export function interpret(
  request: string,
  knowledge: KnowledgeEntry[],
): TutorResult;
export interface StructuredPrompt {
  goal: string;
  context: string;
  rules: string;
  format: string;
}
export function interpretStructured(
  prompt: StructuredPrompt,
  knowledge: KnowledgeEntry[],
  locale?: "en" | "sq",
): TutorResult;
