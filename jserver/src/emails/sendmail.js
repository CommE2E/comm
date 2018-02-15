// @flow

import nodemailer from 'nodemailer';

const sendmail = nodemailer.createTransport({ sendmail: true });

export default sendmail;
