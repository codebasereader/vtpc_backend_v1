const { bilingual } = require("../utils/slug");
const focusSectors = require("../../data/focus-sectors.json");

const PAGE_SLUGS = [
  ["privacy-policies", "Privacy Policy"],
  ["security-policy", "Security Policy"],
  ["copyright-policy", "Copyright Policy"],
  ["hyperlinking-policy", "Hyperlinking Policy"],
  ["terms-conditions", "Terms & Conditions"],
  ["screen-reader-access", "Screen Reader Access"],
  ["help", "Help"],
];

const pages = PAGE_SLUGS.map(([slug, title]) => ({
  slug,
  title: bilingual(title),
  body: bilingual(
    `<h1>${title}</h1><p>Content for ${title} will be published by the VTPC editorial team.</p>`
  ),
}));

const leaders = [
  {
    name: bilingual("Shri Siddaramaiah", "ಶ್ರೀ ಸಿದ್ದರಾಮಯ್ಯ"),
    designation: bilingual("Hon'ble Chief Minister of Karnataka"),
    photo: "/uploads/leaders/cm.jpg",
    order: 1,
  },
  {
    name: bilingual("Shri D.K. Shivakumar", "ಶ್ರೀ ಡಿ.ಕೆ. ಶಿವಕುಮಾರ್"),
    designation: bilingual("Hon'ble Deputy Chief Minister of Karnataka"),
    photo: "/uploads/leaders/dcm.jpg",
    order: 2,
  },
  {
    name: bilingual("Shri M.B. Patil", "ಶ್ರೀ ಎಂ.ಬಿ. ಪಾಟೀಲ"),
    designation: bilingual(
      "Hon'ble Minister for Large & Medium Industries and Infrastructure Development"
    ),
    photo: "/uploads/leaders/minister-lmi.jpg",
    order: 3,
  },
];

const defaultShare = [
  { name: "Rest of world", percentage: 100 },
];

function district(id, name, tagline, extra = {}) {
  return {
    slug: id,
    name,
    tagline: bilingual(tagline),
    totalExportValueCr: extra.totalExportValueCr || 0,
    countries: extra.countries || defaultShare,
    products: extra.products || defaultShare.map((row) => ({ name: "Mixed commodities", percentage: row.percentage })),
    sectors: extra.sectors || [{ name: "Agriculture", percentage: 40 }, { name: "Manufacturing", percentage: 35 }, { name: "Others", percentage: 25 }],
  };
}

const districts = [
  district("bagalkote", "Bagalkote", "Lime and heritage crafts"),
  district("ballari", "Ballari", "Steel and mining belt"),
  district("belagavi", "Belagavi", "Foundry and sugar"),
  district("bengaluru-rural", "Bengaluru Rural", "Peri-urban manufacturing"),
  district("bengaluru-urban", "Bengaluru Urban", "IT and advanced manufacturing", {
    totalExportValueCr: 9800,
    countries: [
      { name: "USA", percentage: 34.2 },
      { name: "Netherlands", percentage: 12.1 },
      { name: "UK", percentage: 9.4 },
    ],
    products: [
      { name: "Software and IT services", percentage: 62.0 },
      { name: "Electronics", percentage: 11.5 },
    ],
    sectors: [
      { name: "IT & ITeS", percentage: 62 },
      { name: "Engineering", percentage: 18 },
      { name: "Others", percentage: 20 },
    ],
  }),
  district("bidar", "Bidar", "Bidriware and pulses"),
  district("chamarajanagar", "Chamarajanagar", "Forest produce and tourism"),
  district("chikkaballapur", "Chikkaballapur", "Sericulture and horticulture"),
  district("chikkamagaluru", "Chikkamagaluru", "Coffee country"),
  district("chitradurga", "Chitradurga", "Wind energy and mining"),
  district("dakshina-kannada", "Dakshina Kannada", "Port-led trade"),
  district("davanagere", "Davanagere", "Textile and education hub"),
  district("dharwad", "Dharwad", "Auto components and education"),
  district("gadag", "Gadag", "Textiles and oilseeds"),
  district("hassan", "Hassan", "Coffee and spices"),
  district("haveri", "Haveri", "Byadgi chilli and by-products"),
  district("kalaburagi", "Kalaburagi", "Tur Bowl of Karnataka", {
    totalExportValueCr: 129.67,
    countries: [
      { name: "Indonesia", percentage: 32.19 },
      { name: "Malaysia", percentage: 18.4 },
      { name: "UAE", percentage: 11.2 },
    ],
    products: [
      { name: "Sugars and Sugar Confectionery", percentage: 22.8 },
      { name: "Pulses", percentage: 19.1 },
    ],
    sectors: [
      { name: "Agriculture", percentage: 25.9 },
      { name: "Food processing", percentage: 21.4 },
      { name: "Others", percentage: 52.7 },
    ],
  }),
  district("kodagu", "Kodagu", "Coffee and honey"),
  district("kolar", "Kolar", "Milk, silk and vegetables"),
  district("koppal", "Koppal", "Iron ore and paddy"),
  district("mandya", "Mandya", "Sugar bowl of Old Mysore"),
  district("mysuru", "Mysuru", "Silk, tourism and industry"),
  district("raichur", "Raichur", "Paddy and power"),
  district("ramanagara", "Ramanagara", "Silk city"),
  district("shivamogga", "Shivamogga", "Arecanut and hydel"),
  district("tumakuru", "Tumakuru", "Engineering and food parks"),
  district("udupi", "Udupi", "Coastal fisheries and cuisine"),
  district("uttara-kannada", "Uttara Kannada", "Karavali trade and spices"),
  district("vijayapura", "Vijayapura", "Grapes and limestone"),
  district("yadgir", "Yadgir", "Paddy and pulses"),
];

const giProducts = [];

const offices = [
  {
    name: "Head Office",
    city: "Bengaluru",
    address: bilingual("Vishwakarma Trade Promotion Centre, Karnataka, Bengaluru"),
    phone: "080-0000-0000",
    email: "info@vtpc.gov.in",
    mapLink: "https://maps.google.com/",
  },
  {
    name: "Regional Office",
    city: "Hubballi",
    address: bilingual("Regional Office, Hubballi, Karnataka"),
    phone: "0836-000-0000",
    email: "hubballi@vtpc.gov.in",
    mapLink: "https://maps.google.com/",
  },
  {
    name: "Regional Office",
    city: "Mysuru",
    address: bilingual("Regional Office, Mysuru, Karnataka"),
    phone: "0821-000-0000",
    email: "mysuru@vtpc.gov.in",
    mapLink: "https://maps.google.com/",
  },
];

const staff = [
  { name: "Chairperson", role: "Chairman", group: "org-chart", order: 1, photo: "/uploads/staff/chairman.jpg" },
  { name: "Managing Director", role: "Managing Director", group: "org-chart", order: 2, photo: "/uploads/staff/md.jpg" },
  { name: "General Manager", role: "General Manager", group: "org-chart", order: 3, photo: "/uploads/staff/gm.jpg" },
  { name: "Council Member 1", role: "Member", group: "governing-council", order: 1, photo: "/uploads/staff/council-1.jpg" },
  { name: "Council Member 2", role: "Member", group: "governing-council", order: 2, photo: "/uploads/staff/council-2.jpg" },
];

const cities = [
  { slug: "bengaluru", name: "Bengaluru", state: "Karnataka", country: "India" },
  { slug: "mysuru", name: "Mysuru", state: "Karnataka", country: "India" },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", country: "India" },
  { slug: "new-delhi", name: "New Delhi", state: "Delhi", country: "India" },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu", country: "India" },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", country: "India" },
  { slug: "kolkata", name: "Kolkata", state: "West Bengal", country: "India" },
  { slug: "nagoya", name: "Nagoya", state: "", country: "Japan" },
  { slug: "milan", name: "Milan", state: "", country: "Italy" },
  { slug: "hannover", name: "Hannover", state: "", country: "Germany" },
  { slug: "shanghai", name: "Shanghai", state: "", country: "China" },
  { slug: "dubai", name: "Dubai", state: "", country: "UAE" },
];

const eventSectors = [
  { slug: "machine-tools-manufacturing", name: bilingual("Machine Tools / Manufacturing") },
  { slug: "food-processing", name: bilingual("Food Processing") },
  { slug: "multi-product", name: bilingual("Multi Product") },
  { slug: "textiles", name: bilingual("Textiles") },
  { slug: "pharmaceuticals", name: bilingual("Pharmaceuticals") },
  { slug: "agriculture", name: bilingual("Agriculture") },
  { slug: "handicrafts-gi", name: bilingual("Handicrafts & GI") },
];

const events = [
  {
    title: bilingual("Karnataka Global Investors Meet – Exporters Clinic"),
    type: "domestic",
    city: "bengaluru",
    sector: "multi-product",
    isDateTBA: false,
    startDate: new Date("2026-11-01T00:00:00.000Z"),
    description: bilingual("One-to-one clinic for first-time exporters covering documentation, finance and market access."),
    registrationLink: "https://forms.gle/example",
  },
  {
    title: bilingual("GI Products Buyer-Seller Meet"),
    type: "domestic",
    city: "mysuru",
    sector: "handicrafts-gi",
    isDateTBA: false,
    startDate: new Date("2026-12-12T00:00:00.000Z"),
    description: bilingual("Showcase of GI-tagged products from Karnataka with domestic and overseas buyers."),
    registrationLink: "",
  },
  {
    title: bilingual("AAHAR Food & Hospitality Expo"),
    type: "domestic",
    city: "new-delhi",
    sector: "food-processing",
    isDateTBA: true,
    tbaYear: 2027,
    description: bilingual("National food and hospitality trade fair. Dates to be announced."),
    registrationLink: "",
  },
  {
    title: bilingual("Hannover Messe – Karnataka Pavilion"),
    type: "international",
    city: "hannover",
    sector: "machine-tools-manufacturing",
    isDateTBA: false,
    startDate: new Date("2026-04-20T00:00:00.000Z"),
    endDate: new Date("2026-04-24T00:00:00.000Z"),
    description: bilingual("State pavilion at Hannover Messe for engineering and manufacturing exporters."),
    registrationLink: "",
  },
];

const downloads = [
  {
    title: bilingual("Industrial Policy 2025-2030"),
    category: "Policy",
    fileUrl: "/uploads/downloads/industrial-policy-2025-2030.pdf",
    uploadedAt: new Date("2025-06-01T00:00:00.000Z"),
  },
  {
    title: bilingual("RTI Manual"),
    category: "RTI",
    fileUrl: "/uploads/downloads/rti-manual.pdf",
    uploadedAt: new Date("2025-04-01T00:00:00.000Z"),
  },
  {
    title: bilingual("Annual Report 2024-25"),
    category: "Report",
    fileUrl: "/uploads/downloads/annual-report-2024-25.pdf",
    uploadedAt: new Date("2025-08-15T00:00:00.000Z"),
  },
  {
    title: bilingual("Exporter Registration Form"),
    category: "Form",
    fileUrl: "/uploads/downloads/exporter-registration-form.pdf",
    uploadedAt: new Date("2025-03-01T00:00:00.000Z"),
  },
];

const homepage = {
  hero: {
    title: "Gateway to Global Markets: Exporters Guide",
    subtitle: "Explore Unlimited Trade Prospects Worldwide",
  },
  highlights: [
    { title: "Diverse Economy", description: "From coffee and silk to pharma, engineering and IT — Karnataka exports across the value chain." },
    { title: "GI Heritage", description: "A rich portfolio of Geographical Indication products ready for global buyers." },
    { title: "District Potential", description: "Export profiles for every district, mapped for investors and first-time exporters." },
  ],
};

module.exports = {
  pages,
  leaders,
  districts,
  cities,
  focusSectors,
  eventSectors,
  giProducts,
  offices,
  staff,
  events,
  downloads,
  homepage,
};
