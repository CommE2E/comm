// @flow

import type { $Response, $Request } from 'express';
import t from 'tcomb';

import { type EmailSubscriptionRequest } from 'lib/types/account-types';
import { ServerError } from 'lib/utils/errors';

import { sendEmailSubscriptionRequestToAshoat } from '../emails/subscribe-email-updates';
import { checkInputValidator, tShape } from '../utils/validation-utils';

const emailSubscriptionInputValidator = tShape({
  email: t.String,
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
