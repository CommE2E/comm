// @flow

import { isDev } from '../utils/dev-utils.js';

const config: { defaultURL: string } = {
  defaultURL: isDev
    ? 'https://identity.staging.commtechnologies.org:50054'
    : 'https://identity.commtechnologies.org:50054',
};

export default config;
