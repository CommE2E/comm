// @flow

import type { Dispatch } from 'lib/types/redux-types';
import type { RawMessageInfo } from 'lib/types/message-types';

import { saveMessagesActionType } from 'lib/actions/message-actions';

function saveMessageInfos(
  dispatch: Dispatch,
  messageInfosString: string,
  updatesCurrentAsOf: number,
) {
  const messageInfos: $ReadOnlyArray<RawMessageInfo> =
    JSON.parse(messageInfosString);
  dispatch({
    type: saveMessagesActionType,
    payload: { rawMessageInfos: messageInfos, updatesCurrentAsOf },
  });
}

export {
  saveMessageInfos,
};
