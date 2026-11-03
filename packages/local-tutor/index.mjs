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
export function interpretStructured(prompt, knowledge, locale = "en") {
  const all = [prompt.goal, prompt.context, prompt.rules, prompt.format];
  const invalid = { intent: "clarify", message: "structured" };
  if (all.some((value) => typeof value !== "string" || value.length > 600))
    return invalid;
  if (
    /@|password|fjalëkalim|my name|my address|adresa ime|emri im|\d{7,}/i.test(
      all.join(" "),
    )
  )
    return { intent: "privacy", message: "privacy" };
  if (
    prompt.context.trim().length < 12 ||
    prompt.rules.trim().length < 12 ||
    !["action plan", "plan veprimi"].includes(
      prompt.format.trim().toLowerCase(),
    )
  )
    return invalid;
  const raw = prompt.goal.trim().toLowerCase();
  if (
    !/^(move|go|walk)( the robot)? (right|left|up|down) ([1-9]|10)( steps?)?$/.test(
      raw,
    ) &&
    !/^(lëviz|leviz) (djathtas|majtas|lart|poshtë|poshte) ([1-9]|10)( hapa?)?$/.test(
      raw,
    ) &&
    !/^(reset robot|rifillo robotin)$/.test(raw)
  )
    return invalid;
  if (
    /do not move|never move|mos lëviz|mos leviz/i.test(prompt.rules) &&
    /move|go|walk|lëviz|leviz/.test(raw)
  )
    return invalid;
  const canonical = raw
    .replace(/^(lëviz|leviz) /, "move ")
    .replace(/djathtas/, "right")
    .replace(/majtas/, "left")
    .replace(/lart/, "up")
    .replace(/poshtë|poshte/, "down")
    .replace(/ hapa?$/, " steps")
    .replace(/^rifillo robotin$/, "reset robot")
    .replace(/^vendos portën në /, "set gate to ");
  return interpret(canonical, knowledge);
}
