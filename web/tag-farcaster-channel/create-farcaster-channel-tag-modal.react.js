// @flow

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
import Input from '../modals/input.react.js';
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
  const [channelNameText, setChannelSelectionText] = React.useState<string>('');
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

      const options = [{ id: 'other', name: 'Other' }, ...sortedChannels];

      setChannelOptions(options);
    })();
  }, [client, fid]);

  const onChangeSelectedOption = React.useCallback((option: string) => {
    setError(null);
    setChannelSelectionText('');
    setSelectedOption(option);
  }, []);

  const onChangeChannelNameText = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      setChannelSelectionText(event.currentTarget.value);
    },
    [],
  );

  const tagFarcasterChannelByName = React.useMemo(() => {
    if (selectedOption !== 'other') {
      return null;
    }

    return (
      <div className={css.tagFarcasterChannelByNameContainer}>
        <div className={css.inputLabel}>Channel name</div>
        <div className={css.textInputContainer}>
          <Input
            type="text"
            value={channelNameText}
            onChange={onChangeChannelNameText}
          />
        </div>
      </div>
    );
  }, [channelNameText, onChangeChannelNameText, selectedOption]);

  const { createTag, isLoading } = useCreateFarcasterChannelTag(
    communityID,
    setError,
    popModal,
  );

  const onClickTagChannel = React.useCallback(async () => {
    if (!selectedOption) {
      return;
    } else if (selectedOption === 'other') {
      const channelInfo =
        await neynarClientContext.client.fetchFarcasterChannelByName(
          channelNameText,
        );

      if (!channelInfo) {
        setError('channel_not_found');
        return;
      }

      createTag(channelInfo.id);
    } else {
      createTag(selectedOption);
    }
  }, [channelNameText, createTag, neynarClientContext.client, selectedOption]);

  const buttonDisabled =
    isLoading ||
    !selectedOption ||
    (selectedOption === 'other' && !channelNameText);

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

  const errorMessage = React.useMemo(() => {
    if (!error) {
      return null;
    }

    return (
      <div className={css.errorMessage}>
        {tagFarcasterChannelErrorMessages[error] ?? 'Unknown error.'}
      </div>
    );
  }, [error]);

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
        <div className={css.bottomContainer}>
          {tagFarcasterChannelByName}
          {errorMessage}
        </div>
      </Modal>
    ),
    [
      channelOptions,
      errorMessage,
      onChangeSelectedOption,
      popModal,
      primaryButton,
      selectedOption,
      tagFarcasterChannelByName,
    ],
  );

  return createFarcasterChannelTagModal;
}

export default CreateFarcasterChannelTagModal;
