// @flow

import * as React from 'react';

import { BaseEditThreadAvatarProvider } from 'lib/components/base-edit-thread-avatar-provider.react.js';

import { useSelector } from '../redux/redux-utils.js';
import { activeChatThreadItem as activeChatThreadItemSelector } from '../selectors/chat-selectors.js';

type Props = {
  +children: React.Node,
};
function WebEditThreadAvatarProvider(props: Props): React.Node {
  const { children } = props;
  const activeChatThreadItem = useSelector(activeChatThreadItemSelector);
  const activeThreadID = activeChatThreadItem?.threadInfo?.id ?? '';

  return (
    <BaseEditThreadAvatarProvider activeThreadID={activeThreadID}>
      {children}
    </BaseEditThreadAvatarProvider>
  );
}

export default WebEditThreadAvatarProvider;
