// @flow

import type { AppState } from '../types/redux-types.js';
import { keyserverPrefixID } from '../utils/validation-utils.js';

const cookieSelector: (state: AppState) => ?string = (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverPrefixID]?.cookie ??
  state.cookie;

export { cookieSelector };
