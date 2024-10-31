// @flow

import type { $Request } from 'express';

import { neynarWebhookCastCreatedEventValidator } from 'lib/types/validators/farcaster-webhook-validators.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

const taggedCommFarcasterInputValidator =
  neynarWebhookCastCreatedEventValidator;

async function taggedCommFarcasterResponder(request: $Request): Promise<void> {
  const event = assertWithValidator(
    request.body,
    taggedCommFarcasterInputValidator,
  );

  const { text: eventText } = event.data;
  const threadHashTagRegex = /\b#createathread\b/i;
  const foundCreateThreadHashTag = threadHashTagRegex.test(eventText);

  if (!foundCreateThreadHashTag) {
    return;
  }

  console.log(event);
}

export { taggedCommFarcasterResponder, taggedCommFarcasterInputValidator };
