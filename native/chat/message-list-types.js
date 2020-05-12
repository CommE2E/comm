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
    gesturesDisabled?: boolean,
  |},
|};

export type MessageListNavProp = NavigationScreenProp<MessageListRoute>;

export const messageListRoutePropType = PropTypes.shape({
  key: PropTypes.string.isRequired,
  params: PropTypes.shape({
    threadInfo: threadInfoPropType.isRequired,
    gesturesDisabled: PropTypes.bool,
  }).isRequired,
});

export const messageListNavPropType = PropTypes.shape({
  navigate: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
});
