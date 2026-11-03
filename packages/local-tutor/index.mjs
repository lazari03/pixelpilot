import fuzzysort from "fuzzysort";
const NUMBERS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const clarify = () => ({
  intent: "clarify",
  message:
    "Try one request: “move right 3 steps”, “reset robot”, “set gate to AND”, or “explain loops”. I only understand these classroom actions.",
});
/** A bounded intent interpreter, not a generative model. Never evaluates code. */
export function interpret(request, knowledge) {
  if (typeof request !== "string" || request.length > 600) return clarify();
  const text = request
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/@|password|my (name|address|phone)|\b\d{7,}\b/.test(text))
    return {
      intent: "privacy",
      message:
        "Please remove personal details. Use an imaginary character instead. This request will not be saved.",
    };
  if (!text) return clarify();
  if (/\b(don't|dont|do not|never|not move|not reset)\b/.test(text))
    return {
      intent: "clarify",
      message:
        "I will not change anything. Please describe one action you want to try.",
    };
  const command = text.replace(/^(please |can you |could you )/, "");
  if (/^(reset|restart)( the)?( robot| adventure| game)?$/.test(command))
    return {
      intent: "action",
      message: "Reset the robot to the starting square?",
      action: { type: "reset" },
    };
  const move = command.match(
    /^(?:move|go|walk)(?: the robot)? (right|left|up|down)(?: (\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?: (?:steps?|squares?|times))?)?$/,
  );
  if (move) {
    const steps = move[2] ? Number(NUMBERS[move[2]] ?? move[2]) : 1;
    if (!Number.isInteger(steps) || steps < 1 || steps > 10)
      return {
        intent: "clarify",
        message: "Choose between 1 and 10 steps so we can test a small change.",
      };
    return {
      intent: "action",
      message: `Move ${move[1]} ${steps} ${steps === 1 ? "step" : "steps"}?`,
      action: { type: "move", direction: move[1], steps },
    };
  }
  const repeat = command.match(/^repeat (right|left|up|down) (\d+) times$/);
  if (repeat)
    return interpret(`move ${repeat[1]} ${repeat[2]} steps`, knowledge);
  const gate = command.match(
    /^(?:set|change)(?: the)? gate(?: rule)? to (and|or|not)$/,
  );
  if (gate)
    return {
      intent: "action",
      message: `Change the gate rule to ${gate[1].toUpperCase()}?`,
      action: { type: "gate", operator: gate[1].toUpperCase() },
    };
  if (/^(?:give me a |give a |i need a )?hint$/.test(command))
    return {
      intent: "hint",
      message:
        "Trace the route with your finger. Which squares are blocked? Test just one part of your plan first.",
    };
  const query = command
    .replace(
      /^(explain|what is|what are|tell me about|help me understand|how does|how do) /,
      "",
    )
    .replace(/^(an?|the) /, "");
  // Retrieval is only used for knowledge. Fuzzy matches can never execute actions.
  const entries = knowledge.map((k) => ({
    ...k,
    search: [k.title, ...k.keywords].join(" ").toLowerCase(),
  }));
  const spellings = new Set([query]);
  if (query.length >= 5)
    for (let i = 0; i < query.length - 1; i++)
      spellings.add(
        query.slice(0, i) + query[i + 1] + query[i] + query.slice(i + 2),
      );
  const exact = entries.find((k) =>
    [k.title, ...k.keywords].some((term) => spellings.has(term.toLowerCase())),
  );
  const hit =
    exact ??
    (query.length >= 3
      ? fuzzysort.go(query, entries, {
          key: "search",
          limit: 1,
          threshold: 0.65,
        })[0]?.obj
      : undefined);
  if (hit)
    return {
      intent: "explain",
      knowledgeId: hit.id,
      message: `${hit.explanation}\nTry this: ${hit.example}`,
    };
  return clarify();
}
