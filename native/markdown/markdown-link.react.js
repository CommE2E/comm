// @flow

import * as React from 'react';
import { Text } from 'react-native';

import {
  useMarkdownOnPressUtils,
  useHandleLinkClick,
} from './markdown-utils.js';

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +target: string,
  +children: React.Node,
  ...TextProps,
};
function MarkdownLink(props: Props): React.Node {
  const { target, ...rest } = props;
  const { markdownContext, messageKey, shouldBePressable, onLongPressHandler } =
    useMarkdownOnPressUtils();
  const onPressHandler = useHandleLinkClick(
    target,
    markdownContext,
    messageKey,
  );
  return (
    <Text
      onPress={shouldBePressable ? onPressHandler : null}
      onLongPress={shouldBePressable ? onLongPressHandler : null}
      {...rest}
    />
  );
}

export default MarkdownLink;
