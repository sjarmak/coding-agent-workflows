---
name: theory-of-mind-agents
description: "Conceptual foundations for Theory of Mind in AI agents — belief modeling, user models, intent inference, recursive reasoning, planning under uncertainty about people, preference learning, and explainable personalization. Use when designing or reviewing systems that model users' beliefs, goals, and preferences, deciding how an agent should resolve ambiguity about intent, or evaluating personalization. NOT for cognitive-science exposition, generic UX copy, or agent memory storage mechanics."
---

# Theory of Mind for AI Agents

Theory of Mind is the discipline of acting well under **uncertainty about
minds**: what the user knows, wants, and expects. The engineering object is a
user model — explicit, confidence-weighted, inspectable — not vibes absorbed
into a prompt.

## The user model is first-class state

Model at least four layers, kept separate:

- **Goals** — what they are trying to achieve (task-level and standing).
- **Beliefs** — what they think is true, including about the system; false
  beliefs are the interesting ones, because they predict surprise.
- **Preferences** — how they want things done (style, autonomy, risk).
- **Expertise** — what can be assumed vs must be explained.

Every entry carries **evidence and confidence**. Distinguish observed
(they said it), inferred (pattern across sessions), and default (population
prior). Confusing these tiers is how personalization becomes presumption.

## Intent inference — the utterance is evidence, not the intent

Requests are compressed, context-dependent renderings of goals. Infer the goal
behind the words, then check the inference:

- When interpretations diverge materially, the choice is ask vs assume. Decide
  by **cost asymmetry**: assume when wrong-guess cost is low and reversible;
  ask when it is high, irreversible, or outward-facing.
- An inferred intent that contradicts the literal instruction never silently
  wins — surface the conflict.
- Ambiguity resolved this session is evidence for next session; that is the
  preference-learning write path.

## Recursive modeling — beliefs about beliefs

Second-order state does real work: what does the user believe the agent knows,
and what does the user expect to happen next? Mismatches here produce the
worst interaction failures — the agent acting on context the user forgot it
has, or the user assuming context the agent lacks. Detect expectation
violations and repair explicitly (say what you know, ask what you're missing)
rather than plowing ahead.

## Preference learning — an evidence hierarchy, not a ratchet

Explicit correction ⟩ repeated observed pattern ⟩ single observation ⟩
population default. Rules:

- Corrections are gold: high weight, slow decay, and they override inferred
  patterns immediately.
- Preferences are contextual — terse in code review, expansive in research
  discussion — so store scope with the preference.
- Preferences drift; contradiction with newer evidence triggers re-inference,
  not coexistence.
- **Adapt style, not substance**: personalization shapes how things are
  communicated and defaults chosen. It never overrides an explicit current
  instruction and never trims correctness or safety.

## Planning under user uncertainty

Treat uncertain preferences like uncertain world state: act on high-confidence
entries, hedge on low-confidence ones, and spend a question only when its
value-of-information beats the interruption cost. Batch low-stakes
assumptions and surface them for cheap correction ("I assumed X and Y")
instead of asking serially.

## Simulation and evaluation

Personalization untested against varied users is overfitting to one anecdote.

- Test against simulated user profiles (expert/novice, terse/verbose,
  trusting/skeptical) and measure behavioral differences you intended — and
  the ones you didn't.
- Evaluate outcomes, not model richness: does the user model measurably reduce
  clarification rounds, corrections, and abandoned turns vs a generic agent?
- Probe failure modes directly: stereotyping from thin evidence, stale
  preferences surviving contradiction, personalization leaking across users
  or contexts.

## Explainability — a user model the user can't see is surveillance

The model must be **inspectable** (show what is believed and why, with
evidence), **correctable** (the user can edit or veto entries), and
**forgettable** (deletion on request, and provable). Legibility is not a
compliance feature; it is what makes users willing to be modeled at all.

## Output

1. **User-model schema** — layers, evidence tiers, confidence, scope.
2. **Inference policy** — ask-vs-assume thresholds tied to cost asymmetry.
3. **Learning policy** — evidence hierarchy, decay, contradiction handling.
4. **Evaluation plan** — simulated-user coverage plus outcome metrics against
   a no-ToM baseline.
5. **Legibility surface** — how users inspect, correct, and erase the model.
