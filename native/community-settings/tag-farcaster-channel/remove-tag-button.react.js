// @flow

import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import {
  tagFarcasterChannelCopy,
  useRemoveFarcasterChannelTag,
} from 'lib/shared/community-utils.js';
import type { SetState } from 'lib/types/hook-types.js';

import Button from '../../components/button.react.js';
import { useStyles, useColors } from '../../themes/colors.js';

type Props = {
  +communityID: string,
  +channelID: string,
  +setError: SetState<?string>,
};

function RemoveTagButton(props: Props): React.Node {
  const { communityID, channelID, setError } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { removeTag, isLoading } = useRemoveFarcasterChannelTag(
    communityID,
    channelID,
    setError,
  );

  const buttonContent = React.useMemo(() => {
    if (isLoading) {
      return (
        <ActivityIndicator size="small" color={colors.panelForegroundLabel} />
      );
    }

    return (
      <Text style={styles.buttonText}>
        {tagFarcasterChannelCopy.REMOVE_TAG_BUTTON}
      </Text>
    );
  }, [colors.panelForegroundLabel, isLoading, styles.buttonText]);

  return (
    <Button style={styles.button} disabled={isLoading} onPress={removeTag}>
      <View style={styles.buttonContainer}>{buttonContent}</View>
    </Button>
  );
}

const unboundStyles = {
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'vibrantRedButton',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: 'vibrantRedButton',
    textAlign: 'center',
  },
  buttonContainer: {
    height: 24,
  },
};

export default RemoveTagButton;
