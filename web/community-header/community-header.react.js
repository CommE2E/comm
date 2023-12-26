// @flow

import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import CommunityHeaderActions from './community-header-actions.react.js';
import css from './community-header.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

const COMMUNITY_SELECTED = true;
const COMMUNITY_SELECTED_ID = '256|84260';
// const COMMUNITY_SELECTED_ID = '256|84145';

function CommunityHeader(): React.Node {
  const selectedCommunity = useSelector(
    state => threadInfoSelector(state)[COMMUNITY_SELECTED_ID],
  );

  const resolvedSelectedCommunity = useResolvedThreadInfo(selectedCommunity);

  const header = React.useMemo(() => {
    if (!COMMUNITY_SELECTED) {
      return <div className={css.header}>All communites</div>;
    }

    return (
      <div className={css.header}>
        <ThreadAvatar size="S" threadInfo={selectedCommunity} />
        <div>{resolvedSelectedCommunity.uiName}</div>
      </div>
    );
  }, [resolvedSelectedCommunity.uiName, selectedCommunity]);

  const communityButtons = React.useMemo(() => {
    if (!COMMUNITY_SELECTED) {
      return null;
    }

    return <CommunityHeaderActions communityID={COMMUNITY_SELECTED_ID} />;
  }, []);

  return (
    <div className={css.container}>
      {header}
      {communityButtons}
    </div>
  );
}

export default CommunityHeader;
