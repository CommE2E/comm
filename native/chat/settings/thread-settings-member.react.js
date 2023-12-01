// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import {
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { getAvailableThreadMemberActions } from 'lib/shared/thread-utils.js';
import { stringForUser } from 'lib/shared/user-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { RelativeMemberInfo, ThreadInfo } from 'lib/types/thread-types.js';
import { useRolesFromCommunityThreadInfo } from 'lib/utils/role-utils.js';

import type { ThreadSettingsNavigate } from './thread-settings.react.js';
import UserAvatar from '../../avatars/user-avatar.react.js';
import PencilIcon from '../../components/pencil-icon.react.js';
import SingleLine from '../../components/single-line.react.js';
import {
  type KeyboardState,
  KeyboardContext,
} from '../../keyboard/keyboard-state.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../../navigation/overlay-context.js';
import { ThreadSettingsMemberTooltipModalRouteName } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../../themes/colors.js';
import type { VerticalBounds } from '../../types/layout-types.js';
import { useNavigateToUserProfileBottomSheet } from '../../user-profile/user-profile-utils.js';

const unboundStyles = {
  container: {
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  editButton: {
    paddingLeft: 10,
  },
  topBorder: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  lastContainer: {
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
  },
  role: {
    color: 'panelForegroundTertiaryLabel',
    flex: 1,
    fontSize: 14,
    paddingTop: 4,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  userInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    marginLeft: 8,
  },
  anonymous: {
    color: 'panelForegroundTertiaryLabel',
    fontStyle: 'italic',
  },
};

type BaseProps = {
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
  +canEdit: boolean,
  +navigate: ThreadSettingsNavigate,
  +firstListItem: boolean,
  +lastListItem: boolean,
  +verticalBounds: ?VerticalBounds,
  +threadSettingsRouteKey: string,
};
type Props = {
  ...BaseProps,
  // Redux state
  +roleName: ?string,
  +removeUserLoadingStatus: LoadingStatus,
  +changeRoleLoadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  +navigateToUserProfileBottomSheet: (userID: string) => mixed,
};
class ThreadSettingsMember extends React.PureComponent<Props> {
  editButton: ?React.ElementRef<typeof View>;

  render(): React.Node {
    const userText = stringForUser(this.props.memberInfo);

    let usernameInfo = null;
    if (this.props.memberInfo.username) {
      usernameInfo = (
        <SingleLine style={this.props.styles.username}>{userText}</SingleLine>
      );
    } else {
      usernameInfo = (
        <SingleLine
          style={[this.props.styles.username, this.props.styles.anonymous]}
        >
          {userText}
        </SingleLine>
      );
    }

    let editButton = null;
    if (
      this.props.removeUserLoadingStatus === 'loading' ||
      this.props.changeRoleLoadingStatus === 'loading'
    ) {
      editButton = (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    } else if (
      getAvailableThreadMemberActions(
        this.props.memberInfo,
        this.props.threadInfo,
        this.props.canEdit,
      ).length !== 0
    ) {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressEdit}
          style={this.props.styles.editButton}
        >
          <View onLayout={this.onEditButtonLayout} ref={this.editButtonRef}>
            <PencilIcon />
          </View>
        </TouchableOpacity>
      );
    }

    const roleInfo = (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.role} numberOfLines={1}>
          {this.props.roleName}
        </Text>
      </View>
    );

    const firstItem = this.props.firstListItem
      ? null
      : this.props.styles.topBorder;
    const lastItem = this.props.lastListItem
      ? this.props.styles.lastContainer
      : null;
    return (
      <TouchableOpacity
        onPress={this.onPressUser}
        style={[this.props.styles.container, firstItem, lastItem]}
      >
        <View style={this.props.styles.row}>
          <View style={this.props.styles.userInfoContainer}>
            <UserAvatar size="S" userID={this.props.memberInfo.id} />
            {usernameInfo}
          </View>
          {editButton}
        </View>
        {roleInfo}
      </TouchableOpacity>
    );
  }

  onPressUser = () => {
    this.props.navigateToUserProfileBottomSheet(this.props.memberInfo.id);
  };

  editButtonRef = (editButton: ?React.ElementRef<typeof View>) => {
    this.editButton = editButton;
  };

  onEditButtonLayout = () => {};

  onPressEdit = () => {
    if (this.dismissKeyboardIfShowing()) {
      return;
    }

    const {
      editButton,
      props: { verticalBounds },
    } = this;
    if (!editButton || !verticalBounds) {
      return;
    }

    const { overlayContext } = this.props;
    invariant(
      overlayContext,
      'ThreadSettingsMember should have OverlayContext',
    );
    overlayContext.setScrollBlockingModalStatus('open');

    editButton.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigate<'ThreadSettingsMemberTooltipModal'>({
        name: ThreadSettingsMemberTooltipModalRouteName,
        params: {
          presentedFrom: this.props.threadSettingsRouteKey,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs: getAvailableThreadMemberActions(
            this.props.memberInfo,
            this.props.threadInfo,
            this.props.canEdit,
          ),
          memberInfo: this.props.memberInfo,
          threadInfo: this.props.threadInfo,
        },
      });
    });
  };

  dismissKeyboardIfShowing = (): boolean => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  };
}

const ConnectedThreadSettingsMember: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsMember(
    props: BaseProps,
  ) {
    const memberID = props.memberInfo.id;
    const removeUserLoadingStatus = useSelector(state =>
      createLoadingStatusSelector(
        removeUsersFromThreadActionTypes,
        `${removeUsersFromThreadActionTypes.started}:${memberID}`,
      )(state),
    );
    const changeRoleLoadingStatus = useSelector(state =>
      createLoadingStatusSelector(
        changeThreadMemberRolesActionTypes,
        `${changeThreadMemberRolesActionTypes.started}:${memberID}`,
      )(state),
    );

    const [memberInfo] = useENSNames([props.memberInfo]);

    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const keyboardState = React.useContext(KeyboardContext);
    const overlayContext = React.useContext(OverlayContext);

    const navigateToUserProfileBottomSheet =
      useNavigateToUserProfileBottomSheet();

    const roles = useRolesFromCommunityThreadInfo(props.threadInfo, [
      props.memberInfo,
    ]);
    const roleName = roles.get(props.memberInfo.id)?.name;

    return (
      <ThreadSettingsMember
        {...props}
        memberInfo={memberInfo}
        roleName={roleName}
        removeUserLoadingStatus={removeUserLoadingStatus}
        changeRoleLoadingStatus={changeRoleLoadingStatus}
        colors={colors}
        styles={styles}
        keyboardState={keyboardState}
        overlayContext={overlayContext}
        navigateToUserProfileBottomSheet={navigateToUserProfileBottomSheet}
      />
    );
  });

export default ConnectedThreadSettingsMember;
