// @flow

import { isDev } from '../utils/dev-utils.js';

/* Invite Links */
function inviteLinkURL(secret: string): string {
  if (isDev) {
    return `http://localhost:3000/invite/${secret}`;
  }
  return `https://comm.app/invite/${secret}`;
}

/* QR Code */
function qrCodeLinkURL(aes256Param: string, ed25519Param: string): string {
  const keys = {
    aes256: aes256Param,
    ed25519: ed25519Param,
  };
  const keysString = encodeURIComponent(JSON.stringify(keys));
  return `comm://qr-code/${keysString}`;
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
  +data: { +keys: string },
};
export type ParsedDeepLinkData = ParsedInviteLinkData | ParsedQRCodeData | null;

function parseDataFromDeepLink(url: string): ParsedDeepLinkData {
  const inviteLinkSecretRegex = /invite\/(\S+)$/;
  const qrCodeKeysRegex = /qr-code\/(\S+)$/;

  const inviteLinkSecretMatch = inviteLinkSecretRegex.exec(url);
  if (inviteLinkSecretMatch) {
    return {
      type: 'invite-link',
      data: { secret: inviteLinkSecretMatch[1] },
    };
  }

  const qrCodeKeysMatch = qrCodeKeysRegex.exec(url);
  if (qrCodeKeysMatch) {
    return {
      type: 'qr-code',
      data: { keys: qrCodeKeysMatch[1] },
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
