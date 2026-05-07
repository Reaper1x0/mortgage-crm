const { EntitlementUsage } = require("../models");

const getMonthlyPeriodKey = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const incrementUsage = async ({ organizationId, metricKey, amount = 1, periodKey = getMonthlyPeriodKey() }) => {
  const usage = await EntitlementUsage.findOneAndUpdate(
    { organization: organizationId, metricKey, periodKey },
    { $inc: { usedCount: amount } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return usage.usedCount;
};

const getUsage = async ({ organizationId, metricKey, periodKey = getMonthlyPeriodKey() }) => {
  const doc = await EntitlementUsage.findOne({ organization: organizationId, metricKey, periodKey }).lean();
  return doc?.usedCount || 0;
};

module.exports = {
  getMonthlyPeriodKey,
  incrementUsage,
  getUsage,
};
