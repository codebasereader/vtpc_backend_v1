const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const env = require("./config/env");
const { sessionCookieOptions } = require("./config/session");
const { attachUser } = require("./middleware/auth");
const { notFoundHandler, errorHandler } = require("./utils/errors");
const { ensureUploadDirs } = require("./utils/upload");
const authRoutes = require("./routes/auth");
const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");

function createApp() {
  ensureUploadDirs();

  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", env.trustProxy);
  }

  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );
  app.use(morgan(env.isProd ? "combined" : "dev"));

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  app.use(
    session({
      name: env.cookieName,
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: MongoStore.create({
        mongoUrl: env.mongodbUri,
        collectionName: "sessions",
        ttl: env.sessionDays * 24 * 60 * 60,
      }),
      cookie: sessionCookieOptions(),
    })
  );

  app.use(attachUser);

  app.use(
    "/uploads",
    express.static(env.uploadsDir, {
      maxAge: env.isProd ? "7d" : 0,
      index: false,
    })
  );

  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "vtpc-api" });
  });

  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);
  app.use(publicRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, publicDir: path.resolve(__dirname, "../uploads") };
