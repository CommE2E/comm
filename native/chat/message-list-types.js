// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { ChatNavigationProp, ChatNavigationRoute } from './chat.react';

import PropTypes from 'prop-types';

export type MessageListParams = {|
  threadInfo: ThreadInfo,
|};

export type MessageListNavProp = ChatNavigationProp<'MessageList'>;
export type MessageListRoute = ChatNavigationRoute<'MessageList'>;

export const messageListRoutePropType = PropTypes.shape({
  key: PropTypes.string.isRequired,
  params: PropTypes.shape({
    threadInfo: threadInfoPropType.isRequired,
  }).isRequired,
});

export const messageListNavPropType = PropTypes.shape({
  navigate: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
  setOptions: PropTypes.func.isRequired,
  dangerouslyGetParent: PropTypes.func.isRequired,
  isFocused: PropTypes.func.isRequired,
  popToTop: PropTypes.func.isRequired,
});
