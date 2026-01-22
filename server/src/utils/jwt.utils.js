const jwt = require("jsonwebtoken");
const {
  getJwtPrivateKey,
  getJwtPublicKey,
  getRefreshTokenPrivateKey,
  getRefreshTokenPublicKey,
} = require("../config/secrets.config");

const issueJWT = async (data, type, expiresIn = "2d") => {
  const payload = {
    sub: data?._id,
  };

  const privateKey =
    type === "access"
      ? await getJwtPrivateKey()
      : await getRefreshTokenPrivateKey();

  let token = jwt.sign(payload, privateKey, {
    expiresIn,
    algorithm: "RS256",
  });

  return `Bearer ` + token;
};

const verifyToken = async (token, type = "access") => {
  token = token.split(" ")[1];
  const publicKey =
    type === "access"
      ? await getJwtPublicKey()
      : await getRefreshTokenPublicKey();

  return new Promise((resolve, reject) => {
    jwt.verify(token, publicKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (!err) resolve(decoded);
      reject(err);
    });
  });
};

module.exports = { issueJWT, verifyToken };
