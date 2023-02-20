// @flow

import {
  HeaderTitle,
  type HeaderTitleInputProps,
} from '@react-navigation/elements';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { firstLine } from 'lib/utils/string-utils.js';

type Props = {
  +threadInfo: ThreadInfo,
  ...HeaderTitleInputProps,
};
function ThreadSettingsHeaderTitle(props: Props): React.Node {
  const { threadInfo, ...rest } = props;
  const { uiName } = useResolvedThreadInfo(threadInfo);
  return <HeaderTitle {...rest}>{firstLine(uiName)}</HeaderTitle>;
}

const MemoizedThreadSettingsHeaderTitle: React.ComponentType<Props> =
  React.memo<Props>(ThreadSettingsHeaderTitle);

export default MemoizedThreadSettingsHeaderTitle;
