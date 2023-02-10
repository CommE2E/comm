// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import Pill from './pill.react.js';

type Props = {
  +threadInfo: ThreadInfo,
  +roundCorners?: { +left: boolean, +right: boolean },
  +fontSize?: number,
};
function ThreadPill(props: Props): React.Node {
  const { threadInfo, roundCorners, fontSize } = props;
  const { uiName } = useResolvedThreadInfo(threadInfo);
  return (
    <Pill
      backgroundColor={`#${threadInfo.color}`}
      label={uiName}
      roundCorners={roundCorners}
      fontSize={fontSize}
    />
  );
}

export default ThreadPill;
