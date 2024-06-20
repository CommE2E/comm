// @flow

import { isDev } from '../utils/dev-utils.js';

const config: { defaultURL: string } = {
  defaultURL: isDev
    ? 'http://localhost:50054'
    : 'https://identity.commtechnologies.org:50054',
};

export default config;
