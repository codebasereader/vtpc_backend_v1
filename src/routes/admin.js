const express = require("express");
const page = require("../controllers/pageController");
const homepage = require("../controllers/homepageController");
const enquiry = require("../controllers/enquiryController");
const contactEnquiry = require("../controllers/contactEnquiryController");
const forms = require("../controllers/formController");
const newsletter = require("../controllers/newsletterController");
const newsletterIssues = require("../controllers/newsletterIssueController");
const visits = require("../controllers/visitController");
const uploadCtrl = require("../controllers/uploadController");
const roles = require("../controllers/roleController");
const users = require("../controllers/userController");
const audit = require("../controllers/auditController");
const {
  leaders,
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
const marketReleases = require("../controllers/marketReleaseController");
const {
  requireAuth,
  requirePasswordChanged,
  requirePermission,
  requireAnyPermission,
  requireAnyCatalogPermission,
  requireSuperAdmin,
  requireStaffAccess,
} = require("../middleware/auth");
const { ROUTE_PERMISSIONS } = require("../config/permissions");
const {
  upload,
  setUploadFolders,
  optimizeUploadedImages,
  assertNewsletterPdf,
} = require("../utils/upload");

const router = express.Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

for (const [prefix, key] of ROUTE_PERMISSIONS) {
  router.use(prefix, requirePermission(key));
}

router.post(
  "/uploads",
  requireAnyCatalogPermission,
  uploadCtrl.fromQueryFolder,
  upload.single("file"),
  optimizeUploadedImages,
  uploadCtrl.create
);

router.get("/pages", page.list);
router.post("/pages", page.create);
router.put("/pages/:id", page.update);
router.delete("/pages/:id", page.remove);

router.post("/leaders", setUploadFolders({ photo: "leaders", file: "leaders" }), upload.any(), optimizeUploadedImages, leaders.create);
router.put("/leaders/:id", setUploadFolders({ photo: "leaders", file: "leaders" }), upload.any(), optimizeUploadedImages, leaders.update);
router.delete("/leaders/:id", leaders.remove);

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

router.get("/contact-enquiries", contactEnquiry.list);
router.patch("/contact-enquiries/:id", contactEnquiry.updateContacted);

router.get("/forms", forms.listAdmin);
router.post("/forms", forms.create);
router.get("/forms/:id/responses", forms.listResponses);
router.delete("/forms/:id/responses/:responseId", forms.removeResponse);
router.get("/forms/:id", forms.getAdmin);
router.put("/forms/:id", forms.replace);
router.patch("/forms/:id", forms.patchActive);
router.delete("/forms/:id", forms.remove);

router.post("/offices", offices.create);
router.put("/offices/:id", offices.update);
router.delete("/offices/:id", offices.remove);

router.post("/staff", requireStaffAccess, setUploadFolders({ photo: "staff", file: "staff" }), upload.any(), optimizeUploadedImages, staff.create);
router.put("/staff/:id", requireStaffAccess, setUploadFolders({ photo: "staff", file: "staff" }), upload.any(), optimizeUploadedImages, staff.update);
router.delete("/staff/:id", requireStaffAccess, staff.remove);

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

router.get("/newsletter/subscribers", newsletter.list);
router.get("/newsletter/subscribers/export", newsletter.exportCsv);
router.patch("/newsletter/subscribers/:id", newsletter.updateStatus);
router.get(
  "/newsletter/issues",
  requireAnyPermission("newsletterIssues", "newslettersSent"),
  newsletterIssues.list
);
router.post(
  "/newsletter/issues",
  requirePermission("newsletterIssues"),
  setUploadFolders({ attachment: "newsletters" }),
  upload.any(),
  assertNewsletterPdf,
  newsletterIssues.create
);
router.post("/newsletter/issues/:id/send", requirePermission("newsletterIssues"), newsletterIssues.send);
router.delete("/newsletter/issues/:id", requirePermission("newsletterIssues"), newsletterIssues.remove);

router.get("/visits/daily", visits.daily);

router.put("/market-releases/:key", marketReleases.upsert);
router.delete("/market-releases/:key", marketReleases.remove);

router.use(requireSuperAdmin);

router.get("/permissions", roles.listPermissions);
router.get("/roles", roles.list);
router.post("/roles", roles.create);
router.put("/roles/:id/permissions", roles.updatePermissions);
router.put("/roles/:id", roles.update);
router.delete("/roles/:id", roles.remove);

router.get("/users", users.list);
router.post("/users", users.create);
router.put("/users/:id", users.update);
router.patch("/users/:id", users.patchActive);
router.post("/users/:id/reset-password", users.resetPassword);
router.delete("/users/:id", users.remove);

router.get("/audit/logs/export", audit.exportLogs);
router.get("/audit/logs/:id", audit.getLog);
router.get("/audit/logs", audit.listLogs);
router.get("/audit/sessions/:id", audit.getSession);
router.get("/audit/sessions", audit.listSessions);

router.put("/homepage-content", homepage.update);
router.post("/state-exports/bulk-replace", market.replaceStateExports);
router.post("/top-products/bulk-replace", market.replaceTopProducts);
router.post("/country-products/bulk-replace", market.replaceCountryProducts);

module.exports = router;
