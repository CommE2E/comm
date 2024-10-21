// @flow

import { createHmac } from 'crypto';
import type { $Request } from 'express';

import { type NeynarWebhookCastCreatedEvent } from 'lib/types/farcaster-types.js';
import { neynarWebhookCastCreatedEventValidator } from 'lib/types/validators/farcaster-webhook-validators.js';
import { ServerError } from 'lib/utils/errors.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { getNeynarConfig } from '../utils/neynar-utils.js';

const taggedCommFarcasterInputValidator =
  neynarWebhookCastCreatedEventValidator;
const threadHashTagRegex = /\B#createathread\b/i;

async function verifyNeynarWebhookSignature(
  signature: string,
  event: NeynarWebhookCastCreatedEvent,
): Promise<boolean> {
  const neynarSecret = await getNeynarConfig();
  if (!neynarSecret?.neynarWebhookSecret) {
    throw new ServerError('missing_webhook_secret');
  }

  const hmac = createHmac('sha512', neynarSecret.neynarWebhookSecret);
  hmac.update(JSON.stringify(event));

  return hmac.digest('hex') === signature;
}

async function taggedCommFarcasterResponder(req: $Request): Promise<void> {
  const { body } = req;

  const event = assertWithValidator(body, taggedCommFarcasterInputValidator);

  const { text: eventText } = event.data;
  const foundCreateThreadHashTag = threadHashTagRegex.test(eventText);

  if (!foundCreateThreadHashTag) {
    return;
  }

  const signature = req.header('X-Neynar-Signature');
  if (!signature) {
    throw new ServerError('missing_neynar_signature');
  }

  const isValidSignature = await verifyNeynarWebhookSignature(signature, event);
  if (!isValidSignature) {
    throw new ServerError('invalid_webhook_signature');
  }
}

export { taggedCommFarcasterResponder, taggedCommFarcasterInputValidator };
