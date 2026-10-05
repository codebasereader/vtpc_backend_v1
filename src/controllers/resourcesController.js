const {
  Leader,
  District,
  City,
  FocusSector,
  EventSector,
  GIProduct,
  Office,
  StaffMember,
  Event,
  Taluk,
  Warehouse,
  Download,
  DownloadCategory,
} = require("../models");
const { makeCrud } = require("./crud");
const { asyncHandler } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");

const leaders = makeCrud(Leader, {
  label: "Leader",
  resource: "leaders",
  sort: { order: 1 },
  fileFields: { photo: "leaders" },
});

// Districts are a fixed list of names (used by the warehouse / taluk pickers). Their export
// figures come from the Market Data releases, so nothing but the name is stored or served here.
const districtView = (doc) => ({ id: doc.slug, name: doc.name });
const districts = {
  list: asyncHandler(async (req, res) => {
    const rows = await District.find().sort({ name: 1 });
    res.json(rows.map(districtView));
  }),
  get: asyncHandler(async (req, res) => {
    const doc = await findByParamOrThrow(District, req.params.id, "slug", "District");
    res.json(districtView(doc));
  }),
};

const cities = makeCrud(City, {
  label: "City",
  resource: "cities",
  slugField: "slug",
  slugFrom: "name",
});

const focusSectors = makeCrud(FocusSector, {
  label: "Focus sector",
  resource: "focusSectors",
  slugField: "slug",
  slugFrom: "name.en",
  sort: { order: 1 },
  fileFields: { image: "focus-sectors" },
});

const eventSectors = makeCrud(EventSector, {
  label: "Event sector",
  resource: "eventSectors",
  slugField: "slug",
  slugFrom: "name.en",
});

const giProducts = makeCrud(GIProduct, {
  label: "GI product",
  resource: "giProducts",
  slugField: "slug",
  slugFrom: "name.en",
  fileFields: { image: "gi-products", video: "gi-videos" },
});

const offices = makeCrud(Office, { label: "Office", resource: "offices" });

const staff = makeCrud(StaffMember, {
  label: "Staff member",
  resourceFrom: (doc) => (doc.group === "governing-council" ? "governingCouncil" : "orgChart"),
  sort: { order: 1 },
  fileFields: { photo: "staff" },
});

const events = makeCrud(Event, {
  label: "Event",
  resource: "events",
  sort: { startDate: 1 },
});

const taluks = makeCrud(Taluk, {
  label: "Taluk",
  resource: "taluks",
  sort: { name: 1 },
});

const warehouses = makeCrud(Warehouse, {
  label: "Warehouse",
  resource: "warehouses",
  sort: { name: 1 },
});

const downloadCategories = makeCrud(DownloadCategory, {
  label: "Download category",
  resource: "downloadCategories",
  sort: { order: 1 },
});

const downloads = makeCrud(Download, {
  label: "Download",
  resource: "downloads",
  sort: { order: 1, uploadedAt: 1 },
  fileFields: { fileUrl: "downloads" },
});

module.exports = {
  leaders,
  districts,
  cities,
  focusSectors,
  eventSectors,
  giProducts,
  offices,
  staff,
  events,
  taluks,
  warehouses,
  downloadCategories,
  downloads,
};
