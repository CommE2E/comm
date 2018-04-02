// @flow

import React from 'react';
import ReactHTML from 'react-html-email';

import { verifyField } from 'lib/types/verify-types';

import urlFacts from '../../facts/url';
import { createVerificationCode } from '../models/verification';
import sendmail from './sendmail';
import Template from './template.react';

const { Item, Span, A, renderEmail } = ReactHTML;
const { baseDomain, basePath } = urlFacts;

async function sendPasswordResetEmail(
  userID: string,
  username: string,
  emailAddress: string,
): Promise<void> {
  const code = await createVerificationCode(userID, verifyField.RESET_PASSWORD);
  const link = baseDomain + basePath + `verify/${code}/`;

  const title = "Reset password for SquadCal";
  const text =
    "We received a request to reset the password associated with your " +
    `account ${username} on SquadCal. If you did not issue this request, you ` +
    "do not need to do anything, and your password will remain the same. " +
    "However, if you did issue this request, please visit this link to reset " +
    "your password: ";
  const email = (
    <Template title={title}>
      <Item align="left">
        <Span>
          {text}
          <A href={link}>{link}</A>
        </Span>
      </Item>
    </Template>
  );
  const html = renderEmail(email);

  sendmail.sendMail({
    from: "no-reply@squadcal.org",
    to: emailAddress,
    subject: title,
    html,
  });
}

export {
  sendPasswordResetEmail,
};
