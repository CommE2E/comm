// @flow

import Icon from '@expo/vector-icons/Ionicons.js';
import {
  HeaderTitle,
  type HeaderTitleInputProps,
} from '@react-navigation/elements';
import * as React from 'react';
import { View, Platform } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { firstLine } from 'lib/utils/string-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import Button from '../components/button.react.js';
import { ThreadSettingsRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type BaseProps = {
  +threadInfo: ThreadInfo,
  +navigate: $PropertyType<ChatNavigationProp<'MessageList'>, 'navigate'>,
  +isSearchEmpty: boolean,
  +areSettingsEnabled: boolean,
  ...HeaderTitleInputProps,
};
type Props = {
  ...BaseProps,
  +styles: typeof unboundStyles,
  +title: string,
};
class MessageListHeaderTitle extends React.PureComponent<Props> {
  render() {
    const {
      threadInfo,
      navigate,
      isSearchEmpty,
      areSettingsEnabled,
      styles,
      title,
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
    const { threadInfo } = this.props;
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

const ConnectedMessageListHeaderTitle: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMessageListHeaderTitle(
    props: BaseProps,
  ) {
    const styles = useStyles(unboundStyles);

    const { uiName } = useResolvedThreadInfo(props.threadInfo);
    const { isSearchEmpty } = props;
    const title = isSearchEmpty ? 'New Message' : uiName;

    return <MessageListHeaderTitle {...props} styles={styles} title={title} />;
  });

export default ConnectedMessageListHeaderTitle;
