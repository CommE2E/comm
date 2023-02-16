// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import { type UserInfo } from 'lib/types/user-types.js';

import type { MarkdownRules } from '../markdown/rules.react.js';
import { useTextMessageRulesFunc } from '../markdown/rules.react.js';
import { MessageListRouteName } from '../navigation/route-names.js';

export type MessageListParams = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
  +searching?: boolean,
};

export type MessageListContextType = {
  +getTextMessageMarkdownRules: (useDarkStyle: boolean) => MarkdownRules,
};

const MessageListContext: React.Context<?MessageListContextType> =
  React.createContext<?MessageListContextType>();

function useMessageListContext(threadInfo: ThreadInfo) {
  const getTextMessageMarkdownRules = useTextMessageRulesFunc(threadInfo);
  return React.useMemo(
    () => ({
      getTextMessageMarkdownRules,
    }),
    [getTextMessageMarkdownRules],
  );
}

type Props = {
  +children: React.Node,
  +threadInfo: ThreadInfo,
};
function MessageListContextProvider(props: Props): React.Node {
  const context = useMessageListContext(props.threadInfo);
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

function useTextMessageMarkdownRules(useDarkStyle: boolean): MarkdownRules {
  const messageListContext = React.useContext(MessageListContext);
  invariant(messageListContext, 'DummyTextNode should have MessageListContext');
  return messageListContext.getTextMessageMarkdownRules(useDarkStyle);
}

export {
  MessageListContextProvider,
  createNavigateToThreadAction,
  useNavigateToThread,
  useTextMessageMarkdownRules,
};
