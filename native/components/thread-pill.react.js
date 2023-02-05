// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers';

import Pill from './pill.react';

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
