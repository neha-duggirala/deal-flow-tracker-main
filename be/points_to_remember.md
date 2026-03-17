# What to Avoid
- Opaque autonomy without explicit handoff points.
- Over-engineered planners that add latency to simple tasks.
- Persisting sensitive data without retention policies.
- Overbuilding dynamic tool discovery for a fixed tool set.
- Shipping without evals, monitoring, and rollback plans.
- Granting high-risk permissions by default.

# Recommended Patterns
✅ Human-in-Loop Approval Framework
❌ Spectrum of Control: Blended Initiative
❌ Seamless Background-to-Foreground Handoff
✅ Episodic Memory Retrieval Injection
✅ Filesystem-Based Agent State
❌ Memory Synthesis from Execution Logs
❌ Code-First Tool Interface Pattern
✅ Tool Use Steering via Prompting
❌ Anti-Reward Hacking Grader Design
❌ Egress Lockdown: No Exfiltration Channel
❌ Lethal Trifecta Threat Model
❌ Deterministic Security Scanning Build Loop