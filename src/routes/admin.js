const express = require("express");
const page = require("../controllers/pageController");
const homepage = require("../controllers/homepageController");
const enquiry = require("../controllers/enquiryController");
const newsletter = require("../controllers/newsletterController");
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
  downloads,
} = require("../controllers/resourcesController");
const { requireAuth } = require("../middleware/auth");
const { upload, setUploadFolders } = require("../utils/upload");

const router = express.Router();

router.use(requireAuth);

router.post("/uploads", uploadCtrl.fromQueryFolder, upload.single("file"), uploadCtrl.create);

router.post("/pages", page.create);
router.put("/pages/:id", page.update);
router.delete("/pages/:id", page.remove);

router.post("/leaders", setUploadFolders({ photo: "leaders", file: "leaders" }), upload.any(), leaders.create);
router.put("/leaders/:id", setUploadFolders({ photo: "leaders", file: "leaders" }), upload.any(), leaders.update);
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
  upload.any(),
  focusSectors.create
);
router.put(
  "/focus-sectors/:id",
  setUploadFolders({ image: "focus-sectors", file: "focus-sectors" }),
  upload.any(),
  focusSectors.update
);
router.delete("/focus-sectors/:id", focusSectors.remove);

router.post("/event-sectors", eventSectors.create);
router.put("/event-sectors/:id", eventSectors.update);
router.delete("/event-sectors/:id", eventSectors.remove);

router.post(
  "/gi-products",
  setUploadFolders({ image: "gi-products", video: "gi-videos", file: "gi-products" }),
  upload.any(),
  giProducts.create
);
router.put(
  "/gi-products/:id",
  setUploadFolders({ image: "gi-products", video: "gi-videos", file: "gi-products" }),
  upload.any(),
  giProducts.update
);
router.delete("/gi-products/:id", giProducts.remove);

router.get("/enquiries", enquiry.list);

router.post("/offices", offices.create);
router.put("/offices/:id", offices.update);
router.delete("/offices/:id", offices.remove);

router.post("/staff", setUploadFolders({ photo: "staff", file: "staff" }), upload.any(), staff.create);
router.put("/staff/:id", setUploadFolders({ photo: "staff", file: "staff" }), upload.any(), staff.update);
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

router.post("/downloads", setUploadFolders({ file: "downloads", fileUrl: "downloads" }), upload.any(), downloads.create);
router.put("/downloads/:id", setUploadFolders({ file: "downloads", fileUrl: "downloads" }), upload.any(), downloads.update);
router.delete("/downloads/:id", downloads.remove);

router.put("/homepage-content", homepage.update);

router.get("/newsletter/subscribers", newsletter.list);
router.get("/newsletter/subscribers/export", newsletter.exportCsv);

module.exports = router;
