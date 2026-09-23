const {
  Leader,
  District,
  FocusSector,
  GIProduct,
  Office,
  StaffMember,
  Event,
  Download,
} = require("../models");
const { makeCrud } = require("./crud");

const leaders = makeCrud(Leader, {
  label: "Leader",
  sort: { order: 1 },
  fileFields: { photo: "leaders" },
});

const districts = makeCrud(District, {
  label: "District",
  slugField: "slug",
  slugFrom: "name",
});

const focusSectors = makeCrud(FocusSector, {
  label: "Focus sector",
  slugField: "slug",
  slugFrom: "name.en",
  fileFields: { image: "focus-sectors" },
});

const giProducts = makeCrud(GIProduct, {
  label: "GI product",
  slugField: "slug",
  slugFrom: "name.en",
  fileFields: { image: "gi-products", video: "gi-videos" },
});

const offices = makeCrud(Office, { label: "Office" });

const staff = makeCrud(StaffMember, {
  label: "Staff member",
  sort: { order: 1 },
  fileFields: { photo: "staff" },
});

const events = makeCrud(Event, {
  label: "Event",
  sort: { date: 1 },
});

const downloads = makeCrud(Download, {
  label: "Download",
  sort: { uploadedAt: -1 },
  fileFields: { fileUrl: "downloads" },
});

module.exports = {
  leaders,
  districts,
  focusSectors,
  giProducts,
  offices,
  staff,
  events,
  downloads,
};
