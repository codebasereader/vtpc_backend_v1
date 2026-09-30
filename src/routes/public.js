const express = require("express");
const page = require("../controllers/pageController");
const homepage = require("../controllers/homepageController");
const enquiry = require("../controllers/enquiryController");
const contactEnquiry = require("../controllers/contactEnquiryController");
const newsletter = require("../controllers/newsletterController");
const visits = require("../controllers/visitController");
const lastUpdated = require("../controllers/lastUpdatedController");
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
const downloadFile = require("../controllers/downloadFileController");
const { publicWriteLimiter, visitTrackLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/pages/:slug", page.getBySlug);
router.get("/leaders", leaders.list);
router.get("/districts", districts.list);
router.get("/districts/:id", districts.get);
router.get("/cities", cities.list);
router.get("/focus-sectors", focusSectors.list);
router.get("/event-sectors", eventSectors.list);
router.get("/focus-sectors/:id", focusSectors.get);
router.get("/gi-products", giProducts.list);
router.get("/gi-products/:id", giProducts.get);
router.get("/offices", offices.list);
router.get("/staff", staff.list);
router.get("/events", events.list);
router.get("/events/:id", events.get);
router.get("/taluks", taluks.list);
router.get("/warehouses", warehouses.list);
router.get("/download-categories", downloadCategories.list);
router.get("/downloads", downloads.list);
router.get("/downloads/:id/file", downloadFile.sendAttachment);
router.get("/homepage-content", homepage.get);
router.get("/state-exports", market.listStateExports);
router.get("/top-products", market.listTopProducts);
router.get("/country-products", market.listCountryProducts);
router.get("/last-updated", lastUpdated.lastUpdated);
router.get("/visits/summary", visits.summary);

router.post("/enquiries", publicWriteLimiter, enquiry.create);
router.post("/contact-enquiries", publicWriteLimiter, contactEnquiry.create);
router.post("/newsletter/subscribe", publicWriteLimiter, newsletter.subscribe);
router.post("/visits/track", visitTrackLimiter, visits.track);

module.exports = router;
