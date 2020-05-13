// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { Navigate } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Ionicons';
import { HeaderTitle } from 'react-navigation-stack';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import { ThreadSettingsRouteName } from '../navigation/route-names';
import { styleSelector } from '../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: Navigate,
  // Redux state
  styles: typeof styles,
|};
class MessageListHeaderTitle extends React.PureComponent<Props> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    let icon, fakeIcon;
    if (Platform.OS === 'ios') {
      icon = (
        <Icon
          name="ios-arrow-forward"
          size={20}
          style={this.props.styles.forwardIcon}
        />
      );
      fakeIcon = (
        <Icon
          name="ios-arrow-forward"
          size={20}
          style={this.props.styles.fakeIcon}
        />
      );
    }
    return (
      <Button
        onPress={this.onPress}
        style={this.props.styles.button}
        topStyle={this.props.styles.button}
        androidBorderlessRipple={true}
      >
        <View style={this.props.styles.container}>
          {fakeIcon}
          <HeaderTitle>{this.props.threadInfo.uiName}</HeaderTitle>
          {icon}
        </View>
      </Button>
    );
  }

  onPress = () => {
    const threadInfo = this.props.threadInfo;
    this.props.navigate({
      name: ThreadSettingsRouteName,
      params: { threadInfo },
      key: `${ThreadSettingsRouteName}${threadInfo.id}`,
    });
  };
}

const styles = {
  button: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: Platform.OS === 'android' ? 'flex-start' : 'center',
  },
  fakeIcon: {
    flex: 1,
    minWidth: 25,
    opacity: 0,
  },
  forwardIcon: {
    color: 'link',
    flex: 1,
    minWidth: 25,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  urlPrefix: state.urlPrefix,
  customServer: state.customServer,
  styles: stylesSelector(state),
}))(MessageListHeaderTitle);
