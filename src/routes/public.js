const express = require("express");
const page = require("../controllers/pageController");
const homepage = require("../controllers/homepageController");
const enquiry = require("../controllers/enquiryController");
const newsletter = require("../controllers/newsletterController");
const {
  leaders,
  districts,
  focusSectors,
  giProducts,
  offices,
  staff,
  events,
  downloads,
} = require("../controllers/resourcesController");
const { publicWriteLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/pages/:slug", page.getBySlug);
router.get("/leaders", leaders.list);
router.get("/districts", districts.list);
router.get("/districts/:id", districts.get);
router.get("/focus-sectors", focusSectors.list);
router.get("/focus-sectors/:id", focusSectors.get);
router.get("/gi-products", giProducts.list);
router.get("/gi-products/:id", giProducts.get);
router.get("/offices", offices.list);
router.get("/staff", staff.list);
router.get("/events", events.list);
router.get("/events/:id", events.get);
router.get("/downloads", downloads.list);
router.get("/homepage-content", homepage.get);

router.post("/enquiries", publicWriteLimiter, enquiry.create);
router.post("/newsletter/subscribe", publicWriteLimiter, newsletter.subscribe);

module.exports = router;
