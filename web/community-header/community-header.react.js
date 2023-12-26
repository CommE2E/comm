// @flow

import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useResolvedOptionalThreadInfo } from 'lib/utils/entity-helpers.js';

import CommunityHeaderActions from './community-header-actions.react.js';
import css from './community-header.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +communityID?: string,
};

function CommunityHeader(props: Props): React.Node {
  const { communityID } = props;

  const threadInfos = useSelector(state => threadInfoSelector(state));
  const selectedCommunity = communityID ? threadInfos[communityID] : null;

  const resolvedSelectedCommunity =
    useResolvedOptionalThreadInfo(selectedCommunity);

  const header = React.useMemo(() => {
    if (!resolvedSelectedCommunity) {
      return <div className={css.header}>All communites</div>;
    }

    return (
      <div className={css.header}>
        <ThreadAvatar size="S" threadInfo={resolvedSelectedCommunity} />
        <div>{resolvedSelectedCommunity.uiName}</div>
      </div>
    );
  }, [resolvedSelectedCommunity]);

  const communityButtons = React.useMemo(() => {
    if (!resolvedSelectedCommunity) {
      return null;
    }

    return (
      <CommunityHeaderActions communityID={resolvedSelectedCommunity.id} />
    );
  }, [resolvedSelectedCommunity]);

  const communityHeader = React.useMemo(
    () => (
      <div className={css.container}>
        {header}
        {communityButtons}
      </div>
    ),
    [communityButtons, header],
  );

  return communityHeader;
}

export default CommunityHeader;
