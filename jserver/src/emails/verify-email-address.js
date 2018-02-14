// @flow

import type { VerifyField } from 'lib/types/verify-types';

import React from 'react'
import ReactHTML from 'react-html-email';
import crypto from 'crypto';
import bcrypt from 'twin-bcrypt';
import nodemailer from 'nodemailer';

import { verifyField } from 'lib/types/verify-types';

import urlFacts from '../../facts/url';
import { pool, SQL } from '../database';
import createIDs from '../creators/id-creator';

const { Email, Item, Span, A, renderEmail } = ReactHTML;
const sendmail = nodemailer.createTransport({ sendmail: true });
const { baseDomain, basePath } = urlFacts;

async function sendEmailAddressVerificationEmail(
  userID: string,
  username: string,
  emailAddress: string,
  welcome: bool = false,
): Promise<void> {
  const code = await generateVerificationCode(userID, verifyField.EMAIL);
  const link = baseDomain + basePath + `verify/${code}/`;

  let welcomeText = null;
  let action = "verify your email";
  if (welcome) {
    welcomeText = (
      <Item>
        <Span fontSize={24}>
          {`Welcome to SquadCal, ${username}!`}
        </Span>
      </Item>
    );
    action = `complete your registration and ${action}`;
  }

  const title = "Verify email for SquadCal";
  const email = (
    <Email title={title}>
      {welcomeText}
      <Item>
        <Span>
          {`Please ${action} by clicking this link: `}
          <A href={link}>{link}</A>
        </Span>
      </Item>
    </Email>
  );
  const html = renderEmail(email);

  sendmail.sendMail({
    from: "no-reply@squadcal.org",
    to: emailAddress,
    subject: title,
    text: html,
  });
}

async function generateVerificationCode(
  userID: string,
  field: VerifyField,
): Promise<string> {
  const code = crypto.randomBytes(4).toString('hex');
  const hash = bcrypt.hashSync(code);
  const [ id ] = await createIDs("verifications", 1);
  const time = Date.now();
  const row = [id, userID, field, hash, time];
  const query = SQL`
    INSERT INTO verifications(id, user, field, hash, creation_time)
    VALUES ${[row]}
  `;
  await pool.query(query);
  return `${code}${parseInt(id).toString(16)}`;
}

export {
  sendEmailAddressVerificationEmail,
};
