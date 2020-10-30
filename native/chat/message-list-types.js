// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { MarkdownRules } from '../markdown/rules.react';

import PropTypes from 'prop-types';
import * as React from 'react';

export type MessageListParams = {|
  threadInfo: ThreadInfo,
|};

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

export type MessageListContextType = {|
  +getTextMessageMarkdownRules: (useDarkStyle: boolean) => MarkdownRules,
|};

export const MessageListContext = React.createContext<?MessageListContextType>();
