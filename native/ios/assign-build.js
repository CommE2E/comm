// @flow

const fs = require('fs');
const jwt = require('jsonwebtoken');

const getAuthToken = () => {
  const p8 = fs.readFileSync('./AUTH_KEY.p8');
  const apiKeyID = process.env.AUTH_KEY_ID;
  const issuerID = process.env.AUTH_KEY_ISSUER_ID;

  if (!p8 || !apiKeyID || !issuerID) {
    console.log('ERROR: credentials needed to generate authToken not found.');
    process.exit(1);
  }

  const jwtPayload = {
    iss: issuerID,
    exp: Math.round(Date.now() / 1000) + 60,
    aud: "appstoreconnect-v1",
  };

  const jwtSigningConfig = {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: apiKeyID,
      typ: "JWT"
    }
  };

  return jwt.sign(jwtPayload, p8, jwtSigningConfig);
};

async function main() {
  getAuthToken();
}

main();
