## Summary

<one line: what contributions and changes you've made & why>

## Self-check (tick all by filling in 'Y'; If 'N', please explain in note section as reviewer can see what happens.)

- [ ] Volume — small PR, dead code removed
- [ ] Duplication — no new copy-paste ≥6 lines
- [ ] Unit size — each func ≤15 LOC (or justify)
- [ ] Complexity — CC ≤10, nesting ≤3
- [ ] Interfacing — ≤5 params per func (bundle via object/DTO - Data Transfer Object)
- [ ] Coupling — ≤10 imports/module; layering using Barrel OK
- [ ] Entanglement — no import cycles/ layer bypass
- [ ] Independence — no cross-component internals imports and calls

**Notes/Exceptions (optional):** <short notes>

<details>
<summary>What do these checks mean? (quick reference)</summary>

### 1) “This PR nets ≤ ~300 LOC”

- **Meaning:** Aim for ~300 **net** changed lines (adds − deletes), excluding generated files/snapshots/vendor.
- **If it’s a big fix:** Prefer **stacked PRs**. Examples:
  - PR1: pure file renames/moves
  - PR2: mechanical refactors (rename vars, extract funcs)
  - PR3: behavior change
  - PR4: tests & docs  
    If you truly can’t split, mark **Large PR**, add a short _reviewer guide_ (what to read first) and keep commits logically segmented.

### 2) Cyclomatic complexity (CC)

- **What:** Number of independent paths through a function.
- **Rule of thumb:** `CC = 1 + (# of decision points)` where decision points include `if/else if`, `for/while`, `case` labels, `catch`, and complex boolean branches.
- **Example (CC = 3):**
  ```js
  function f(a) {         // start = 1
    if (a > 0) {...}      // +1
    for (let i=0;i<a;i++) // +1
      {...}
  }                       // total 3
  ```

### 3) Barrel and Index File for Centralized Imports/Exports

- **What** "Barrel programming," or the "barrel method," is a technique in JavaScript/TypeScript where an index.js or index.ts file is used to aggregate and re-export components from multiple files within a single directory. This simplifies imports by allowing developers to import multiple components from a single entry point, cleaning up code and making it more readable. However, it can negatively impact build performance because importing a single item from the barrel file may force the bundler to load all modules within it.
- **Rule of thumb:** No more than 10 imports per module.
