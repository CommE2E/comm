// @flow

import * as React from 'react';
import { Text, StyleSheet } from 'react-native';

import { useMarkdownOnPressUtils } from './markdown-utils.js';

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +hasAccessToChat: boolean,
  +children: React.Node,
  ...TextProps,
};
function MarkdownChatMention(props: Props): React.Node {
  const { hasAccessToChat, ...rest } = props;
  const { isRevealed, onLongPressHandler } = useMarkdownOnPressUtils();
  const shouldBePressable = hasAccessToChat ? isRevealed : false;
  return (
    <Text
      onLongPress={shouldBePressable ? onLongPressHandler : null}
      style={styles.mention}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  mention: {
    fontWeight: 'bold',
  },
});

export default MarkdownChatMention;
