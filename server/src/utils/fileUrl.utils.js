const storageService = require("../services/storage.service");

function toPlainObjectIfNeeded(value) {
  if (
    value &&
    typeof value === "object" &&
    typeof value.toObject === "function" &&
    !Array.isArray(value)
  ) {
    return value.toObject();
  }
  return value;
}

async function getSignedFileUrl(storagePath, expiresInMinutes = 60) {
  if (!storagePath || typeof storagePath !== "string") return null;

  try {
    const signed = await storageService.getSignedUrl(storagePath, expiresInMinutes);
    return signed?.url || null;
  } catch (error) {
    console.error(
      "[fileUrl] Failed to sign storage_path:",
      storagePath,
      error?.message || error
    );
    return null;
  }
}

async function attachSignedUrlsDeep(input, expiresInMinutes = 60, visited = new WeakSet()) {
  const normalizedInput = toPlainObjectIfNeeded(input);

  if (normalizedInput && typeof normalizedInput === "object") {
    if (visited.has(normalizedInput)) return normalizedInput;
    visited.add(normalizedInput);
  }

  if (Array.isArray(normalizedInput)) {
    await Promise.all(
      normalizedInput.map((item, idx) =>
        attachSignedUrlsDeep(item, expiresInMinutes, visited).then((next) => {
          normalizedInput[idx] = next;
        })
      )
    );
    return normalizedInput;
  }

  if (!normalizedInput || typeof normalizedInput !== "object") return normalizedInput;

  if (
    Object.prototype.hasOwnProperty.call(normalizedInput, "storage_path") &&
    typeof normalizedInput.storage_path === "string" &&
    normalizedInput.storage_path.trim()
  ) {
    const signedUrl = await getSignedFileUrl(
      normalizedInput.storage_path,
      expiresInMinutes
    );
    normalizedInput.url = signedUrl;
  }

  const keys = Object.keys(normalizedInput);
  await Promise.all(
    keys.map((key) =>
      attachSignedUrlsDeep(normalizedInput[key], expiresInMinutes, visited).then((next) => {
        normalizedInput[key] = next;
      })
    )
  );

  return normalizedInput;
}

module.exports = { attachSignedUrlsDeep, getSignedFileUrl };

