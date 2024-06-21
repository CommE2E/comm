// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import {
  tagFarcasterChannelErrorMessages,
  useCreateFarcasterChannelTag,
} from 'lib/shared/community-utils.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import css from './create-farcaster-channel-tag-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import Dropdown, { type DropdownOption } from '../components/dropdown.react.js';
import Modal from '../modals/modal.react.js';

type Props = {
  +communityID: string,
};

function CreateFarcasterChannelTagModal(props: Props): React.Node {
  const { communityID } = props;

  const { popModal } = useModalContext();

  const fid = useCurrentUserFID();
  invariant(fid, 'FID should be set');

  const neynarClientContext = React.useContext(NeynarClientContext);
  invariant(neynarClientContext, 'NeynarClientContext is missing');

  const { client } = neynarClientContext;

  const [channelOptions, setChannelOptions] = React.useState<
    $ReadOnlyArray<DropdownOption>,
  >([]);
  const [selectedOption, setSelectedOption] = React.useState<?string>(null);
  const [error, setError] = React.useState<?string>(null);

  React.useEffect(() => {
    void (async () => {
      const channels = await client.fetchFollowedFarcasterChannels(fid);

      const sortedChannels = channels
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(channel => ({
          id: channel.id,
          name: `/${channel.id}`,
        }));

      setChannelOptions(sortedChannels);
    })();
  }, [client, fid]);

  const onChangeSelectedOption = React.useCallback((option: string) => {
    setError(null);
    setSelectedOption(option);
  }, []);

  const { createTag, isLoading } = useCreateFarcasterChannelTag(
    communityID,
    setError,
    popModal,
  );

  const onClickTagChannel = React.useCallback(() => {
    if (!selectedOption) {
      return;
    }

    createTag(selectedOption);
  }, [createTag, selectedOption]);

  const buttonDisabled = isLoading || !selectedOption;

  const primaryButton = React.useMemo(() => {
    return (
      <Button
        variant="filled"
        buttonColor={buttonThemes.standard}
        onClick={onClickTagChannel}
        disabled={buttonDisabled}
      >
        Create tag
      </Button>
    );
  }, [onClickTagChannel, buttonDisabled]);

  const errorMessageClassName = classNames(css.errorMessage, {
    [css.errorMessageVisible]: error,
  });

  const errorMessage =
    error && tagFarcasterChannelErrorMessages[error]
      ? tagFarcasterChannelErrorMessages[error]
      : 'Unknown error.';

  const createFarcasterChannelTagModal = React.useMemo(
    () => (
      <Modal
        name="Create a tag"
        onClose={popModal}
        size="large"
        primaryButton={primaryButton}
      >
        <div className={css.inputLabel}>Farcaster channel</div>
        <div className={css.dropdownInputContainer}>
          <Dropdown
            options={channelOptions}
            defaultLabel="Select a channel"
            activeSelection={selectedOption}
            setActiveSelection={onChangeSelectedOption}
          />
        </div>
        <div className={errorMessageClassName}>{errorMessage}</div>
      </Modal>
    ),
    [
      channelOptions,
      errorMessage,
      errorMessageClassName,
      onChangeSelectedOption,
      popModal,
      primaryButton,
      selectedOption,
    ],
  );

  return createFarcasterChannelTagModal;
}

export default CreateFarcasterChannelTagModal;
