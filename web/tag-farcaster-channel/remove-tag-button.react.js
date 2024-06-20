// @flow

import * as React from 'react';

import { useRemoveFarcasterChannelTag } from 'lib/shared/community-utils.js';
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
      Remove tag
    </Button>
  );
}

export default RemoveTagButton;
