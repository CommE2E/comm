// @flow

import { HeaderTitle } from '@react-navigation/stack';
import * as React from 'react';
import { View, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { threadIsPending } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import { ThreadSettingsRouteName } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';
import { styleSelector } from '../themes/colors';
import type { ChatNavigationProp } from './chat.react';

type Props = {|
  +threadInfo: ThreadInfo,
  +searching: boolean,
  +navigate: $PropertyType<ChatNavigationProp<'MessageList'>, 'navigate'>,
  // Redux state
  +styles: typeof styles,
|};
class MessageListHeaderTitle extends React.PureComponent<Props> {
  render() {
    const isSearchEmpty =
      this.props.searching && this.props.threadInfo.members.length === 1;
    let icon, fakeIcon;
    const areSettingsDisabled =
      threadIsPending(this.props.threadInfo.id) || isSearchEmpty;
    if (Platform.OS === 'ios' && !areSettingsDisabled) {
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
    const title = isSearchEmpty ? 'New Message' : this.props.threadInfo.uiName;
    return (
      <Button
        onPress={this.onPress}
        style={this.props.styles.button}
        androidBorderlessRipple={true}
        disabled={areSettingsDisabled}
      >
        <View style={this.props.styles.container}>
          {fakeIcon}
          <HeaderTitle>{title}</HeaderTitle>
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
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: Platform.OS === 'android' ? 'flex-start' : 'center',
  },
  fakeIcon: {
    paddingRight: 7,
    paddingTop: 3,
    flex: 1,
    minWidth: 25,
    opacity: 0,
  },
  forwardIcon: {
    paddingLeft: 7,
    paddingTop: 3,
    color: 'link',
    flex: 1,
    minWidth: 25,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(MessageListHeaderTitle);
