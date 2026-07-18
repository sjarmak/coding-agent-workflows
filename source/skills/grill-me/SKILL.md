---
name: grill-me
description: "Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree one at a time. Use for ambiguous or complex collaborative specs before any code is written."
scope: universal
ported-from: global skill
---

# Grill Me

Interview the user relentlessly about every aspect of this plan until you reach
shared understanding. Walk down each branch of the design tree, resolving
dependencies between decisions one by one. The goal is a spec with no unresolved
forks, not a polite conversation.

- **Ask one question at a time.** A wall of questions gets a wall of shallow
  answers; a single sharp question gets a real decision.
- **Recommend an answer with every question.** Never ask open-endedly — state the
  choice you'd make and why, so the user is reacting to a proposal, not starting
  from a blank page.
- **Prefer the codebase over the user.** If a question can be answered by reading
  the code, read the code instead of asking. Reserve the user's attention for the
  decisions only they can make (intent, priorities, tradeoffs).
- **Follow dependencies in order.** Resolve the decision that unblocks the most
  downstream questions first; don't ask about leaves before the trunk is settled.

Stop when every branch that affects the implementation has a decision behind it.
