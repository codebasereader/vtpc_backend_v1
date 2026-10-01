const PERMISSION_GROUPS = [
  {
    group: "Home Page",
    items: [{ key: "leaders", title: "Leaders" }],
  },
  {
    group: "Events",
    items: [
      { key: "events", title: "Events" },
      { key: "cities", title: "Cities" },
      { key: "eventSectors", title: "Event Sectors" },
    ],
  },
  {
    group: "Organisation",
    items: [
      { key: "offices", title: "Offices" },
      { key: "orgChart", title: "Org Chart" },
      { key: "governingCouncil", title: "Governing Council" },
    ],
  },
  {
    group: "Exporter Corner",
    items: [
      { key: "districts", title: "Districts" },
      { key: "focusSectors", title: "Focus Sectors" },
      { key: "taluks", title: "Taluks" },
      { key: "warehouses", title: "Warehouses" },
      { key: "forms", title: "Forms" },
    ],
  },
  {
    group: "Content & Resources",
    items: [
      { key: "giProducts", title: "GI Products" },
      { key: "giEnquiries", title: "GI Enquiries" },
      { key: "downloadCategories", title: "Download Categories" },
      { key: "downloads", title: "Downloads" },
      { key: "pages", title: "Pages" },
    ],
  },
  {
    group: "Site & Newsletter",
    items: [
      { key: "contactEnquiries", title: "Contact Enquiries" },
      { key: "newsletterSubscribers", title: "Newsletter Subscribers" },
      { key: "newsletterIssues", title: "Send Newsletter" },
      { key: "newslettersSent", title: "Sent Newsletters" },
      { key: "visitorAnalytics", title: "Visitor Analytics" },
    ],
  },
];

const PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key));
const PERMISSION_KEY_SET = new Set(PERMISSION_KEYS);

const ROUTE_PERMISSIONS = [
  ["/leaders", "leaders"],
  ["/districts", "districts"],
  ["/focus-sectors", "focusSectors"],
  ["/events", "events"],
  ["/cities", "cities"],
  ["/event-sectors", "eventSectors"],
  ["/offices", "offices"],
  ["/taluks", "taluks"],
  ["/warehouses", "warehouses"],
  ["/forms", "forms"],
  ["/gi-products", "giProducts"],
  ["/enquiries", "giEnquiries"],
  ["/download-categories", "downloadCategories"],
  ["/downloads", "downloads"],
  ["/pages", "pages"],
  ["/contact-enquiries", "contactEnquiries"],
  ["/newsletter/subscribers", "newsletterSubscribers"],
  ["/visits", "visitorAnalytics"],
];

function isCatalogKey(key) {
  return PERMISSION_KEY_SET.has(key);
}

function staffPermissionForGroup(group) {
  if (group === "org-chart") return "orgChart";
  if (group === "governing-council") return "governingCouncil";
  return null;
}

module.exports = {
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  PERMISSION_KEY_SET,
  ROUTE_PERMISSIONS,
  isCatalogKey,
  staffPermissionForGroup,
};
