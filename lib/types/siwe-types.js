// @flow

import type { LogInExtraInfo } from './account-types.js';
import {
  type DeviceTokenUpdateRequest,
  type PlatformDetails,
} from './device-types';
import { type CalendarQuery } from './entry-types';

export type SIWENonceResponse = {
  +nonce: string,
};

export type SIWEAuthRequest = {
  +message: string,
  +signature: string,
  +calendarQuery?: ?CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +watchedIDs: $ReadOnlyArray<string>,
};

export type SIWEAuthServerCall = {
  +message: string,
  +signature: string,
  ...LogInExtraInfo,
};

// This is a message that the rendered webpage (landing/siwe.react.js) uses to
// communicate back to the React Native WebView that is rendering it
// (native/account/siwe-panel.react.js)
export type SIWEWebViewMessage =
  | {
      +type: 'siwe_success',
      +address: string,
      +message: string,
      +signature: string,
    }
  | {
      +type: 'siwe_closed',
    }
  | {
      +type: 'walletconnect_modal_update',
      +state: 'open' | 'closed',
    };
