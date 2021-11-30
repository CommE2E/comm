// @flow

import type { RawCreateThreadMessageInfo } from '../types/messages/create-thread.js';
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

test('CREATE_THREAD: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawCreateThreadMessageInfo: RawCreateThreadMessageInfo = {
    type: 1,
    threadID: '85466',
    creatorID: '85435',
    time: 1637778853178,
    initialThreadState: {
      type: 6,
      name: null,
      parentThreadID: '1',
      color: '648CAA',
      memberIDs: ['256', '85435'],
    },
    id: '85482',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawCreateThreadMessageInfo),
    ),
  ).toStrictEqual(rawCreateThreadMessageInfo);
});
