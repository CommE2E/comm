// @flow

import * as React from 'react';

import { type ThreadInfo } from 'lib/types/thread-types.js';

import type { ChatNavigationProp } from '../chat/chat.react.js';
import Button from '../components/button.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { MessageSearchRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: ThreadInfo,
  +navigate: $PropertyType<ChatNavigationProp<'MessageList'>, 'navigate'>,
};

function SearchMessagesButton(props: Props): React.Node {
  const { threadInfo, navigate } = props;
  const styles = useStyles(unboundStyles);

  const onPress = () => {
    navigate<'MessageSearch'>({
      name: MessageSearchRouteName,
      params: { threadInfo },
      key: `${MessageSearchRouteName}${threadInfo.id}`,
    });
  };

  return (
    <Button onPress={onPress} androidBorderlessRipple={true}>
      <SWMansionIcon name="search" size={24} style={styles.button} />
    </Button>
  );
}

const unboundStyles = {
  button: {
    color: 'panelForegroundLabel',
    paddingHorizontal: 10,
  },
};

export default SearchMessagesButton;
