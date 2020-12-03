// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { type UserInfo, userInfoPropType } from 'lib/types/user-types';

import type { MarkdownRules } from '../markdown/rules.react';
import { useTextMessageRulesFunc } from '../markdown/rules.react';

export type MessageListParams = {|
  threadInfo: ThreadInfo,
  pendingPersonalThreadUserInfo?: UserInfo,
|};

const messageListRoutePropType = PropTypes.shape({
  key: PropTypes.string.isRequired,
  params: PropTypes.shape({
    threadInfo: threadInfoPropType.isRequired,
    pendingPersonalThreadUserInfo: userInfoPropType,
  }).isRequired,
});

const messageListNavPropType = PropTypes.shape({
  navigate: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
  setOptions: PropTypes.func.isRequired,
  dangerouslyGetParent: PropTypes.func.isRequired,
  isFocused: PropTypes.func.isRequired,
  popToTop: PropTypes.func.isRequired,
});

export type MessageListContextType = {|
  +getTextMessageMarkdownRules: (useDarkStyle: boolean) => MarkdownRules,
|};

const MessageListContext = React.createContext<?MessageListContextType>();

function useMessageListContext(threadID: string) {
  const getTextMessageMarkdownRules = useTextMessageRulesFunc(threadID);
  return React.useMemo(
    () => ({
      getTextMessageMarkdownRules,
    }),
    [getTextMessageMarkdownRules],
  );
}

export {
  messageListRoutePropType,
  messageListNavPropType,
  MessageListContext,
  useMessageListContext,
};
