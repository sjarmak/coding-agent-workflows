---
name: writing-voice
summary: Voice, structural, and anti-pattern rules for drafting and editing prose so it reads as written by a thoughtful human practitioner.
description: Voice, structural, and anti-pattern rules for drafting and editing prose: articles, docs, blog posts, READMEs, and longer-form technical writing. Combines a slop guard against telltale AI writing patterns with positive craft defaults (sentence rhythm, declarative heads, concrete openings, pivoting closes). Activate whenever generating or revising prose of more than a few paragraphs.
origin: agentic-coding-practices
scope: universal
---

# Writing voice

This skill encodes the voice, structural defaults, and anti-patterns for
prose intended to read as written by a thoughtful human practitioner.
Activate when drafting or revising any document longer than a few
paragraphs. It supersedes generic defaults where they conflict.

## Voice

The default register is a practitioner writing for peers. The voice is:

- **Direct and declarative.** No throat-clearing. No "let's explore." No
  "in this post we will…"
- **Specific over general.** Numbers, file paths, names, dates, versions
  when they sharpen a point. Specifics beat adjectives every time.
- **Opinionated without being preachy.** The reader is a peer. They get
  to disagree.
- **Comfortable with technical density.** Don't dilute for an imagined
  general audience.
- **Sparing with emphasis.** Italics and bold are reserved for the few
  places they earn their weight. Never ALL CAPS for emphasis.
- **Pronouns.** Use "you" for the reader. First person ("I") is allowed
  sparingly when grounding a claim in personal experience or naming a
  position — target 0–3 instances per piece, never for narration or
  hedging. Editorial "we" ("we now turn to…") is out; community "we"
  ("anyone who has shipped a service has seen this") is fine.
- **Comfortable being austere.** Closing a section without summarizing it
  is fine. The reader just read it.

### Sentence rhythm (load-bearing — easy to get wrong)

The default rhythm is medium: sentences with one or two clauses, the
occasional long sentence carrying an embedded thought through commas,
and short sentences held back as a tool rather than a default.

Wall-to-wall short punchy sentences read as AI-generated even when each
individual sentence is clean. *"Tokens are cheap. So is compute. None of
that fits. Build accordingly."* — that staccato pattern is the single
biggest tell distinguishing AI prose from human prose, regardless of how
good the underlying argument is. Real writers vary sentence length
because thought flows in clauses, not in punches. Use short sentences
the way a guitarist uses a power chord: rarely, at the moment that earns
it, surrounded by passages with more shape.

Long sentences (30–45 words) carrying a single thought through 3–4
commas are baseline, not special. A piece with no sentences over 30
words is reading as too clipped — recheck the rhythm. Rough mix in any
given piece: ~35% of sentences 30+ words carrying the argument, ~50%
medium (12–25 words) supporting, ~15% short (<10 words) as section
pivots or rhythmic landings. The longest reasonable sentence is around
60 words; beyond that, recast.

Specific guidance:
- A paragraph of three short declarative sentences in a row should
  almost always be reshaped — collapse into one long sentence with
  commas or semicolons, or fold two of them together with a connective.
- A list-as-emphasis move (*"Not X. Not Y. Not Z."*) belongs at most
  once per piece. After the first use, restate as a single sentence with
  commas: *"Not X, not Y, not Z."*
- A standalone short sentence after a paragraph's conclusion (*"Build
  accordingly."* / *"Spend wisely."*) doubles down on emphasis the
  paragraph already provided — usually the right move is to fold it
  into the previous sentence or cut it.
- The opening sentences of a section should not all be short. If the
  first three sentences are all under 10 words, the rhythm is wrong.

A useful tonal target: a thoughtful operator's notebook entry, written
after the incident has been fixed and the lessons have settled, but
before they've been polished into corporate prose.

## Structural defaults

### Per piece
- One thesis articulable in plain language. If you can't say it in a
  sentence, the piece doesn't have a thesis yet.
- Cold open with a scene, an artifact, or a number — never with a
  thesis statement or a definition.
- Section heads are declarative claims, not topic labels.
  - Yes: *Agents are unreliable. The work record is durable.*
  - No: *On reliability* / *The reliability problem*
- The last paragraph pivots outward — to a next question, a next move,
  an open problem — rather than summarizing what was just read.

### Per section
- Earn the section in the first sentence. State the claim, name the
  artifact, drop the number.
- Develop in a few short paragraphs. If you need many, the section is
  two sections.
- One named pattern, principle, or framing per section maximum.

### Per paragraph
- 2–4 sentences typical. Single-sentence paragraphs are allowed for
  emphasis; use them rarely.
- Lead with the concrete thing. Generalize after, not before.
- A paragraph that opens with "However" / "Importantly" / "Notably" is
  almost always a paragraph that should open with the next noun phrase.

## Banned moves — the slop guard

These are the patterns that mark prose as AI-generated. Read each line
of a draft and cut every instance. You cannot do this with regex; you
have to read the prose.

### Em dashes
One of the biggest tells. The default register tolerates a few em
dashes carrying asides or apposition, but a draft sprinkled with em
dashes for staccato pivots reads as machine-written. Target ceiling:
roughly one em dash per 800 words; well below that is fine. Replace
with a semicolon, a comma, parentheses, or recast.

### "It's not [just] X, it's Y"
A favorite AI rhetorical move. Recast every instance.

### "Here's the thing" / "Here's why" / "Here's what's interesting"
Cut and start with the thing itself.

### Filler openers
"Certainly!", "Great question!", "Absolutely!", "I'd be happy to
help!", "Sure thing!", "Let's dive in." Remove entirely.

### Filler transitions as paragraph openers
*Furthermore, Moreover, Additionally, Importantly, Notably.* Almost
always replaceable by the next noun phrase.

### Hedging stack-up
*"I think it might be worth considering whether perhaps…"* Be direct.
If you don't know, say so plainly: *"This is not yet settled."*

### Meta-commentary about the writing
*"This post has shown…"* / *"As we've seen…"* / *"What we've
established here is…"* / *"By now, the reader will appreciate…"* The
reader can see what they read. Do not narrate the piece back to them.

### "As an AI" / self-referential AI commentary
Cut all self-referential AI commentary unless the piece is explicitly
about AI behavior in first person, which is rare.

### The "imagine if…" opening
*"Imagine an AI that could refactor your codebase overnight."* /
*"Picture a system where…"* If the piece is grounded in something real,
open with the real thing. If it isn't grounded in something real,
reconsider whether the piece has a point yet.

### The future-of-work / fundamental-shift gesture
*"This is changing how teams operate."* / *"This represents a
fundamental shift in how software is built."* / *"The implications for
the industry are profound."* Simultaneously unfalsifiable and
uninteresting. Cut.

### Hype-adjacent verbs
*leverage, unlock, enable, empower, harness, drive, supercharge,
accelerate, transform, revolutionize, redefine, disrupt.* Replace with
plain verbs: *use, does, runs, allows, makes possible, gives, lets,
makes faster, changes, breaks.* If a sentence reads cleanly without the
hype verb, the hype verb was never doing work.

### Vague impact claims
*"significant productivity gains,"* *"dramatic improvement,"*
*"order-of-magnitude faster,"* *"meaningful results."* Either have a
number or don't have a claim. *"474 commits in 72 hours"* beats *"a
significant burst of activity"* every time.

### Bullet-list-as-argument
A list of "five key principles" / "three benefits" / "the four
patterns" without prose connecting them is decoration, not argument.
Bullets belong where the items are genuinely parallel and short.
Bullets do not belong where prose would do the actual work of
connecting ideas. When in doubt: write the prose first; if a list
emerges, keep it; if adjacent prose would carry it, drop the list.

### Definitional throat-clearing
*"Before we go further, let's define what we mean by an 'agent'…"* /
*"It's worth noting at this point that…"* / *"To be clear, when we say
'X' we mean…"* Use terms without defining them inline and trust the
reader. If a definition is load-bearing, put it in a glossary or
sidebar.

### Forced triads
*"three principles,"* *"three patterns,"* *"three lessons,"* *"three
reasons."* If the underlying material is genuinely three things, fine.
If it's four things shaved down or two things padded out to fit the
triadic rhythm, recast.

### Conclusion-as-summary
A section's last paragraph should pivot, not summarize. The piece's
last paragraph should point to a next question, a next move, or an
open problem. *"In this piece we've explored…"* is the anti-model.

### Gratuitous emoji
Unless the genre intentionally uses emoji for a specific purpose, don't.

### Exclamation points
Default to zero. If one appears, it should be the only one in the
piece, doing work no period can do.

## Positive patterns — what to do

Concrete moves that produce prose reading as human-written.

### Cold open with an artifact, scene, or number
Drop the reader into something concrete before any framing. A real
session, a real number, a real diff, a real moment. The first noun
should be a thing in the world.

### Colon-introducing-elaboration with embedded prose list
The most useful structural device for embedding lists in prose without
using bullets. Rather than turning a 3–4-item argument into bullets,
fold it into one sentence with a colon and commas: *"Real failure on a
production system is almost always a combination: incomplete context,
an undocumented convention, a plausible-but-wrong inference, and a
review pass that didn't catch it."* Use this whenever tempted to bullet
a list of 3–5 items that all support the same claim. Bullets stay
reserved for genuinely parallel items where the prose connector would
not add anything.

### Declarative section heads
*"Agents are unreliable. The work record is durable."* The head is the
claim; the section earns it. Topic-label heads (*"On reliability"*)
make the reader work for the point.

### Specific numbers, names, and receipts inline
Numbers, file paths, version strings, commit SHAs, PR numbers, dates —
these go inline in the prose, not in footnotes. *"3,097 commits over 74
active days,"* *"commit `dc7f26ae`,"* *"PR #1673."* The reader who
wants to verify can; the reader who doesn't can read past it.

### Verbatim excerpts with attribution
Short blocks (≤10 lines) of source material — system-prompt language,
config, code, commit-message text — are allowed verbatim with inline
attribution. Long blocks belong in a sidebar or appendix, not in body
prose.

### Named framings used once
A piece can introduce a named principle or framing, but each one gets
named once, in the section where it's earned. After that, invoke it in
passing as a clause, not a definition. Resist re-explaining a framing
once it's been introduced.

### The pivoting closer
End each section by pointing forward, not back. End the piece by
naming what comes next — a next problem, a next move, an open
question. Not by listing what was just covered.

## Method

You cannot de-slop with regex or a script. You must read each line of
the draft and revise it deliberately. Read passages aloud (mentally is
fine) to catch unnatural phrasing and broken rhythm.

When revising someone else's prose, preserve their idiom where it
diverges from these defaults. These rules describe a default register,
not the only acceptable one. The rules exist to be broken deliberately,
not by accident.

## Self-check before declaring a draft ready

Run through this list. Any "no" → revise.

- [ ] Cold open is a scene, artifact, or number, not a thesis.
- [ ] No "imagine if," no future-of-work gesture, no marketing register.
- [ ] No "this post showed" / "as we've seen" / "what we've established."
- [ ] Section heads are declarative claims, not topic labels.
- [ ] Sentence rhythm: at least one 30+ word sentence per section; no
  run of 3+ short sentences in a row.
- [ ] First-person "I" used 0–3 times, only when grounding personal
  work or naming a position.
- [ ] Em dashes rare; none doing staccato-pivot work.
- [ ] No "it's not just X, it's Y."
- [ ] No "here's the thing" / "here's why."
- [ ] No filler transitions opening paragraphs (Furthermore, Moreover,
  Additionally, Importantly, Notably).
- [ ] No hype verbs (leverage, unlock, enable, harness, supercharge,
  transform, revolutionize).
- [ ] No vague impact claims; numbers where claims are made.
- [ ] At least one colon-introducing-elaboration where a bullet list
  would otherwise appear in body prose.
- [ ] No bullet list standing in for an argument prose would carry.
- [ ] Zero or near-zero exclamation points; zero gratuitous emoji.
- [ ] Closing pivots forward; does not summarize.

---

*Slop-guard catalog adapted from Jeffrey Emanuel's De-Slopifier
(@doodlestein). Craft defaults derived from a corpus of measured-register
technical writing.*
