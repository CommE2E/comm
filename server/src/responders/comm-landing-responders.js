// @flow

import type { $Response, $Request } from 'express';

import { type EmailSubscriptionRequest } from 'lib/types/account-types';
import { ServerError } from 'lib/utils/errors';
import { tShape, tEmail } from 'lib/utils/validation-utils';

import { sendEmailSubscriptionRequestToAshoat } from '../emails/subscribe-email-updates';
import { checkInputValidator } from '../utils/validation-utils';

const emailSubscriptionInputValidator = tShape({
  email: tEmail,
});

async function emailSubscriptionResponder(
  req: $Request,
  res: $Response,
): Promise<void> {
  try {
    if (!req.body || typeof req.body !== 'object') {
      throw new ServerError('invalid_parameters');
    }
    const input: any = req.body;
    checkInputValidator(emailSubscriptionInputValidator, input);
    const subscriptionRequest: EmailSubscriptionRequest = input;
    await sendEmailSubscriptionRequestToAshoat(subscriptionRequest);
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
}

export { emailSubscriptionResponder };
