// Settings of the public demo, edited by its author. See docs/formulaire-contact.md.
window.KYC_CONFIG = {
  // Optional contact form (Google Forms). Leave null to hide the contact block on the home page.
  // Example: { action: "https://docs.google.com/forms/d/e/<form id>/formResponse", linkedin: "entry.111", email: "entry.222" }
  contactForm: null,
  // Address of the demo's relay (relay/, docs/relais-sans-cle.md), for live reviews without a visitor key.
  // Example: relay: "https://kyc-demo-relay.<your subdomain>.workers.dev",
  relay: "https://kyc-demo-relay.kyc-demo-relay.workers.dev",
  // true once the relay also has a free open model (GROQ_API_KEY), used when the Claude cap is reached.
  relayOpenModel: false,
  // Link to the source code from the footer, if the repository is public. null: "Code source privé".
  source: null,
  author: { name: "Koudadje Kossi Prospere", linkedin: "https://www.linkedin.com/in/prosp%C3%A8re-koudadje" },
};
