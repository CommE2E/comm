// @flow

import { identityDeviceTypes } from '../types/identity-service-types.js';
import { isDev } from '../utils/dev-utils.js';

type DeviceType = $Keys<typeof identityDeviceTypes>;

/* Invite Links */
function inviteLinkURL(secret: string): string {
  if (isDev) {
    return `http://localhost:3000/invite/${secret}`;
  }
  return `https://comm.app/invite/${secret}`;
}

/* QR Code */
function qrCodeLinkURL(
  aes256Param: string,
  ed25519Param: string,
  deviceType: DeviceType,
): string {
  const deviceTypeLower = deviceType.toLowerCase();
  const keys = {
    aes256: aes256Param,
    ed25519: ed25519Param,
  };
  const keysString = encodeURIComponent(JSON.stringify(keys));
  return `comm://qr-code/${deviceTypeLower}/${keysString}`;
}

/* Deep Link Utils */
function parseInstallReferrerFromInviteLinkURL(referrer: string): ?string {
  const referrerRegex = /utm_source=(invite\/(\S+))$/;
  const match = referrerRegex.exec(referrer);
  return match?.[1];
}

type ParsedInviteLinkData = {
  +type: 'invite-link',
  +data: { +secret: string },
};
type ParsedQRCodeData = {
  +type: 'qr-code',
  +data: { +keys: string, +deviceType?: string },
};
export type ParsedDeepLinkData = ParsedInviteLinkData | ParsedQRCodeData | null;

function parseDataFromDeepLink(url: string): ParsedDeepLinkData {
  const inviteLinkSecretRegex = /invite\/(\S+)$/;
  const qrCodeKeysRegex = /qr-code\/(?:([^/]+)\/)?(\S+)$/;

  const inviteLinkSecretMatch = inviteLinkSecretRegex.exec(url);
  if (inviteLinkSecretMatch) {
    return {
      type: 'invite-link',
      data: { secret: inviteLinkSecretMatch[1] },
    };
  }

  const qrCodeKeysMatch = qrCodeKeysRegex.exec(url);
  if (qrCodeKeysMatch) {
    const [, deviceType, keys] = qrCodeKeysMatch;
    return {
      type: 'qr-code',
      data: { keys, ...(deviceType ? { deviceType } : {}) },
    };
  }

  return null;
}

export {
  inviteLinkURL,
  qrCodeLinkURL,
  parseInstallReferrerFromInviteLinkURL,
  parseDataFromDeepLink,
};
