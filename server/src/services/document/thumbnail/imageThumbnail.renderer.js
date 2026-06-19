const { encodeHeroWebp } = require("./thumbnail.encode.util");

async function renderImageThumbnail(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("renderImageThumbnail: buffer is required");
  }

  return encodeHeroWebp(buffer);
}

module.exports = {
  renderImageThumbnail,
};
