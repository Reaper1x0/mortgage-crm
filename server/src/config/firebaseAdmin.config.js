// src/config/firebaseAdmin.js
const admin = require("firebase-admin");
const path = require("path");

let app;

function initFirebaseAdmin() {
  if (app) return app;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const bucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!serviceAccountPath) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!bucket) throw new Error("Missing FIREBASE_STORAGE_BUCKET");

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(path.resolve(serviceAccountPath));

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: bucket,
  });

  return app;
}

function getBucket() {
  initFirebaseAdmin();
  return admin.storage().bucket();
}

module.exports = { initFirebaseAdmin, getBucket };
