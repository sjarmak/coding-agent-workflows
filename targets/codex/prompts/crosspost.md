# Crosspost

Distribute content across multiple social platforms with platform-native adaptation.

Publishing is an external side effect. Draft and validate each platform's payload before sending it, require the user's explicit instruction before publishing, and use the platform's current API documentation for limits, media rules, permissions, and account eligibility. The platform examples below are guidance, not a current contract.

## When to Activate

- User wants to post content to multiple platforms
- Publishing announcements, launches, or updates across social media
- Repurposing a post from one platform to others
- User says "crosspost", "post everywhere", "share on all platforms", or "distribute this"

## Core Rules

1. Adapt each platform's copy to its audience and format; identical text can be acceptable when the user explicitly requests it.
2. **Primary platform first.** Post to the main platform, then adapt for others.
3. **Respect platform conventions.** Length limits, formatting, link handling all differ.
4. **One idea per post.** If the source content has multiple ideas, split across posts.
5. **Attribution matters.** If crossposting someone else's content, credit the source.

## Platform Specifications

| Platform | Max Length | Link Handling | Hashtags | Media |
|----------|-----------|---------------|----------|-------|
| X | Verify the current account and endpoint limits | Verify link and media handling | Keep focused | Check endpoint support |
| LinkedIn | Verify the current post limit | Verify link previews | Use only when useful | Check current media products |
| Threads | Verify the current post limit | Verify attachment behavior | Usually light | Check current media products |
| Bluesky | Verify the current post limit | Use the API's facet model | Usually light | Check current blob limits |

## Workflow

### Step 1: Create Source Content

Start with the core idea. Use the project's available drafting workflow when one is configured:
- Identify the single core message
- Determine the primary platform (where the audience is biggest)
- Draft the primary platform version first

### Step 2: Identify Target Platforms

Ask the user or determine from context:
- Which platforms to target
- Priority order (primary gets the best version)
- Any platform-specific requirements (e.g., LinkedIn needs professional tone)

### Step 3: Adapt Per Platform

For each target platform, transform the content:

**X adaptation:**
- Open with a hook, not a summary
- Cut to the core insight fast
- Keep links out of main body when possible
- Use thread format for longer content

**LinkedIn adaptation:**
- Strong first line (visible before "see more")
- Short paragraphs with line breaks
- Frame around lessons, results, or professional takeaways
- More explicit context than X (LinkedIn audience needs framing)

**Threads adaptation:**
- Conversational, casual tone
- Shorter than LinkedIn, less compressed than X
- Visual-first if possible

**Bluesky adaptation:**
- Direct and concise (300 char limit)
- Community-oriented tone
- Use feeds/lists for topic targeting instead of hashtags

### Step 4: Post Primary Platform

Post to the primary platform first:
- Use `x-api` skill for X
- Use platform-specific APIs or tools for others
- Capture the post URL for cross-referencing

### Step 5: Post to Secondary Platforms

Post adapted versions to remaining platforms:
- Stagger timing (not all at once — 30-60 min gaps)
- Include cross-platform references where appropriate ("longer thread on X" etc.)

## Content Adaptation Examples

### Source: Product Launch

**X version:**
```
We just shipped [feature].

[One specific thing it does that's impressive]

[Link]
```

**LinkedIn version:**
```
Excited to share: we just launched [feature] at [Company].

Here's why it matters:

[2-3 short paragraphs with context]

[Takeaway for the audience]

[Link]
```

**Threads version:**
```
just shipped something cool — [feature]

[casual explanation of what it does]

link in bio
```

### Source: Technical Insight

**X version:**
```
TIL: [specific technical insight]

[Why it matters in one sentence]
```

**LinkedIn version:**
```
A pattern I've been using that's made a real difference:

[Technical insight with professional framing]

[How it applies to teams/orgs]

#relevantHashtag
```

## API Integration

### Batch Crossposting Service (Example Pattern)
If using a crossposting service (e.g., Postbridge, Buffer, or a custom API), the pattern looks like:

```python
import os
import requests

resp = requests.post(
    "https://your-crosspost-service.example/api/posts",
    headers={"Authorization": f"Bearer {os.environ['POSTBRIDGE_API_KEY']}"},
    json={
        "platforms": ["twitter", "linkedin", "threads"],
        "content": {
            "twitter": {"text": x_version},
            "linkedin": {"text": linkedin_version},
            "threads": {"text": threads_version}
        }
    },
    timeout=30,
)
resp.raise_for_status()
```

### Manual Posting
Without Postbridge, post to each platform using its native API:
- X: Use `x-api` skill patterns
- LinkedIn: LinkedIn API v2 with OAuth 2.0
- Threads: Threads API (Meta)
- Bluesky: AT Protocol API

## Quality Gate

Before posting:
- [ ] Each platform version reads naturally for that platform
- [ ] No identical content across platforms
- [ ] Length limits respected
- [ ] Links work and are placed appropriately
- [ ] Tone matches platform conventions
- [ ] Media is sized correctly for each platform

## Related Skills

- Any configured drafting workflow — Generate platform-native content
- `x-api` — X/Twitter API integration
