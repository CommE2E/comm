// @flow

import nodemailer from 'nodemailer';

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

const sendmail: Transport = nodemailer.createTransport({ sendmail: true });

export default sendmail;
