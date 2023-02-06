// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { threadTypeDescriptions } from 'lib/shared/thread-utils';
import { threadTypes } from 'lib/types/thread-types';

import CommIcon from '../../../../CommIcon.react';
import EnumSettingsOption from '../../../../components/enum-settings-option.react';
import Input from '../../../input.react';
import css from './subchannel-settings.css';

const { COMMUNITY_OPEN_SUBTHREAD, COMMUNITY_SECRET_SUBTHREAD } = threadTypes;

const openStatements = [
  {
    statement: threadTypeDescriptions[COMMUNITY_OPEN_SUBTHREAD],
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

const secretStatements = [
  {
    statement: threadTypeDescriptions[COMMUNITY_SECRET_SUBTHREAD],
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

const announcementStatements = [
  {
    statement: 'Admins can create Announcement channels.',
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

export type VisibilityType = 'open' | 'secret';

type Props = {
  +channelName: string,
  +onChangeChannelName: (SyntheticEvent<HTMLInputElement>) => void,
  +visibilityType: VisibilityType,
  +onOpenTypeSelect: () => void,
  +onSecretTypeSelect: () => void,
  +announcement: boolean,
  +onAnnouncementSelected: () => void,
};

function SubchannelSettings(props: Props): React.Node {
  const {
    channelName,
    onChangeChannelName,
    visibilityType,
    onOpenTypeSelect,
    onSecretTypeSelect,
    announcement,
    onAnnouncementSelected,
  } = props;

  const globeIcon = React.useMemo(
    () => <SWMansionIcon icon="globe-1" size={24} />,
    [],
  );

  const lockIcon = React.useMemo(
    () => <SWMansionIcon icon="lock-on" size={24} />,
    [],
  );

  const flagIcon = React.useMemo(
    () => <CommIcon icon="megaphone" size={24} />,
    [],
  );

  return (
    <>
      <Input
        type="text"
        onChange={onChangeChannelName}
        placeholder="Channel name"
        value={channelName}
      />

      <div className={css.wrapper}>
        <div className={css.label}>Visibility</div>
        <EnumSettingsOption
          title="Open"
          statements={openStatements}
          onSelect={onOpenTypeSelect}
          selected={visibilityType === 'open'}
          icon={globeIcon}
          iconPosition="top"
        />
        <EnumSettingsOption
          title="Secret"
          statements={secretStatements}
          onSelect={onSecretTypeSelect}
          selected={visibilityType === 'secret'}
          icon={lockIcon}
          iconPosition="top"
        />
      </div>

      <div className={css.wrapper}>
        <div className={css.label}>Optional settings</div>
        <EnumSettingsOption
          title="Announcement"
          statements={announcementStatements}
          onSelect={onAnnouncementSelected}
          selected={announcement}
          icon={flagIcon}
          iconPosition="top"
          type="checkbox"
        />
      </div>
    </>
  );
}

export default SubchannelSettings;
