// @flow

import type { Media } from '../../types/media-types';
import type {
  RawComposableMessageInfo,
  RawRobotextMessageInfo,
} from '../../types/message-types';

export type MessageSpec<Data, RawInfo> = {|
  +messageContent?: (data: Data) => string | null,
  +rawMessageInfoFromRow?: (
    row: Object,
    params: {|
      +localID: string,
      +media?: $ReadOnlyArray<Media>,
      +derivedMessages: $ReadOnlyMap<
        string,
        RawComposableMessageInfo | RawRobotextMessageInfo,
      >,
    |},
  ) => ?RawInfo,
|};
