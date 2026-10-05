const { HttpError } = require("./errors");

const KEY_RE = /^(fy|q[1-4]-fy)-\d{4}-\d{2}$/;

function assertFinite(value, field, { allowNull = false } = {}) {
  if (value == null) {
    if (allowNull) return null;
    throw new HttpError(400, `${field} must be a number`);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpError(400, `${field} must be a finite number`);
  }
  return value;
}

function assertMapKey(name, field) {
  const key = String(name || "");
  if (!key) throw new HttpError(400, `${field} is required`);
  if (key.includes(".") || key.startsWith("$")) {
    throw new HttpError(400, `${field} cannot contain "." or start with "$"`);
  }
  return key;
}

function parseFigure(raw, field) {
  if (!raw || typeof raw !== "object") {
    throw new HttpError(400, `${field} must be an object`);
  }
  return {
    previous: assertFinite(raw.previous, `${field}.previous`, { allowNull: true }),
    current: assertFinite(raw.current, `${field}.current`),
  };
}

function computeSortOrder(key, type) {
  const match = key.match(/^(?:q([1-4])-)?fy-(\d{4})-\d{2}$/);
  const fyStart = Number(match[2]);
  const quarter = match[1] ? Number(match[1]) : 0;
  return fyStart * 10 + (type === "year" ? 0 : quarter);
}

function computeCounts(doc) {
  const sectorNames = new Set([
    ...(doc.sectorStates || []).map((row) => row.sector),
    ...(doc.sectorDistricts || []).map((row) => row.sector),
  ]);
  return {
    districts: (doc.districts || []).length,
    sectors: sectorNames.size,
    states: (doc.states || []).length,
    countryRows: (doc.countryDistricts || []).length,
  };
}

function parseRelease(body, keyParam) {
  const key = String(keyParam || "").toLowerCase();
  if (!KEY_RE.test(key)) {
    throw new HttpError(400, "Invalid period key");
  }
  if (String(body?.key || "").toLowerCase() !== key) {
    throw new HttpError(400, "body.key must match the URL key");
  }

  const type = String(body?.type || "").trim();
  if (type !== "quarter" && type !== "year") {
    throw new HttpError(400, "type must be quarter or year");
  }
  if (key.startsWith("q") && type !== "quarter") {
    throw new HttpError(400, "type must be quarter for a quarterly key");
  }
  if (key.startsWith("fy-") && type !== "year") {
    throw new HttpError(400, "type must be year for an annual key");
  }

  const label = String(body?.label || "").trim();
  const previousLabel = String(body?.previousLabel || "").trim();
  if (!label || !previousLabel) {
    throw new HttpError(400, "label and previousLabel are required");
  }

  if (!Array.isArray(body?.districts) || body.districts.length < 1) {
    throw new HttpError(400, "districts must have at least one row");
  }

  const districtNames = new Set();
  const districts = body.districts.map((row, i) => {
    const name = assertMapKey(row?.name, `districts[${i}].name`);
    if (districtNames.has(name)) {
      throw new HttpError(400, `Duplicate district "${name}"`);
    }
    districtNames.add(name);
    return {
      name,
      previous: assertFinite(row.previous, `districts[${i}].previous`, { allowNull: true }),
      current: assertFinite(row.current, `districts[${i}].current`),
      variation:
        row.variation == null ? null : assertFinite(row.variation, `districts[${i}].variation`),
      majorProducts: String(row.majorProducts || ""),
    };
  });

  const states = Array.isArray(body?.states) ? body.states.map((name, i) => assertMapKey(name, `states[${i}]`)) : [];

  const stateTotals = {};
  if (body?.stateTotals && typeof body.stateTotals === "object" && !Array.isArray(body.stateTotals)) {
    for (const [name, figure] of Object.entries(body.stateTotals)) {
      stateTotals[assertMapKey(name, "stateTotals key")] = parseFigure(figure, `stateTotals.${name}`);
    }
  }

  const sectorStates = Array.isArray(body?.sectorStates)
    ? body.sectorStates.map((row, i) => {
        const values = {};
        const rawValues = row?.values && typeof row.values === "object" ? row.values : {};
        for (const [name, figure] of Object.entries(rawValues)) {
          values[assertMapKey(name, `sectorStates[${i}].values key`)] = parseFigure(
            figure,
            `sectorStates[${i}].values.${name}`
          );
        }
        return {
          sector: String(row?.sector || "").trim() || `Sector ${i + 1}`,
          isServices: Boolean(row?.isServices),
          values,
        };
      })
    : [];

  const sectorDistricts = Array.isArray(body?.sectorDistricts)
    ? body.sectorDistricts.map((row, i) => {
        const values = {};
        const rawValues = row?.values && typeof row.values === "object" ? row.values : {};
        for (const [name, amount] of Object.entries(rawValues)) {
          const district = assertMapKey(name, `sectorDistricts[${i}].values key`);
          if (!districtNames.has(district)) {
            throw new HttpError(400, `sectorDistricts[${i}] refers to unknown district "${district}"`);
          }
          values[district] = assertFinite(amount, `sectorDistricts[${i}].values.${district}`);
        }
        return {
          sector: String(row?.sector || "").trim() || `Sector ${i + 1}`,
          isServices: Boolean(row?.isServices),
          hsCode: String(row?.hsCode || ""),
          total: row?.total == null ? null : assertFinite(row.total, `sectorDistricts[${i}].total`),
          values,
        };
      })
    : [];

  const countryDistricts = Array.isArray(body?.countryDistricts)
    ? body.countryDistricts.map((row, i) => ({
        district: assertMapKey(row?.district, `countryDistricts[${i}].district`),
        country: String(row?.country || "").trim(),
        previous: assertFinite(row?.previous, `countryDistricts[${i}].previous`, { allowNull: true }),
        current: assertFinite(row?.current, `countryDistricts[${i}].current`),
      }))
    : [];

  const totals =
    body?.totals && typeof body.totals === "object"
      ? parseFigure(body.totals, "totals")
      : { previous: null, current: districts.reduce((sum, row) => sum + row.current, 0) };

  const doc = {
    key,
    type,
    label,
    previousLabel,
    sortOrder: computeSortOrder(key, type),
    unit: String(body?.unit || "USD Mn").trim() || "USD Mn",
    source: String(body?.source || "DGCIS, Kolkata").trim() || "DGCIS, Kolkata",
    totals,
    districts,
    states,
    stateTotals,
    sectorStates,
    sectorDistricts,
    countryDistricts,
  };
  doc.counts = computeCounts(doc);
  return doc;
}

function toListItem(doc) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  return {
    key: json.key,
    label: json.label,
    type: json.type,
    previousLabel: json.previousLabel,
    counts: json.counts || computeCounts(json),
    updatedAt: json.updatedAt,
  };
}

module.exports = { KEY_RE, parseRelease, computeSortOrder, computeCounts, toListItem };
