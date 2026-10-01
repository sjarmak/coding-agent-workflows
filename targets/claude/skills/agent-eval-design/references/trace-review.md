# Trace review and failure discovery

Use this reference when an evaluation lacks a validated failure taxonomy or a score does not explain product behavior.

Sample for the question being asked. Discovery should include diverse task types, tool paths, outcomes, unusual cases, and random examples; record why each item was selected. Measurement needs a representative probability sample or a documented weighted design. Failure-enriched review counts do not estimate production prevalence.

Preserve stable trace IDs and context. Distinguish agent errors from specification gaps, verifier defects, and infrastructure failures. A final answer can conceal a bad tool call or successful recovery.

Start with a small diverse batch and let a domain expert write concrete observations before forcing categories. Keep agent-suggested groupings separate from confirmed labels. For each confirmed mode retain its definition, expected behavior, legitimate alternatives, trace evidence, rubric version, provenance, disagreements, candidate check, and engineering decision.

Combine observed failures with requirements and anticipated high-consequence cases. Use execution for executable properties, independent references for scientific quantities, and calibrated judges for interpretation. Keep discovered regression cases out of untouched evaluation claims after tuning, and report sampling limitations separately from pass rates.
