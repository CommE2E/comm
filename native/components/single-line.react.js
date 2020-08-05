// @flow

import * as React from 'react';
import { Text } from 'react-native';

const newlineRegex = /[\r\n]/;
function firstLine(text: ?string): string {
  if (!text) {
    return '';
  }
  return text.split(newlineRegex, 1)[0];
}

type Props = {|
  ...React.ElementConfig<typeof Text>,
  children: ?string,
|};
function SingleLine(props: Props) {
  const text = firstLine(props.children);
  return (
    <Text {...props} numberOfLines={1}>
      {text}
    </Text>
  );
}

export { firstLine, SingleLine };
