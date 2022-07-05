// @flow

import * as React from 'react';
import { Item, Span, renderEmail } from 'react-html-email';

import ashoat from 'lib/facts/ashoat';
import type { EmailSubscriptionRequest } from 'lib/types/account-types';

import getSendmail from './sendmail';
import Template from './template.react';

async function sendEmailSubscriptionRequestToAshoat(
  request: EmailSubscriptionRequest,
): Promise<void> {
  const title = 'Somebody wants to learn more about Comm!';
  const email = (
    <Template title={title}>
      <Item align="left">
        <Span>{`${request.email} wants to learn more about Comm.`}</Span>
      </Item>
    </Template>
  );
  const html = renderEmail(email);

  const sendmail = await getSendmail();
  await sendmail.sendMail({
    from: 'no-reply@comm.app',
    to: ashoat.landing_email,
    subject: title,
    html,
  });
}

export { sendEmailSubscriptionRequestToAshoat };
