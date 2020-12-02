// @flow

import { firstLine } from 'lib/utils/string-utils';
import * as React from 'react';
import { Text } from 'react-native';

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

export { SingleLine };
