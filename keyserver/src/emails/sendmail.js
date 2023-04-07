// @flow

import invariant from 'invariant';
import nodemailer from 'nodemailer';

import { isDev } from 'lib/utils/dev-utils.js';

import { getCommConfig } from '../utils/comm-config.js';

type MailInfo = {
  +from: string,
  +to: string,
  +subject: string,
  +html: string,
  ...
};
type Transport = {
  +sendMail: (info: MailInfo) => Promise<mixed>,
  ...
};

type PostmarkConfig = {
  +apiToken: string,
};

let cachedTransport: ?Transport;
async function getSendmail(): Promise<Transport> {
  if (cachedTransport) {
    return cachedTransport;
  }
  const postmark: ?PostmarkConfig = await getCommConfig({
    folder: 'secrets',
    name: 'postmark',
  });

  if (isDev && !postmark) {
    cachedTransport = nodemailer.createTransport({ sendmail: true });
    return cachedTransport;
  }

  invariant(postmark, 'Postmark config missing');
  cachedTransport = nodemailer.createTransport({
    host: 'smtp.postmarkapp.com',
    port: 587,
    secure: false,
    auth: {
      user: postmark.apiToken,
      pass: postmark.apiToken,
    },
    requireTLS: true,
  });
  return cachedTransport;
}

export default getSendmail;
