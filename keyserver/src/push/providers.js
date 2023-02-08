// @flow

import apn from '@parse/node-apn';
import type { Provider as APNProvider } from '@parse/node-apn';
import fcmAdmin from 'firebase-admin';
import type { FirebaseApp } from 'firebase-admin';
import invariant from 'invariant';

import { importJSON } from '../utils/import-json.js';

type APNPushProfile = 'apn_config' | 'comm_apn_config';
function getAPNPushProfileForCodeVersion(codeVersion: ?number): APNPushProfile {
  return codeVersion && codeVersion >= 87 ? 'comm_apn_config' : 'apn_config';
}

type FCMPushProfile = 'fcm_config' | 'comm_fcm_config';
function getFCMPushProfileForCodeVersion(codeVersion: ?number): FCMPushProfile {
  return codeVersion && codeVersion >= 87 ? 'comm_fcm_config' : 'fcm_config';
}

const cachedAPNProviders = new Map();
async function getAPNProvider(profile: APNPushProfile): Promise<?APNProvider> {
  const provider = cachedAPNProviders.get(profile);
  if (provider !== undefined) {
    return provider;
  }
  try {
    const apnConfig = await importJSON({ folder: 'secrets', name: profile });
    invariant(apnConfig, `APN config missing for ${profile}`);
    if (!cachedAPNProviders.has(profile)) {
      cachedAPNProviders.set(profile, new apn.Provider(apnConfig));
    }
  } catch {
    if (!cachedAPNProviders.has(profile)) {
      cachedAPNProviders.set(profile, null);
    }
  }
  return cachedAPNProviders.get(profile);
}

const cachedFCMProviders = new Map();
async function getFCMProvider(profile: FCMPushProfile): Promise<?FirebaseApp> {
  const provider = cachedFCMProviders.get(profile);
  if (provider !== undefined) {
    return provider;
  }
  try {
    const fcmConfig = await importJSON({ folder: 'secrets', name: profile });
    invariant(fcmConfig, `FCM config missed for ${profile}`);
    if (!cachedFCMProviders.has(profile)) {
      cachedFCMProviders.set(
        profile,
        fcmAdmin.initializeApp(
          {
            credential: fcmAdmin.credential.cert(fcmConfig),
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
  fcmAdmin.apps?.forEach(app => app?.delete());
}

function endAPNs() {
  for (const provider of cachedAPNProviders.values()) {
    provider?.shutdown();
  }
}

function getAPNsNotificationTopic(codeVersion: ?number): string {
  return codeVersion && codeVersion >= 87 ? 'app.comm' : 'org.squadcal.app';
}

type WebPushConfig = { +publicKey: string, +privateKey: string };
async function getWebPushConfig(): Promise<?WebPushConfig> {
  return await importJSON<WebPushConfig>({
    folder: 'secrets',
    name: 'web_push_config',
  });
}

export {
  getAPNPushProfileForCodeVersion,
  getFCMPushProfileForCodeVersion,
  getAPNProvider,
  getFCMProvider,
  endFirebase,
  endAPNs,
  getAPNsNotificationTopic,
  getWebPushConfig,
};
