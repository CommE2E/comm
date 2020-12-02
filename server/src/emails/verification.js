// @flow

import { verifyField } from 'lib/types/verify-types';
import React from 'react';
import { Item, Span, A, renderEmail } from 'react-html-email';

import urlFacts from '../../facts/url';
import { createVerificationCode } from '../models/verification';

import sendmail from './sendmail';
import Template from './template.react';

const { baseDomain, basePath } = urlFacts;

async function sendEmailAddressVerificationEmail(
  userID: string,
  username: string,
  emailAddress: string,
  welcome: boolean = false,
): Promise<void> {
  const code = await createVerificationCode(userID, verifyField.EMAIL);
  const link = baseDomain + basePath + `verify/${code}/`;

  let welcomeText = null;
  let action = 'verify your email';
  if (welcome) {
    welcomeText = (
      <Item align="left">
        <Span fontSize={24}>{`Welcome to SquadCal, ${username}! `}</Span>
      </Item>
    );
    action = `complete your registration and ${action}`;
  }

  const title = 'Verify email for SquadCal';
  const email = (
    <Template title={title}>
      {welcomeText}
      <Item align="left">
        <Span>
          {`Please ${action} by clicking this link: `}
          <A href={link}>{link}</A>
        </Span>
      </Item>
    </Template>
  );
  const html = renderEmail(email);

  await sendmail.sendMail({
    from: 'no-reply@squadcal.org',
    to: emailAddress,
    subject: title,
    html,
  });
}

export { sendEmailAddressVerificationEmail };
