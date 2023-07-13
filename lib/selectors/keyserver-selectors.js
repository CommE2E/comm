// @flow

import type { AppState } from '../types/redux-types.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

const cookieSelector: (state: AppState) => ?string = (state: AppState) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.cookie ??
  state.cookie;

export { cookieSelector };
