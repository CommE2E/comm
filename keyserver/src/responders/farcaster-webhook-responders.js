// @flow

import type { $Request } from 'express';

import { neynarWebhookCastCreatedEventValidator } from 'lib/types/validators/farcaster-webhook-validators.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

const taggedCommFarcasterInputValidator =
  neynarWebhookCastCreatedEventValidator;
const threadHashTagRegex = /\B#createathread\b/i;

async function taggedCommFarcasterResponder(request: $Request): Promise<void> {
  const event = assertWithValidator(
    request.body,
    taggedCommFarcasterInputValidator,
  );

  const { text: eventText } = event.data;
  const foundCreateThreadHashTag = threadHashTagRegex.test(eventText);

  if (!foundCreateThreadHashTag) {
    return;
  }

  console.log(event);
}

export { taggedCommFarcasterResponder, taggedCommFarcasterInputValidator };
