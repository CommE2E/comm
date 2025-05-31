// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type {
  TypeaheadTooltipActionItem,
  MentionTypeaheadSuggestionItem,
} from 'lib/shared/mention-utils.js';

import ThreadAvatar from '../avatars/thread-avatar.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import Button from '../components/button.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +item: TypeaheadTooltipActionItem<MentionTypeaheadSuggestionItem>,
};
function MentionTypeaheadTooltipButton(props: Props): React.Node {
  const { item } = props;
  const styles = useStyles(unboundStyles);

  let avatarComponent = null;
  let typeaheadTooltipButtonText = null;
  if (item.actionButtonContent.type === 'user') {
    avatarComponent = (
      <UserAvatar size="S" userID={item.actionButtonContent.userInfo.id} />
    );
    typeaheadTooltipButtonText = item.actionButtonContent.userInfo.username;
  } else if (item.actionButtonContent.type === 'chat') {
    typeaheadTooltipButtonText = item.actionButtonContent.threadInfo.uiName;
    avatarComponent = (
      <ThreadAvatar size="S" threadInfo={item.actionButtonContent.threadInfo} />
    );
  }

  return (
    <Button
      onPress={item.execute}
      style={styles.button}
      iosActiveOpacity={0.85}
    >
      {avatarComponent}
      <Text style={styles.buttonLabel} numberOfLines={1}>
        @{typeaheadTooltipButtonText}
      </Text>
    </Button>
  );
}

const unboundStyles = {
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    innerHeight: 24,
    padding: 8,
    color: 'typeaheadTooltipText',
  },
  buttonLabel: {
    color: 'typeaheadTooltipText',
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 8,
  },
};

export default MentionTypeaheadTooltipButton;
