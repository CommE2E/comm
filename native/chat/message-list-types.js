// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';
import { type UserInfo } from 'lib/types/user-types';

import type { MarkdownRules } from '../markdown/rules.react';
import { useTextMessageRulesFunc } from '../markdown/rules.react';
import { MessageListRouteName } from '../navigation/route-names';

export type MessageListParams = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
  +searching?: boolean,
};

export type MessageListContextType = {
  +getTextMessageMarkdownRules: (useDarkStyle: boolean) => MarkdownRules,
};

const MessageListContext: React.Context<?MessageListContextType> = React.createContext<?MessageListContextType>();

function useMessageListContext(threadID: ?string) {
  const getTextMessageMarkdownRules = useTextMessageRulesFunc(threadID);
  return React.useMemo(
    () => ({
      getTextMessageMarkdownRules,
    }),
    [getTextMessageMarkdownRules],
  );
}

type Props = {
  +children: React.Node,
  +threadID: ?string,
};
function MessageListContextProvider(props: Props): React.Node {
  const context = useMessageListContext(props.threadID);
  return (
    <MessageListContext.Provider value={context}>
      {props.children}
    </MessageListContext.Provider>
  );
}

type NavigateToThreadAction = {
  +name: typeof MessageListRouteName,
  +params: MessageListParams,
  +key: string,
};
function createNavigateToThreadAction(
  params: MessageListParams,
): NavigateToThreadAction {
  return {
    name: MessageListRouteName,
    params,
    key: `${MessageListRouteName}${params.threadInfo.id}`,
  };
}

function useNavigateToThread(): (params: MessageListParams) => void {
  const { navigate } = useNavigation();
  return React.useCallback(
    (params: MessageListParams) => {
      navigate<'MessageList'>(createNavigateToThreadAction(params));
    },
    [navigate],
  );
}

export {
  MessageListContext,
  MessageListContextProvider,
  createNavigateToThreadAction,
  useNavigateToThread,
};
