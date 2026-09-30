const express = require("express");
const page = require("../controllers/pageController");
const homepage = require("../controllers/homepageController");
const enquiry = require("../controllers/enquiryController");
const newsletter = require("../controllers/newsletterController");
const newsletterIssues = require("../controllers/newsletterIssueController");
const visits = require("../controllers/visitController");
const uploadCtrl = require("../controllers/uploadController");
const {
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
} = require("../controllers/resourcesController");
const market = require("../controllers/marketIntelligenceController");
const { requireAuth } = require("../middleware/auth");
const {
  upload,
  setUploadFolders,
  optimizeUploadedImages,
  assertNewsletterPdf,
} = require("../utils/upload");

const router = express.Router();

router.use(requireAuth);

router.post("/uploads", uploadCtrl.fromQueryFolder, upload.single("file"), optimizeUploadedImages, uploadCtrl.create);

router.get("/pages", page.list);
router.post("/pages", page.create);
router.put("/pages/:id", page.update);
router.delete("/pages/:id", page.remove);

router.post("/leaders", setUploadFolders({ photo: "leaders", file: "leaders" }), upload.any(), optimizeUploadedImages, leaders.create);
router.put("/leaders/:id", setUploadFolders({ photo: "leaders", file: "leaders" }), upload.any(), optimizeUploadedImages, leaders.update);
router.delete("/leaders/:id", leaders.remove);

router.post("/districts", districts.create);
router.put("/districts/:id", districts.update);
router.delete("/districts/:id", districts.remove);

router.post("/cities", cities.create);
router.put("/cities/:id", cities.update);
router.delete("/cities/:id", cities.remove);

router.post(
  "/focus-sectors",
  setUploadFolders({ image: "focus-sectors", file: "focus-sectors" }),
  upload.any(), optimizeUploadedImages,
  focusSectors.create
);
router.put(
  "/focus-sectors/:id",
  setUploadFolders({ image: "focus-sectors", file: "focus-sectors" }),
  upload.any(), optimizeUploadedImages,
  focusSectors.update
);
router.delete("/focus-sectors/:id", focusSectors.remove);

router.post("/event-sectors", eventSectors.create);
router.put("/event-sectors/:id", eventSectors.update);
router.delete("/event-sectors/:id", eventSectors.remove);

router.post(
  "/gi-products",
  setUploadFolders({ image: "gi-products", video: "gi-videos", file: "gi-products" }),
  upload.any(), optimizeUploadedImages,
  giProducts.create
);
router.put(
  "/gi-products/:id",
  setUploadFolders({ image: "gi-products", video: "gi-videos", file: "gi-products" }),
  upload.any(), optimizeUploadedImages,
  giProducts.update
);
router.delete("/gi-products/:id", giProducts.remove);

router.get("/enquiries", enquiry.list);
router.patch("/enquiries/:id", enquiry.updateContacted);

router.post("/offices", offices.create);
router.put("/offices/:id", offices.update);
router.delete("/offices/:id", offices.remove);

router.post("/staff", setUploadFolders({ photo: "staff", file: "staff" }), upload.any(), optimizeUploadedImages, staff.create);
router.put("/staff/:id", setUploadFolders({ photo: "staff", file: "staff" }), upload.any(), optimizeUploadedImages, staff.update);
router.delete("/staff/:id", staff.remove);

router.post("/events", events.create);
router.put("/events/:id", events.update);
router.delete("/events/:id", events.remove);

router.post("/taluks", taluks.create);
router.put("/taluks/:id", taluks.update);
router.delete("/taluks/:id", taluks.remove);

router.post("/warehouses", warehouses.create);
router.put("/warehouses/:id", warehouses.update);
router.delete("/warehouses/:id", warehouses.remove);

router.post("/download-categories", downloadCategories.create);
router.put("/download-categories/:id", downloadCategories.update);
router.delete("/download-categories/:id", downloadCategories.remove);

router.post("/downloads", setUploadFolders({ file: "downloads", fileUrl: "downloads" }), upload.any(), optimizeUploadedImages, downloads.create);
router.put("/downloads/:id", setUploadFolders({ file: "downloads", fileUrl: "downloads" }), upload.any(), optimizeUploadedImages, downloads.update);
router.delete("/downloads/:id", downloads.remove);

router.put("/homepage-content", homepage.update);

router.get("/newsletter/subscribers", newsletter.list);
router.get("/newsletter/subscribers/export", newsletter.exportCsv);
router.patch("/newsletter/subscribers/:id", newsletter.updateStatus);
router.get("/newsletter/issues", newsletterIssues.list);
router.post(
  "/newsletter/issues",
  setUploadFolders({ attachment: "newsletters" }),
  upload.any(),
  assertNewsletterPdf,
  newsletterIssues.create
);
router.post("/newsletter/issues/:id/send", newsletterIssues.send);
router.delete("/newsletter/issues/:id", newsletterIssues.remove);

router.get("/visits/daily", visits.daily);

router.post("/state-exports/bulk-replace", market.replaceStateExports);
router.post("/top-products/bulk-replace", market.replaceTopProducts);
router.post("/country-products/bulk-replace", market.replaceCountryProducts);

module.exports = router;
