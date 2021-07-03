// @flow

import apn from '@parse/node-apn';
import fcmAdmin from 'firebase-admin';

type APNPushProfile = 'apn_config' | 'comm_apn_config';
function getAPNPushProfileForCodeVersion(codeVersion: ?number): APNPushProfile {
  return codeVersion && codeVersion >= 87 ? 'comm_apn_config' : 'apn_config';
}

type FCMPushProfile = 'fcm_config' | 'comm_fcm_config';
function getFCMPushProfileForCodeVersion(codeVersion: ?number): FCMPushProfile {
  return codeVersion && codeVersion >= 87 ? 'comm_fcm_config' : 'fcm_config';
}

const cachedAPNProviders = new Map();
async function getAPNProvider(profile: APNPushProfile) {
  const provider = cachedAPNProviders.get(profile);
  if (provider !== undefined) {
    return provider;
  }
  try {
    // $FlowFixMe
    const apnConfig = await import(`../../secrets/${profile}`);
    if (!cachedAPNProviders.has(profile)) {
      cachedAPNProviders.set(profile, new apn.Provider(apnConfig.default));
    }
  } catch {
    if (!cachedAPNProviders.has(profile)) {
      cachedAPNProviders.set(profile, null);
    }
  }
  return cachedAPNProviders.get(profile);
}

const cachedFCMProviders = new Map();
async function getFCMProvider(profile: FCMPushProfile) {
  const provider = cachedFCMProviders.get(profile);
  if (provider !== undefined) {
    return provider;
  }
  try {
    // $FlowFixMe
    const fcmConfig = await import(`../../secrets/${profile}`);
    if (!cachedFCMProviders.has(profile)) {
      cachedFCMProviders.set(
        profile,
        fcmAdmin.initializeApp(
          {
            credential: fcmAdmin.credential.cert(fcmConfig.default),
          },
          profile,
        ),
      );
    }
  } catch {
    if (!cachedFCMProviders.has(profile)) {
      cachedFCMProviders.set(profile, null);
    }
  }
  return cachedFCMProviders.get(profile);
}

function endFirebase() {
  fcmAdmin.apps?.forEach((app) => app?.delete());
}

function endAPNs() {
  for (const provider of cachedAPNProviders.values()) {
    provider?.shutdown();
  }
}

function getAPNsNotificationTopic(codeVersion: ?number): string {
  return codeVersion && codeVersion >= 87 ? 'app.comm' : 'org.squadcal.app';
}

export {
  getAPNPushProfileForCodeVersion,
  getFCMPushProfileForCodeVersion,
  getAPNProvider,
  getFCMProvider,
  endFirebase,
  endAPNs,
  getAPNsNotificationTopic,
};
