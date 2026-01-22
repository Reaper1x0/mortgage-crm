const Joi = require("joi");
const { R4XX } = require("../Responses");
const { pick } = require("../utils");

const validate = (schema) => (req, res, next) => {
  const validSchema = pick(schema, ["params", "query", "body"]);
  const object = pick(req, Object.keys(validSchema));
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: "key" }, abortEarly: true })
    .validate(object);

  if (error) {
    const errorMessage = error.details
      .map((details) => details.message)
      .join(", ");
    return R4XX(res, 403, "Some error in request validation", { errorMessage });
  }
  Object.assign(req, value);
  return next();
};

module.exports = validate;
