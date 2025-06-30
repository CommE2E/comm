// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { updateRelationshipsActionTypes } from 'lib/actions/relationship-actions.js';
import { useUpdateRelationships } from 'lib/hooks/relationship-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ReactRef } from 'lib/types/react-types.js';
import {
  type TraditionalRelationshipAction,
  type RelationshipErrors,
  userRelationshipStatus,
  relationshipActions,
  type RelationshipAction,
} from 'lib/types/relationship-types.js';
import type {
  AccountUserInfo,
  GlobalAccountUserInfo,
} from 'lib/types/user-types.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';

import type { RelationshipListNavigate } from './relationship-list.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import PencilIcon from '../components/pencil-icon.react.js';
import SingleLine from '../components/single-line.react.js';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import {
  UserRelationshipTooltipModalRouteName,
  FriendListRouteName,
  BlockListRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import type { VerticalBounds } from '../types/layout-types.js';
import { useNavigateToUserProfileBottomSheet } from '../user-profile/user-profile-utils.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

const unboundStyles = {
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'panelForeground',
    borderColor: 'panelForegroundBorder',
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  editButtonWithMargin: {
    marginLeft: 15,
  },
  username: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    marginLeft: 8,
  },
  editButton: {
    paddingLeft: 10,
  },
  blueAction: {
    color: 'link',
    fontSize: 16,
    paddingLeft: 6,
  },
  redAction: {
    color: 'redText',
    fontSize: 16,
    paddingLeft: 6,
  },
};

type BaseProps = {
  +userInfo: AccountUserInfo,
  +lastListItem: boolean,
  +verticalBounds: ?VerticalBounds,
  +relationshipListRoute: NavigationRoute<'FriendList' | 'BlockList'>,
  +navigate: RelationshipListNavigate,
  +onSelect: (selectedUser: GlobalAccountUserInfo) => void,
};
type Props = {
  ...BaseProps,
  // Redux state
  +removeUserLoadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +updateRelationships: (
    action: RelationshipAction,
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<RelationshipErrors>,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  +navigateToUserProfileBottomSheet: (userID: string) => mixed,
};
class RelationshipListItem extends React.PureComponent<Props> {
  editButton: ReactRef<React.ElementRef<typeof View>> = React.createRef();

  render(): React.Node {
    const {
      lastListItem,
      removeUserLoadingStatus,
      userInfo,
      relationshipListRoute,
    } = this.props;
    const relationshipsToEdit = {
      [FriendListRouteName]: [userRelationshipStatus.FRIEND],
      [BlockListRouteName]: [
        userRelationshipStatus.BOTH_BLOCKED,
        userRelationshipStatus.BLOCKED_BY_VIEWER,
      ],
    }[relationshipListRoute.name];

    const canEditFriendRequest = {
      [FriendListRouteName]: true,
      [BlockListRouteName]: false,
    }[relationshipListRoute.name];

    const borderBottom = lastListItem ? null : this.props.styles.borderBottom;

    let editButton = null;
    if (removeUserLoadingStatus === 'loading') {
      editButton = (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    } else if (relationshipsToEdit.includes(userInfo.relationshipStatus)) {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressEdit}
          style={this.props.styles.editButton}
        >
          <View onLayout={this.onLayout} ref={this.editButton}>
            <PencilIcon />
          </View>
        </TouchableOpacity>
      );
    } else if (
      userInfo.relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED &&
      canEditFriendRequest
    ) {
      editButton = (
        <View style={this.props.styles.buttonContainer}>
          <TouchableOpacity
            onPress={this.onPressFriendUser}
            style={this.props.styles.editButton}
          >
            <Text style={this.props.styles.blueAction}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={this.onPressUnfriendUser}
            style={[
              this.props.styles.editButton,
              this.props.styles.editButtonWithMargin,
            ]}
          >
            <Text style={this.props.styles.redAction}>Reject</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (
      userInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT &&
      canEditFriendRequest
    ) {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressUnfriendUser}
          style={this.props.styles.editButton}
        >
          <Text style={this.props.styles.redAction}>Cancel request</Text>
        </TouchableOpacity>
      );
    } else {
      editButton = (
        <TouchableOpacity
          onPress={this.onSelect}
          style={this.props.styles.editButton}
        >
          <Text style={this.props.styles.blueAction}>Add</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={this.onPressUser}
        style={[this.props.styles.container, borderBottom]}
      >
        <UserAvatar size="S" userID={this.props.userInfo.id} />
        <SingleLine style={this.props.styles.username}>
          {this.props.userInfo.username}
        </SingleLine>
        {editButton}
      </TouchableOpacity>
    );
  }

  onPressUser = () => {
    this.props.navigateToUserProfileBottomSheet(this.props.userInfo.id);
  };

  onSelect = () => {
    const { id, username } = this.props.userInfo;
    this.props.onSelect({ id, username });
  };

  visibleEntryIDs(): [string] {
    const { relationshipListRoute } = this.props;
    const id = {
      [FriendListRouteName]: 'unfriend',
      [BlockListRouteName]: 'unblock',
    }[relationshipListRoute.name];
    return [id];
  }

  onPressEdit = () => {
    if (this.props.keyboardState?.dismissKeyboardIfShowing()) {
      return;
    }

    const {
      editButton,
      props: { verticalBounds },
    } = this;
    const { overlayContext, userInfo } = this.props;
    invariant(
      overlayContext,
      'RelationshipListItem should have OverlayContext',
    );
    overlayContext.setScrollBlockingModalStatus('open');

    if (!editButton.current || !verticalBounds) {
      return;
    }
    const { relationshipStatus, ...restUserInfo } = userInfo;
    const relativeUserInfo = {
      ...restUserInfo,
      isViewer: false,
    };
    editButton.current.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigate<'UserRelationshipTooltipModal'>({
        name: UserRelationshipTooltipModalRouteName,
        params: {
          presentedFrom: this.props.relationshipListRoute.key,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs: this.visibleEntryIDs(),
          relativeUserInfo,
          tooltipButtonIcon: 'pencil',
        },
      });
    });
  };

  // We need to set onLayout in order to allow .measure() to be on the ref
  onLayout = () => {};

  onPressFriendUser = () => {
    this.onPressUpdateFriendship(relationshipActions.FRIEND);
  };

  onPressUnfriendUser = () => {
    this.onPressUpdateFriendship(relationshipActions.UNFRIEND);
  };

  onPressUpdateFriendship(action: TraditionalRelationshipAction) {
    const { id } = this.props.userInfo;
    const customKeyName = `${updateRelationshipsActionTypes.started}:${id}`;
    void this.props.dispatchActionPromise(
      updateRelationshipsActionTypes,
      this.updateFriendship(action),
      { customKeyName },
    );
  }

  async updateFriendship(
    action: TraditionalRelationshipAction,
  ): Promise<RelationshipErrors> {
    try {
      return await this.props.updateRelationships(action, [
        this.props.userInfo.id,
      ]);
    } catch (e) {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
        [{ text: 'OK' }],
        {
          cancelable: true,
        },
      );
      throw e;
    }
  }
}

const ConnectedRelationshipListItem: React.ComponentType<BaseProps> =
  React.memo(function ConnectedRelationshipListItem(props: BaseProps) {
    const removeUserLoadingStatus = useSelector(state =>
      createLoadingStatusSelector(
        updateRelationshipsActionTypes,
        `${updateRelationshipsActionTypes.started}:${props.userInfo.id}`,
      )(state),
    );
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const updateRelationships = useUpdateRelationships();
    const overlayContext = React.useContext(OverlayContext);
    const keyboardState = React.useContext(KeyboardContext);

    const navigateToUserProfileBottomSheet =
      useNavigateToUserProfileBottomSheet();

    return (
      <RelationshipListItem
        {...props}
        removeUserLoadingStatus={removeUserLoadingStatus}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        updateRelationships={updateRelationships}
        overlayContext={overlayContext}
        keyboardState={keyboardState}
        navigateToUserProfileBottomSheet={navigateToUserProfileBottomSheet}
      />
    );
  });

export default ConnectedRelationshipListItem;
