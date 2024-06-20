// @flow

import * as React from 'react';

import {
  tagFarcasterChannelCopy,
  useRemoveFarcasterChannelTag,
} from 'lib/shared/community-utils.js';
import type { SetState } from 'lib/types/hook-types.js';

import Button, { buttonThemes } from '../components/button.react.js';

type Props = {
  +communityID: string,
  +channelID: string,
  +setError: SetState<?string>,
};

function RemoveTagButton(props: Props): React.Node {
  const { communityID, channelID, setError } = props;

  const { removeTag, isLoading } = useRemoveFarcasterChannelTag(
    communityID,
    channelID,
    setError,
  );

  return (
    <Button
      variant="filled"
      buttonColor={buttonThemes.danger}
      onClick={removeTag}
      disabled={isLoading}
    >
      {tagFarcasterChannelCopy.REMOVE_TAG_BUTTON}
    </Button>
  );
}

export default RemoveTagButton;
