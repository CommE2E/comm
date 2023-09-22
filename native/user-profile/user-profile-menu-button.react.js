// @flow

import { useNavigation, useRoute } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { UserInfo } from 'lib/types/user-types';

import { userProfileMenuButtonHeight } from './user-profile-constants.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import { UserRelationshipTooltipModalRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

const onMenuButtonLayout = () => {};

type Props = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo: ?UserInfo,
};

function UserProfileMenuButton(props: Props): React.Node {
  const { threadInfo, pendingPersonalThreadUserInfo } = props;

  const { otherUserInfo } = useRelationshipPrompt(
    threadInfo,
    undefined,
    pendingPersonalThreadUserInfo,
  );

  const { navigate } = useNavigation();
  const route = useRoute();

  const styles = useStyles(unboundStyles);

  const overlayContext = React.useContext(OverlayContext);

  const menuButtonRef = React.useRef();

  const visibleEntryIDs = React.useMemo(() => {
    const result = [];

    if (otherUserInfo?.relationshipStatus === userRelationshipStatus.FRIEND) {
      result.push('unfriend');
      result.push('block');
    } else if (
      otherUserInfo?.relationshipStatus ===
        userRelationshipStatus.BOTH_BLOCKED ||
      otherUserInfo?.relationshipStatus ===
        userRelationshipStatus.BLOCKED_BY_VIEWER
    ) {
      result.push('unblock');
    } else {
      result.push('block');
    }

    return result;
  }, [otherUserInfo?.relationshipStatus]);

  const onPressMenuButton = React.useCallback(() => {
    invariant(
      overlayContext,
      'RelationshipListItem should have OverlayContext',
    );
    overlayContext.setScrollBlockingModalStatus('open');

    const currentMenuButtonRef = menuButtonRef.current;
    if (!currentMenuButtonRef || !otherUserInfo) {
      return;
    }

    currentMenuButtonRef.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = {
        x: pageX,
        y: pageY,
        width,
        height,
      };

      const verticalBounds = {
        height: userProfileMenuButtonHeight,
        y: pageY,
      };

      const { relationshipStatus, ...restUserInfo } = otherUserInfo;
      const relativeUserInfo = {
        ...restUserInfo,
        isViewer: false,
      };
      navigate<'UserRelationshipTooltipModal'>({
        name: UserRelationshipTooltipModalRouteName,
        params: {
          presentedFrom: route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs,
          relativeUserInfo,
          tooltipButtonIcon: 'menu',
        },
      });
    });
  }, [navigate, otherUserInfo, overlayContext, route.key, visibleEntryIDs]);

  return (
    <TouchableOpacity onPress={onPressMenuButton} style={styles.iconContainer}>
      <View ref={menuButtonRef} onLayout={onMenuButtonLayout}>
        <SWMansionIcon name="menu-vertical" size={24} style={styles.moreIcon} />
      </View>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  iconContainer: {
    alignSelf: 'flex-end',
  },
  moreIcon: {
    color: 'modalButtonLabel',
    alignSelf: 'flex-end',
  },
};

export default UserProfileMenuButton;
