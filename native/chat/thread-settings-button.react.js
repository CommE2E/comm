// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { Navigate } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';
import { type GlobalTheme, globalThemePropType } from '../types/themes';

import * as React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { ThreadSettingsRouteName } from '../navigation/route-names';
import Button from '../components/button.react';
import { colors } from '../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: Navigate,
  // Redux state
  activeTheme: ?GlobalTheme,
|};
class ThreadSettingsButton extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    activeTheme: globalThemePropType,
  };

  render() {
    const { link: color } = this.props.activeTheme === 'dark'
      ? colors.dark
      : colors.light;
    return (
      <Button onPress={this.onPress} androidBorderlessRipple={true}>
        <Icon
          name="md-settings"
          size={30}
          style={styles.button}
          color={color}
        />
      </Button>
    );
  }

  onPress = () => {
    const threadInfo = this.props.threadInfo;
    this.props.navigate({
      routeName: ThreadSettingsRouteName,
      params: { threadInfo },
      key: `${ThreadSettingsRouteName}${threadInfo.id}`,
    });
  }

}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 10,
  },
});

export default connect((state: AppState) => ({
  activeTheme: state.globalThemeInfo.activeTheme,
}))(ThreadSettingsButton);
