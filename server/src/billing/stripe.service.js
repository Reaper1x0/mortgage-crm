const Stripe = require("stripe");
const { envConfig } = require("../config");

let stripeClient = null;

const getStripe = () => {
  if (!envConfig.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(envConfig.STRIPE_SECRET_KEY);
  }
  return stripeClient;
};

const constructWebhookEvent = (payload, signature) => {
  if (!envConfig.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhook secret is not configured.");
  }
  return getStripe().webhooks.constructEvent(payload, signature, envConfig.STRIPE_WEBHOOK_SECRET);
};

module.exports = {
  getStripe,
  constructWebhookEvent,
};
