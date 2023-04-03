// @flow

import apn from '@parse/node-apn';
import type { Provider as APNProvider } from '@parse/node-apn';
import fcmAdmin from 'firebase-admin';
import type { FirebaseApp } from 'firebase-admin';
import invariant from 'invariant';
import fetch from 'node-fetch';
import webpush from 'web-push';

import type { PlatformDetails } from 'lib/types/device-types';

import { importJSON } from '../utils/import-json.js';

type APNPushProfile = 'apn_config' | 'comm_apn_config';
function getAPNPushProfileForCodeVersion(
  platformDetails: PlatformDetails,
): APNPushProfile {
  if (platformDetails.platform === 'macos') {
    return 'comm_apn_config';
  }
  return platformDetails.codeVersion && platformDetails.codeVersion >= 87
    ? 'comm_apn_config'
    : 'apn_config';
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

function getAPNsNotificationTopic(platformDetails: PlatformDetails): string {
  if (platformDetails.platform === 'macos') {
    return 'app.comm.macos';
  }
  return platformDetails.codeVersion && platformDetails.codeVersion >= 87
    ? 'app.comm'
    : 'org.squadcal.app';
}

type WebPushConfig = { +publicKey: string, +privateKey: string };
let cachedWebPushConfig: ?WebPushConfig = null;
async function getWebPushConfig(): Promise<?WebPushConfig> {
  if (cachedWebPushConfig) {
    return cachedWebPushConfig;
  }
  cachedWebPushConfig = await importJSON<WebPushConfig>({
    folder: 'secrets',
    name: 'web_push_config',
  });
  if (cachedWebPushConfig) {
    webpush.setVapidDetails(
      'mailto:support@comm.app',
      cachedWebPushConfig.publicKey,
      cachedWebPushConfig.privateKey,
    );
  }
  return cachedWebPushConfig;
}

async function ensureWebPushInitialized() {
  if (cachedWebPushConfig) {
    return;
  }
  await getWebPushConfig();
}

type WNSConfig = { +tenantID: string, +appID: string, +secret: string };
type WNSAccessToken = { +token: string, +expires: number };
let wnsAccessToken: ?WNSAccessToken = null;
async function getWNSToken(): Promise<?string> {
  const expiryWindowInMs = 10_000;
  if (
    wnsAccessToken &&
    wnsAccessToken.expires >= Date.now() - expiryWindowInMs
  ) {
    return wnsAccessToken.token;
  }

  const config = await importJSON<WNSConfig>({
    folder: 'secrets',
    name: 'wns_config',
  });

  if (!config) {
    return null;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', config.appID);
  params.append('client_secret', config.secret);
  params.append('scope', 'https://wns.windows.com/.default');

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${config.tenantID}/oauth2/v2.0/token`,
      { method: 'POST', body: params },
    );

    if (!response.ok) {
      console.error('Failure when getting the WNS token: ', response);
      return null;
    }

    const responseJson = await response.json();
    wnsAccessToken = {
      token: responseJson['access_token'],
      expires: Date.now() + responseJson['expires_in'] * 1000,
    };
  } catch (err) {
    console.error('Failure when getting the WNS token: ', err);
    return null;
  }

  return wnsAccessToken?.token;
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
  ensureWebPushInitialized,
  getWNSToken,
};
