const path = require("path");
const fs = require("fs/promises");

const getJwtPublicKey = async () =>
  await fs.readFile(path.join(__dirname, "../", "secrets/", "JWT/public.key"));

const getJwtPrivateKey = async () =>
  await fs.readFile(path.join(__dirname, "../", "secrets/", "JWT/private.key"));

const getRefreshTokenPublicKey = async () =>
  await fs.readFile(
    path.join(__dirname, "../", "secrets/", "Refresh-Token/public.key")
  );

const getRefreshTokenPrivateKey = async () =>
  await fs.readFile(
    path.join(__dirname, "../", "secrets/", "Refresh-Token/private.key")
  );

module.exports = {
  getJwtPrivateKey,
  getJwtPublicKey,
  getRefreshTokenPublicKey,
  getRefreshTokenPrivateKey,
};
