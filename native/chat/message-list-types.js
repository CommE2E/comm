// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import PropTypes from 'prop-types';

export type MessageListNavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    threadInfo: ThreadInfo,
  |},
|}>;

export const messageListNavPropType = PropTypes.shape({
  state: PropTypes.shape({
    key: PropTypes.string.isRequired,
    params: PropTypes.shape({
      threadInfo: threadInfoPropType.isRequired,
    }).isRequired,
  }).isRequired,
  navigate: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
});
