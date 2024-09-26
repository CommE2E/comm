// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Alert, View, Text } from 'react-native';

import {
  fetchAllCommunityInfosWithNames,
  fetchAllCommunityInfosWithNamesActionTypes,
} from 'lib/actions/community-actions.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { useThreadSearchIndex } from 'lib/selectors/nav-selectors.js';
import { threadInfoFromRawThreadInfo } from 'lib/shared/thread-utils.js';
import type { ClientCommunityInfoWithCommunityName } from 'lib/types/community-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import Modal from './modal.react.js';
import ThreadList from '../components/thread-list.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: RootNavigationProp<'CommunityJoinerModal'>,
  +route: NavigationRoute<'CommunityJoinerModal'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityJoinerModal(props: Props): React.Node {
  const dispatchActionPromise = useDispatchActionPromise();
  const [communities, setCommunities] = React.useState<
    Set<ClientCommunityInfoWithCommunityName>,
  >(() => new Set());
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const userInfos = useSelector(state => state.userStore.userInfos);
  const fetchPromise = useLegacyAshoatKeyserverCall(
    fetchAllCommunityInfosWithNames,
  );
  const styles = useStyles(unboundStyles);

  React.useEffect(() => {
    const fetchCommunityThreads = async () => {
      void dispatchActionPromise(
        fetchAllCommunityInfosWithNamesActionTypes,
        fetchPromise(),
      );
      const response = await fetchPromise();
      const communityInfos = new Set(response.allCommunityInfosWithNames);
      setCommunities(communityInfos);
    };

    void fetchCommunityThreads();
  }, [dispatchActionPromise, viewerID, userInfos, fetchPromise]);

  const threadPicked = React.useCallback(
    (threadID: string) => {
      const selectedCommunity = [...communities].find(
        community =>
          community.threadInfo && community.threadInfo.id === threadID,
      );
      invariant(selectedCommunity, 'Selected community not found');

      Alert.alert(
        'Community Selected',
        `Community Name: ${
          selectedCommunity.communityName
        }\nFarcaster Channel ID: ${
          selectedCommunity.farcasterChannelID ?? 'N/A'
        }`,
      );
    },
    [communities],
  );

  const threadInfos = React.useMemo(
    () =>
      [...communities]
        .map(community =>
          community.threadInfo
            ? threadInfoFromRawThreadInfo(
                community.threadInfo,
                viewerID,
                userInfos,
              )
            : null,
        )
        .filter(Boolean),
    [communities, viewerID, userInfos],
  );

  const index = useThreadSearchIndex(threadInfos);

  return (
    <Modal>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>
          It looks like you&apos;re not part of many communities right now.
          Explore some of the popular communities on Comm below!
        </Text>
      </View>
      <ThreadList
        threadInfos={threadInfos}
        onSelect={threadPicked}
        itemStyle={styles.threadListItem}
        searchIndex={index}
      />
    </Modal>
  );
}

const unboundStyles = {
  headerContainer: {
    padding: 10,
    paddingBottom: 0,
    marginBottom: 16,
  },
  headerText: {
    color: 'modalForegroundLabel',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  threadListItem: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 2,
  },
};

export default CommunityJoinerModal;
