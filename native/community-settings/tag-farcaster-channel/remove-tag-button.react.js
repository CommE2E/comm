// @flow

import * as React from 'react';
import { Text, ActivityIndicator } from 'react-native';

import {
  deleteFarcasterChannelTagActionTypes,
  useDeleteFarcasterChannelTag,
} from 'lib/actions/community-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { SetState } from 'lib/types/hook-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import Button from '../../components/button.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles, useColors } from '../../themes/colors.js';

const deleteFarcasterChannelTagStatusSelector = createLoadingStatusSelector(
  deleteFarcasterChannelTagActionTypes,
);

type Props = {
  +communityID: string,
  +channelID: string,
  +setError: SetState<?string>,
};

function RemoveTagButton(props: Props): React.Node {
  const { communityID, channelID, setError } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const dispatchActionPromise = useDispatchActionPromise();

  const deleteFarcasterChannelTag = useDeleteFarcasterChannelTag();

  const createDeleteActionPromise = React.useCallback(async () => {
    try {
      return await deleteFarcasterChannelTag({
        commCommunityID: communityID,
        farcasterChannelID: channelID,
      });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [channelID, communityID, deleteFarcasterChannelTag, setError]);

  const onPressRemoveTag = React.useCallback(() => {
    void dispatchActionPromise(
      deleteFarcasterChannelTagActionTypes,
      createDeleteActionPromise(),
    );
  }, [createDeleteActionPromise, dispatchActionPromise]);

  const deleteFarcasterChannelTagStatus = useSelector(
    deleteFarcasterChannelTagStatusSelector,
  );

  const isLoadingDeleteFarcasterChannelTag =
    deleteFarcasterChannelTagStatus === 'loading';

  const buttonContent = React.useMemo(() => {
    if (isLoadingDeleteFarcasterChannelTag) {
      return (
        <ActivityIndicator size="small" color={colors.panelForegroundLabel} />
      );
    }

    return <Text style={styles.buttonText}>Remove tag</Text>;
  }, [
    colors.panelForegroundLabel,
    isLoadingDeleteFarcasterChannelTag,
    styles.buttonText,
  ]);

  return (
    <Button
      style={styles.button}
      disabled={isLoadingDeleteFarcasterChannelTag}
      onPress={onPressRemoveTag}
    >
      {buttonContent}
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
