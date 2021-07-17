// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import Pill from './pill.react';

type Props = {
  +threadInfo: ThreadInfo,
  +roundCorners?: { +left: boolean, +right: boolean },
};
function ThreadPill(props: Props): React.Node {
  const { threadInfo, roundCorners } = props;
  return (
    <Pill
      backgroundColor={`#${threadInfo.color}`}
      label={threadInfo.uiName}
      roundCorners={roundCorners}
    />
  );
}

export default ThreadPill;
