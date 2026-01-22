const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const fullName = (value, helpers) => {
  if (!value.match(/^[a-zA-Z ]+$/)) {
    return helpers.message("Name must only contain letters and spaces.");
  }
  return value;
};

const usernameValidator = (value, helpers) => {
  // Allowed: a–z, A–Z, 0–9, underscore, dot
  // Must start with a letter
  // 3–20 chars
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/;

  if (!usernameRegex.test(value)) {
    return helpers.message(
      "Username must start with a letter and contain only letters, numbers, underscores or dots (3–20 chars)."
    );
  }

  return value;
};


module.exports = { objectId, fullName, usernameValidator };
