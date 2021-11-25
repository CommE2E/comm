// @flow

import type { RawTextMessageInfo } from '../types/messages/text';
import {
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBMessageInfoToRawMessageInfo,
} from './message-ops-utils';

test('TEXT: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawTextMessageInfo: RawTextMessageInfo = {
    type: 0,
    localID: 'local7',
    threadID: '85466',
    text: 'Hello world',
    creatorID: '85435',
    time: 1637788332565,
    id: '85551',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawTextMessageInfo),
    ),
  ).toStrictEqual(rawTextMessageInfo);
});
