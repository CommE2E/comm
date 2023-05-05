// @flow

import type { HeaderTitleInputProps } from '@react-navigation/elements';
import { HeaderTitle } from '@react-navigation/elements';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { firstLine } from 'lib/utils/string-utils.js';

type Props = {
  +community: ThreadInfo,
  ...HeaderTitleInputProps,
};
function ViewInviteLinksHeaderTitle(props: Props): React.Node {
  const { community, ...rest } = props;
  const { uiName } = useResolvedThreadInfo(community);
  const title = `Invite people to ${firstLine(uiName)}`;
  return <HeaderTitle {...rest}>{title}</HeaderTitle>;
}

const MemoizedViewInviteLinksHeaderTitle: React.ComponentType<Props> =
  React.memo<Props>(ViewInviteLinksHeaderTitle);

export default MemoizedViewInviteLinksHeaderTitle;
