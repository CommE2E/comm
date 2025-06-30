// @flow

import type { HeaderTitleInputProps } from '@react-navigation/core';
import { HeaderTitle } from '@react-navigation/elements';
import * as React from 'react';
import { View } from 'react-native';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { firstLine } from 'lib/utils/string-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import Button from '../components/button.react.js';
import { ThreadSettingsRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

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

type BaseProps = {
  +threadInfo: ThreadInfo,
  +navigate: ChatNavigationProp<'MessageList'>['navigate'],
  +isSearchEmpty: boolean,
  +areSettingsEnabled: boolean,
  ...HeaderTitleInputProps,
};
type Props = {
  ...BaseProps,
  +styles: $ReadOnly<typeof unboundStyles>,
  +title: string,
};
class MessageListHeaderTitle extends React.PureComponent<Props> {
  render(): React.Node {
    const {
      threadInfo,
      navigate,
      isSearchEmpty,
      areSettingsEnabled,
      styles,
      title,
      ...rest
    } = this.props;

    let avatar;
    if (!isSearchEmpty) {
      avatar = (
        <View style={styles.avatarContainer}>
          <ThreadAvatar size="S" threadInfo={threadInfo} />
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

const ConnectedMessageListHeaderTitle: React.ComponentType<BaseProps> =
  React.memo(function ConnectedMessageListHeaderTitle(props: BaseProps) {
    const styles = useStyles(unboundStyles);

    const { uiName } = useResolvedThreadInfo(props.threadInfo);

    const { isSearchEmpty } = props;

    const title = isSearchEmpty ? 'New Message' : uiName;

    return <MessageListHeaderTitle {...props} styles={styles} title={title} />;
  });

export default ConnectedMessageListHeaderTitle;
