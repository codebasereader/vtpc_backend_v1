const env = require("../config/env");
const { connectDb } = require("../config/db");
const {
  Page,
  Leader,
  District,
  FocusSector,
  GIProduct,
  Office,
  StaffMember,
  Event,
  Download,
  HomepageContent,
  AdminUser,
} = require("../models");
const data = require("./data");

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

async function replaceCollection(Model, rows, uniqueKey) {
  for (const row of rows) {
    const filter = { [uniqueKey]: row[uniqueKey] };
    await Model.findOneAndUpdate(filter, row, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });
  }
  console.log(`${Model.modelName}: upserted ${rows.length}`);
}

async function seed() {
  await connectDb();
  await upsertAdmin();
  await replaceCollection(Page, data.pages, "slug");
  await replaceCollection(Leader, data.leaders, "name");
  await replaceCollection(District, data.districts, "slug");
  await replaceCollection(FocusSector, data.focusSectors, "slug");
  await replaceCollection(GIProduct, data.giProducts, "slug");
  await replaceCollection(Office, data.offices, "city");
  await replaceCollection(StaffMember, data.staff, "name");
  await replaceCollection(Event, data.events, "date");
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

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
