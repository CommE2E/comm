// @flow

import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

const authoritativeKeyserverID: string =
  process.env.AUTHORITATIVE_KEYSERVER_ID ?? ashoatKeyserverID;

export { authoritativeKeyserverID };
