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
import {
  type ThreadInfo,
  type RelativeMemberInfo,
} from 'lib/types/thread-types.js';

import type { ThreadSettingsNavigate } from './thread-settings.react.js';
import UserAvatar from '../../avatars/user-avatar.react.js';
import PencilIcon from '../../components/pencil-icon.react.js';
import { SingleLine } from '../../components/single-line.react.js';
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
import { useShouldRenderAvatars } from '../../utils/avatar-utils.js';

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
  +removeUserLoadingStatus: LoadingStatus,
  +changeRoleLoadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  +shouldRenderAvatars: boolean,
};
class ThreadSettingsMember extends React.PureComponent<Props> {
  editButton: ?React.ElementRef<typeof View>;

  render() {
    const userText = stringForUser(this.props.memberInfo);

    const marginLeftStyle = {
      marginLeft: this.props.shouldRenderAvatars ? 8 : 0,
    };

    let usernameInfo = null;
    if (this.props.memberInfo.username) {
      usernameInfo = (
        <SingleLine style={[this.props.styles.username, marginLeftStyle]}>
          {userText}
        </SingleLine>
      );
    } else {
      usernameInfo = (
        <SingleLine
          style={[
            this.props.styles.username,
            this.props.styles.anonymous,
            marginLeftStyle,
          ]}
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

    const roleName =
      this.props.memberInfo.role &&
      this.props.threadInfo.roles[this.props.memberInfo.role].name;

    const roleInfo = (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.role} numberOfLines={1}>
          {roleName}
        </Text>
      </View>
    );

    const firstItem = this.props.firstListItem
      ? null
      : this.props.styles.topBorder;
    const lastItem = this.props.lastListItem
      ? this.props.styles.lastInnerContainer
      : null;
    return (
      <View style={this.props.styles.container}>
        <View style={[this.props.styles.innerContainer, firstItem, lastItem]}>
          <View style={this.props.styles.row}>
            <View style={this.props.styles.userInfoContainer}>
              <UserAvatar size="small" userID={this.props.memberInfo.id} />
              {usernameInfo}
            </View>
            {editButton}
          </View>
          {roleInfo}
        </View>
      </View>
    );
  }

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

  dismissKeyboardIfShowing = () => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  };
}

const unboundStyles = {
  anonymous: {
    color: 'panelForegroundTertiaryLabel',
    fontStyle: 'italic',
  },
  container: {
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingHorizontal: 12,
  },
  editButton: {
    paddingLeft: 10,
  },
  topBorder: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lastInnerContainer: {
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
  },
};

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
    const shouldRenderAvatars = useShouldRenderAvatars();

    return (
      <ThreadSettingsMember
        {...props}
        memberInfo={memberInfo}
        removeUserLoadingStatus={removeUserLoadingStatus}
        changeRoleLoadingStatus={changeRoleLoadingStatus}
        colors={colors}
        styles={styles}
        keyboardState={keyboardState}
        overlayContext={overlayContext}
        shouldRenderAvatars={shouldRenderAvatars}
      />
    );
  });

export default ConnectedThreadSettingsMember;
