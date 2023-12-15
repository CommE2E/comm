// @flow

import * as React from 'react';

import { communityThreadSelector } from 'lib/selectors/thread-selectors.js';
import { useAppendCommunitySuffix } from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfos } from 'lib/utils/entity-helpers.js';

import CommunityListItem from './community-list-item.react.js';
import css from './community-list.css';
import { useSelector } from '../redux/redux-utils.js';

function CommunityList(): React.Node {
  const communities = useSelector(communityThreadSelector);
  const resolvedCommunities = useResolvedThreadInfos(communities);
  const communitiesSuffixed = useAppendCommunitySuffix(resolvedCommunities);

  const communityList = React.useMemo(() => {
    return communitiesSuffixed.map(community => {
      return <CommunityListItem key={community.id} threadInfo={community} />;
    });
  }, [communitiesSuffixed]);

  return <div className={css.container}>{communityList}</div>;
}

export default CommunityList;
