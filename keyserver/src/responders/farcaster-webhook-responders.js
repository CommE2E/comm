// @flow

import { createHmac } from 'crypto';
import type { $Request } from 'express';

import { neynarWebhookCastCreatedEventValidator } from 'lib/types/validators/farcaster-webhook-validators.js';
import { ServerError } from 'lib/utils/errors.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { getNeynarConfig } from '../utils/fc-cache.js';

const taggedCommFarcasterInputValidator =
  neynarWebhookCastCreatedEventValidator;

async function taggedCommFarcasterResponder(req: $Request): Promise<void> {
  const body = req.body;

  const event = assertWithValidator(body, taggedCommFarcasterInputValidator);

  const sig = req.header('X-Neynar-Signature');
  if (!sig) {
    throw new ServerError('missing_neynar_signature');
  }

  const neynarSecret = await getNeynarConfig();
  if (!neynarSecret?.neynarWebhookSecret) {
    throw new Error('missing_webhook_secret');
  }

  const hmac = createHmac('sha512', neynarSecret.neynarWebhookSecret);
  hmac.update(JSON.stringify(event));

  const generatedSignature = hmac.digest('hex');
  const isValid = generatedSignature === sig;
  if (!isValid) {
    throw new ServerError('invalid_webhook_signature');
  }
}

export { taggedCommFarcasterResponder, taggedCommFarcasterInputValidator };
