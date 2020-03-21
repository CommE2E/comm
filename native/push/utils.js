// @flow

import type { RawMessageInfo } from 'lib/types/message-types';

import { saveMessagesActionType } from 'lib/actions/message-actions';

import { dispatch } from '../redux/redux-setup';

function saveMessageInfos(
  messageInfosString: string,
  updatesCurrentAsOf: number,
) {
  const messageInfos: $ReadOnlyArray<RawMessageInfo> = JSON.parse(
    messageInfosString,
  );
  dispatch({
    type: saveMessagesActionType,
    payload: { rawMessageInfos: messageInfos, updatesCurrentAsOf },
  });
}

export { saveMessageInfos };
