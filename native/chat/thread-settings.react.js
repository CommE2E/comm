// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation/src/TypeDefinition';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>
  & { state: { params: { threadInfo: ThreadInfo } } };

type Props = {
  navigation: NavProp,
};
type State = {
};
class InnerThreadSettings extends React.PureComponent {
  
  props: Props;
  state: State;
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.name,
  });

  render() {
    return null;
  }

}

const ThreadSettingsRouteName = 'ThreadSettings';
const ThreadSettings = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => ({
  }),
)(InnerThreadSettings);

export {
  ThreadSettings,
  ThreadSettingsRouteName,
};
