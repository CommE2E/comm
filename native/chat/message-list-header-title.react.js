// @flow

import { HeaderTitle } from '@react-navigation/elements';
import * as React from 'react';
import { View, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type { ThreadInfo } from 'lib/types/thread-types';
import { firstLine } from 'lib/utils/string-utils';

import Button from '../components/button.react';
import { ThreadSettingsRouteName } from '../navigation/route-names';
import { useStyles } from '../themes/colors';
import type { ChatNavigationProp } from './chat.react';

type BaseProps = {
  +threadInfo: ThreadInfo,
  +navigate: $PropertyType<ChatNavigationProp<'MessageList'>, 'navigate'>,
  +isSearchEmpty: boolean,
  +areSettingsEnabled: boolean,
};
type Props = {
  ...BaseProps,
  +styles: typeof unboundStyles,
};
class MessageListHeaderTitle extends React.PureComponent<Props> {
  render() {
    let icon, fakeIcon;
    if (Platform.OS === 'ios' && this.props.areSettingsEnabled) {
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

    const title = this.props.isSearchEmpty
      ? 'New Message'
      : this.props.threadInfo.uiName;

    return (
      <Button
        onPress={this.onPress}
        style={this.props.styles.button}
        androidBorderlessRipple={true}
        disabled={!this.props.areSettingsEnabled}
      >
        <View style={this.props.styles.container}>
          {fakeIcon}
          <HeaderTitle>{firstLine(title)}</HeaderTitle>
          {icon}
        </View>
      </Button>
    );
  }

  onPress = () => {
    const threadInfo = this.props.threadInfo;
    this.props.navigate<'ThreadSettings'>({
      name: ThreadSettingsRouteName,
      params: { threadInfo },
      key: `${ThreadSettingsRouteName}${threadInfo.id}`,
    });
  };
}

const unboundStyles = {
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
    color: 'headerChevron',
    flex: 1,
    minWidth: 25,
  },
};

const ConnectedMessageListHeaderTitle: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedMessageListHeaderTitle(props: BaseProps) {
    const styles = useStyles(unboundStyles);

    return <MessageListHeaderTitle {...props} styles={styles} />;
  },
);

export default ConnectedMessageListHeaderTitle;
