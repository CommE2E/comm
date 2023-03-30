// @flow

import {
  HeaderTitle,
  type HeaderTitleInputProps,
} from '@react-navigation/elements';
import * as React from 'react';
import { View } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { firstLine } from 'lib/utils/string-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import Button from '../components/button.react.js';
import ThreadAvatar from '../components/thread-avatar.react.js';
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
      shouldRenderAvatars,
      ...rest
    } = this.props;

    let avatar;
    if (!isSearchEmpty && shouldRenderAvatars) {
      avatar = (
        <View style={styles.avatarContainer}>
          <ThreadAvatar size="small" threadInfo={threadInfo} />
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
          {avatar}
          <HeaderTitle {...rest}>{firstLine(title)}</HeaderTitle>
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
  },
};

const ConnectedMessageListHeaderTitle: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMessageListHeaderTitle(
    props: BaseProps,
  ) {
    const styles = useStyles(unboundStyles);

    const shouldRenderAvatars = useShouldRenderAvatars();

    const { uiName } = useResolvedThreadInfo(props.threadInfo);

    const { isSearchEmpty } = props;

    const title = isSearchEmpty ? 'New Message' : uiName;

    return (
      <MessageListHeaderTitle
        {...props}
        styles={styles}
        title={title}
        shouldRenderAvatars={shouldRenderAvatars}
      />
    );
  });

export default ConnectedMessageListHeaderTitle;
