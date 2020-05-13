// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import PropTypes from 'prop-types';

export type MessageListRoute = {|
  ...NavigationLeafRoute,
  params: {|
    threadInfo: ThreadInfo,
  |},
|};

export type MessageListNavProp = NavigationScreenProp<MessageListRoute>;

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
