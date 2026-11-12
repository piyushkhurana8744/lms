# Static and runtime bypass proofs

Static: Wave 0.7 production scanner passes with zero API/worker bypass occurrences.

Runtime: real Mongo proves both known legacy option spellings throw. Query options still require an allowlist review to detect future renamed mechanisms; static detection is textual and not an AST/data-flow proof.

SYSTEM forged capability tests from Wave 0.7 remain present, but were not rerun as part of the final Wave 0.8 focused command.
