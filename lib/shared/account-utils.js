// @flow

const validUsernameRegex = /^[a-zA-Z0-9-_]+$/;
const validEmailRegex = new RegExp(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
  /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
  /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source
);

export { validUsernameRegex, validEmailRegex }
