const env = require("../config/env");
const { connectDb } = require("../config/db");
const { toSlug } = require("../utils/slug");
const {
  Page,
  Leader,
  District,
  City,
  FocusSector,
  EventSector,
  GIProduct,
  Office,
  StaffMember,
  Event,
  Download,
  HomepageContent,
  AdminUser,
} = require("../models");
const data = require("./data");
const { importMarketIntelligence } = require("./marketIntelligence");

async function upsertAdmin() {
  const email = env.admin.email.toLowerCase();
  const existing = await AdminUser.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }
  const passwordHash = await AdminUser.hashPassword(env.admin.password);
  await AdminUser.create({
    email,
    name: env.admin.name,
    role: "editor",
    passwordHash,
  });
  console.log(`Created admin ${email}`);
}

function uniqueValue(row, uniqueKey) {
  return uniqueKey.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), row);
}

async function replaceCollection(Model, rows, uniqueKey) {
  if (!rows.length) {
    console.log(`${Model.modelName}: skipped (no seed rows)`);
    return;
  }
  for (const row of rows) {
    const filter = { [uniqueKey]: uniqueValue(row, uniqueKey) };
    await Model.findOneAndUpdate(filter, row, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });
  }
  console.log(`${Model.modelName}: upserted ${rows.length}`);
}

async function migrateLeaderNames() {
  const result = await Leader.collection.updateMany({ name: { $type: "string" } }, [
    { $set: { name: { en: "$name", kn: "" } } },
  ]);
  if (result.modifiedCount) {
    console.log(`Leader: migrated ${result.modifiedCount} string name(s) to { en, kn }`);
  }
}

async function migrateEvents() {
  const legacy = await Event.collection
    .find({ $or: [{ date: { $exists: true } }, { location: { $exists: true } }] })
    .toArray();

  for (const doc of legacy) {
    const $set = {};
    if (!doc.type) $set.type = "domestic";
    if (!doc.sector) $set.sector = "multi-product";
    if (!doc.city) {
      const raw = doc.location && typeof doc.location === "object" ? doc.location.en : doc.location;
      $set.city = raw ? toSlug(raw) : "bengaluru";
    }
    if (doc.isDateTBA !== true && !doc.startDate && doc.date) {
      const parsed = new Date(doc.date);
      if (!Number.isNaN(parsed.getTime())) {
        $set.startDate = parsed;
        $set.isDateTBA = false;
      } else {
        const year = Number(String(doc.date).match(/\d{4}/)?.[0]);
        $set.isDateTBA = true;
        $set.tbaYear = year || new Date().getFullYear();
      }
    }
    await Event.collection.updateOne(
      { _id: doc._id },
      { $set, $unset: { date: "", location: "" } }
    );
  }
  if (legacy.length) {
    console.log(`Event: migrated ${legacy.length} legacy document(s)`);
  }
}

const FOCUS_SECTOR_META = [
  ["pharmaceutical-biotech", 0, "pill"],
  ["electrical-machinery-equipment", 1, "zap"],
  ["ready-made-garments", 2, "shirt"],
  ["automobile", 3, "car"],
  ["organic-chemicals", 4, "flask"],
  ["aerospace", 5, "rocket"],
  ["optical-and-medical", 6, "eye"],
  ["food-products", 7, "wheat"],
];

async function backfillFocusSectorOrderAndIcons() {
  let updated = 0;
  for (const [slug, order, icon] of FOCUS_SECTOR_META) {
    const result = await FocusSector.updateOne({ slug }, { $set: { order, icon } });
    if (result.modifiedCount || result.matchedCount) updated += 1;
  }
  console.log(`FocusSector: backfilled order/icon on ${updated} sector(s)`);
}

async function seed() {
  await connectDb();
  await upsertAdmin();
  await migrateLeaderNames();
  await migrateEvents();
  await replaceCollection(Page, data.pages, "slug");
  await replaceCollection(Leader, data.leaders, "name.en");
  await replaceCollection(District, data.districts, "slug");
  await replaceCollection(City, data.cities, "slug");
  await replaceCollection(FocusSector, data.focusSectors, "slug");
  await backfillFocusSectorOrderAndIcons();
  const removedSectors = await FocusSector.deleteMany({
    slug: { $nin: data.focusSectors.map((row) => row.slug) },
  });
  if (removedSectors.deletedCount) {
    console.log(`FocusSector: removed ${removedSectors.deletedCount} obsolete placeholder(s)`);
  }
  await replaceCollection(EventSector, data.eventSectors, "slug");
  await replaceCollection(GIProduct, data.giProducts, "slug");
  await replaceCollection(Office, data.offices, "city");
  await replaceCollection(StaffMember, data.staff, "name");
  await replaceCollection(Event, data.events, "title.en");
  await replaceCollection(Download, data.downloads, "fileUrl");

  const homepage = await HomepageContent.findOne();
  if (homepage) {
    homepage.hero = data.homepage.hero;
    homepage.highlights = data.homepage.highlights;
    await homepage.save();
    console.log("HomepageContent: updated");
  } else {
    await HomepageContent.create(data.homepage);
    console.log("HomepageContent: created");
  }

  await importMarketIntelligence();

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
