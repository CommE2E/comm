// @flow

import {
  HeaderTitle,
  type StackHeaderTitleInputProps,
} from '@react-navigation/elements';
import * as React from 'react';
import { View, Platform } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';

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
  ...StackHeaderTitleInputProps,
};
type Props = {
  ...BaseProps,
  +styles: typeof unboundStyles,
};
class MessageListHeaderTitle extends React.PureComponent<Props> {
  render() {
    const {
      threadInfo,
      navigate,
      isSearchEmpty,
      areSettingsEnabled,
      styles,
      ...rest
    } = this.props;

    let icon, fakeIcon;
    if (Platform.OS === 'ios' && areSettingsEnabled) {
      icon = (
        <Icon name="chevron-forward" size={20} style={styles.forwardIcon} />
      );
      fakeIcon = (
        <Icon name="chevron-forward" size={20} style={styles.fakeIcon} />
      );
    }

    const title = isSearchEmpty ? 'New Message' : threadInfo.uiName;

    return (
      <Button
        onPress={this.onPress}
        style={styles.button}
        androidBorderlessRipple={true}
        disabled={!areSettingsEnabled}
      >
        <View style={styles.container}>
          {fakeIcon}
          <HeaderTitle {...rest}>{firstLine(title)}</HeaderTitle>
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
    paddingRight: 3,
    paddingTop: 3,
    flex: 1,
    minWidth: 25,
    opacity: 0,
  },
  forwardIcon: {
    paddingLeft: 3,
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
