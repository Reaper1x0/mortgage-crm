const sharp = require("sharp");
const {
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WEBP_QUALITY,
} = require("./thumbnail.constants");

/**
 * Normalizes raster input into the hero card WebP thumbnail dimensions.
 */
async function encodeHeroWebp(buffer, { fit = "cover", position = "top" } = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("encodeHeroWebp: buffer is required");
  }

  return sharp(buffer)
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit, position })
    .webp({ quality: THUMBNAIL_WEBP_QUALITY })
    .toBuffer();
}

module.exports = {
  encodeHeroWebp,
};
