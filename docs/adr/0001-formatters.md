# ADR-0001: Add a code formatter

<!--
Replace XXXX with the next sequential number.
Use a short, descriptive title.
-->

---

## Status

Proposed

<!--
- Proposed: Draft decision under discussion
- Accepted: Approved and ready to be implemented
- Implemented: Changes made and available in main
- Deprecated: Obsolete, no longer applicable
- Superseded: Replaced by another ADR (reference it)
-->

## History

| Date       | Status   | Notes         |
|------------|----------|---------------|
| 2026-03-03 | Proposed | Initial draft |

<!--
Add new rows on the bottom
Do not delete previous rows
-->

---

## Context

Code formatters enforce commonly agreed upon style across the codebase.

Who is this for:  Developers.
Why is this needed: Formatting the code using common style results in a consistent developer experience, and helps make the code more readable.

Prettier is already installed as a project dependency, but has not yet been configured or added to the ci workflow.

[Prettier on npm](https://www.npmjs.com/package/prettier)

- Download frequency: 77+ million weekly downloads
- Last update: last released a month ago
- License: MIT - [Link to license](https://github.com/prettier/prettier/blob/main/LICENSE)

[prettier-plugin-astro on npm](https://www.npmjs.com/package/prettier-plugin-astro)

- Download frequency: 369,270 weekly downloads
- Last update: 2 years ago
- License: MIT - [link to license](https://github.com/withastro/prettier-plugin-astro/blob/main/LICENSE)

<!--
Describe the topic, background, constraints

Who, what, why
-->

---

## Decision

<!--
Describe what was decided
-->

### Reason

<!--
Expain why this decision was made
-->

---

### Alternatives Considered

#### Biome

- Pros
  - Extremely fast
  - Provides formatting and linting

- Cons
  - Astro support is still experimental
  - May not be widely used in the Astro ecosystem

- Why was it rejected
  - Biome's support for astro is experimental - [Biome language support](https://biomejs.dev/internals/language-support/)

<!--
List alternatives evaluated

Outline for each:
- Pros
- Cons
- Why was it rejected
-->

### Considerations

#### Pros

- Widely used and stable package
- Cleaner, more consistent code style
- Eliminates some inconsistencies across developer styles

<!--
Benefits of the decision.  List each one separately
-->

#### Cons

- Slight decrease in performance as compared to Biome
- Some developer may need have a ramp up to adjust to formatting settings

<!--
Describe any risks, friction points, tradeoffs for this decision.  List each one separaretly
Describe mitigation steps or why the con did not block the decision
-->

---

## Implementation Notes

> [!NOTE]
> This is just for the initial implementation
> Any updates will be documented in PRs

<!--
Notes on implementation details.  This is just needed for the initial ADR.  Updates can be documented in PRs
-->

Proposed initial configuration.  Based in part on [Astro prettier configuration](https://github.com/withastro/astro/blob/main/prettier.config.mjs)

See the full list of options - [Prettier docs - Options](https://prettier.io/docs/options)

see PR #

---

## Future Considerations


<!--
What factors might influence changing this decision in the future
-->

---

## References

<!--
Links to PRs, docs, discussions, benchmarks, related ADRs.
-->