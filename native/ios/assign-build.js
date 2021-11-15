// @flow

const fs = require('fs');
const { request } = require('gaxios');
const jwt = require('jsonwebtoken');

const IOS_APP_ID = process.env.IOS_APP_ID;
const GIT_REF = process.env.GITHUB_REF ?? "";
const GIT_TAG = GIT_REF.replace(/^refs\/tags\/v/, "");

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

const getPreReleaseVersions = async (authToken) => {
  if (!IOS_APP_ID) {
    console.log('ERROR: No IOS_APP_ID found in env.');
    process.exit(1);
    return;
  }

  const res = await request({
    url: `https://api.appstoreconnect.apple.com/v1/apps/${IOS_APP_ID}/preReleaseVersions`,
    headers: {
      Authorization: authToken,
    },
  });

  if (res.status !== 200) {
    console.log(
      "ERROR: GET preReleaseVersions from AppStoreConnect API failed."
    );
    process.exit(1);
  }
  return res.data.data;
};

const getCurrentVersionInfo = (preReleaseVersions, currentVersion) => {
  if (!preReleaseVersions) {
    console.log('ERROR: No preReleaseVersions found.');
    process.exit(1);
    return;
  }

  return preReleaseVersions.filter(
    (each) => each.attributes.version === currentVersion
  )[0];
};

const getCurrentVersionID = (currentVersionInfo) => {
  if (!currentVersionInfo || !currentVersionInfo.id) {
    console.log('ERROR: currentVersionID could not be determined.');
    process.exit(1);
    return;
  }
  return currentVersionInfo.id;
};

const getBuildInfoForVersionID = async (authToken, versionID) => {
  if (!versionID) {
    console.log('ERROR: versionID is undefined.');
    process.exit(1);
    return; 
  }

  const res = await request({
    url: `https://api.appstoreconnect.apple.com/v1/preReleaseVersions/${versionID}/relationships/builds`,
    headers: {
      Authorization: authToken,
    },
  });

  if (res.status !== 200) {
    console.log('ERROR: GET currentVersion/builds from AppStoreConnect API failed.');
    process.exit(1);
  }

  return res.data.data[0];
};


async function main() {
  const authToken = getAuthToken();
  const preReleaseVersions = await getPreReleaseVersions(authToken);
  const currentVersionInfo = getCurrentVersionInfo(preReleaseVersions, GIT_TAG);
  const currentVersionID = getCurrentVersionID(currentVersionInfo);
  await getBuildInfoForVersionID(authToken, currentVersionID);
}

main();
