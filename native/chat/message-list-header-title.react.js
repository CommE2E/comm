// @flow

import Icon from '@expo/vector-icons/Ionicons.js';
import {
  HeaderTitle,
  type HeaderTitleInputProps,
} from '@react-navigation/elements';
import * as React from 'react';
import { View, Platform } from 'react-native';

import { useGetAvatarForThread } from 'lib/shared/avatar-utils.js';
import type { ClientAvatar } from 'lib/types/avatar-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { firstLine } from 'lib/utils/string-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import Avatar from '../components/avatar.react.js';
import Button from '../components/button.react.js';
import { ThreadSettingsRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

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
  +avatarInfo: ClientAvatar,
  +shouldRenderAvatars: boolean,
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
      avatarInfo,
      shouldRenderAvatars,
      ...rest
    } = this.props;

    // @GINSU: Before submitting review check android
    let icon;
    if (Platform.OS === 'ios' && areSettingsEnabled) {
      icon = (
        <Icon name="chevron-forward" size={20} style={styles.forwardIcon} />
      );
    }

    let fakeIcon;
    if (Platform.OS === 'ios' && areSettingsEnabled && !shouldRenderAvatars) {
      fakeIcon = (
        <Icon name="chevron-forward" size={20} style={styles.fakeIcon} />
      );
    }

    let avatar;
    if (!isSearchEmpty && shouldRenderAvatars) {
      avatar = (
        <View style={styles.avatarContainer}>
          <Avatar avatarInfo={avatarInfo} size="small" />
        </View>
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
          {avatar}
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
  avatarContainer: {
    marginRight: 8,
  },
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

    const shouldRenderAvatars = useShouldRenderAvatars();

    const resolvedThreadInfo = useResolvedThreadInfo(props.threadInfo);
    const avatarInfo = useGetAvatarForThread(resolvedThreadInfo);

    const { isSearchEmpty } = props;

    const title = isSearchEmpty ? 'New Message' : resolvedThreadInfo.uiName;

    return (
      <MessageListHeaderTitle
        {...props}
        styles={styles}
        title={title}
        avatarInfo={avatarInfo}
        shouldRenderAvatars={shouldRenderAvatars}
      />
    );
  });

export default ConnectedMessageListHeaderTitle;
