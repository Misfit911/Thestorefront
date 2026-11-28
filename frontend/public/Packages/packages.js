
const packages = [
  {
    id: "link",
    kicker: "Starter",
    name: "Link",
    setup: "Free self-setup",
    assistedSetup: "KES 1,000",
    monthly: "KES 799 / month",
    note: "Start selling online",
    features: [
      "Mobile-friendly online store",
      
      "Live product catalogue",
      "Product, stock and order management",
      "Customer checkout with delivery details",
      "Instant order notifications",
      "Up to 30 active products",
      "Up to 5 departments",
      "Shareable shop link",
    ],
  },
  {
    id: "growth",
    kicker: "Growth",
    name: "Growth",
    setup: "Free self-setup",
    assistedSetup: "KES 2,000",
    monthly: "KES 1,999 / month",
    note: "For growing businesses",
    recommended: true,
    features: [
      "Everything in Link",
      "Up to 150 active products",
      "M-Pesa and card payment integration",
      "Customer discounts and member pricing",
      "Email marketing and newsletters",
      "Customer order tracking by email",
      "Enhanced customer communication",
    ],
  },
  {
    id: "custom",
    kicker: "Custom Brand",
    name: "Custom Brand",
    setup: "Setup and onboarding included",
    monthly: "KES 4,499 / month",
    note: "A store configured for your business",
    features: [
      "Everything in Growth",
      "Unlimited active products",
      "Assisted product catalogue upload",
      "Customised storefront design",
      "Tailored business and checkout rules",
      "Advanced delivery fee calculator",
      "Priority customer support",
      "Personalised onboarding",
    ],
  },
];

function renderPackages() {
  const root = document.getElementById("ck-packages");
  if (!root) return;
  root.innerHTML = `<div class="packages">${packages
    .map(
      (plan) => `<button type="button" class="package${plan.recommended ? " is-recommended" : ""}" data-plan="${plan.id}">
        ${plan.recommended ? '<span class="badge">Recommended</span>' : ""}
        <p class="package-kicker">${plan.kicker}</p>
        <h3>${plan.name}</h3>
        <p class="setup">${plan.setup}</p>
        <p class="monthly">${plan.monthly}</p>
        <ul>${plan.features.map((feature) => `<li>${feature}</li>`).join("")}</ul>
        <p class="foot">${plan.note}</p>
      </button>`,
    )
    .join("")}</div>`;
  root.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-plan]").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      window.dispatchEvent(new CustomEvent("tier-selected", { detail: { plan: button.getAttribute("data-plan") } }));
    });
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderPackages);
else renderPackages();
