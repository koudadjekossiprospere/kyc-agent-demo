# KYC onboarding agent · public demo

A web demo of an AI agent that reviews bank account openings (KYC) under human supervision, on fictional data.

- **Recorded results**: the real answers of Claude Opus 5.5 (26 test cases) and Qwen 3.5 9B (24 cases), scored
  against expected answers fixed before the runs.
- **Live review with your own Claude key**: the key stays in your browser tab's memory and goes only to
  api.anthropic.com. Claude reads the documents you upload; the code checks their machine-readable zone (MRZ).
- **Live review with your own Ollama**: Qwen runs on your computer, nothing leaves it.
- **Editable rules**: change the thresholds, edit, delete or add rules, and see which cases change. Your changes stay
  in your browser. The safeguards are in the code and no rule can switch them off: an approval skips the human only
  if all six checks pass in the code's own results, and any text addressed to the AI escalates the case.

Everything shown is fictional: applicants, documents (marked SPECIMEN) and watchlist entries. Identity verification
by a certified provider (PVID) is simulated. This repository holds only the published page. The agent's source
code, its tests and the recorded results are at https://github.com/koudadjekossiprospere/kyc-onboarding-agent.

---

Démo publique d'un agent d'IA qui examine les ouvertures de compte (KYC) sous supervision humaine, sur des dossiers
fictifs : résultats enregistrés, analyse en direct avec votre propre clé Claude ou votre Ollama, règles modifiables.
Le code source de l'agent est ouvert : https://github.com/koudadjekossiprospere/kyc-onboarding-agent
