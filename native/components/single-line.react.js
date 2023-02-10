// @flow

import * as React from 'react';
import { Text } from 'react-native';

import { firstLine } from 'lib/utils/string-utils.js';

type Props = {
  ...React.ElementConfig<typeof Text>,
  +children: ?string,
};
function SingleLine(props: Props): React.Node {
  const text = firstLine(props.children);
  return (
    <Text {...props} numberOfLines={1}>
      {text}
    </Text>
  );
}

export { SingleLine };
