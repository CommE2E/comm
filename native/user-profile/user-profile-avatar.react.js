// @flow

import { useNavigation, useRoute } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import UserAvatar from '../avatars/user-avatar.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import { UserProfileAvatarModalRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors.js';

// We need to set onAvatarLayout in order to allow .measure() to be on the ref
const onAvatarLayout = () => {};

type Props = {
  userID: ?string,
};

function UserProfileAvatar(props: Props): React.Node {
  const { userID } = props;

  const { navigate } = useNavigation();
  const route = useRoute();

  const overlayContext = React.useContext(OverlayContext);

  const avatarRef = React.useRef<?React.ElementRef<typeof View>>();

  const dimensions = useSelector(derivedDimensionsInfoSelector);
  const fullScreenHeight = dimensions.height;

  const onPressAvatar = React.useCallback(() => {
    invariant(overlayContext, 'UserProfileAvatar should have OverlayContext');
    overlayContext.setScrollBlockingModalStatus('open');

    const currentAvatarRef = avatarRef.current;
    if (!currentAvatarRef) {
      return;
    }

    currentAvatarRef.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = {
        x: pageX,
        y: pageY,
        width,
        height,
      };

      const verticalBounds = {
        height: fullScreenHeight,
        y: 0,
      };

      navigate<'UserProfileAvatarModal'>({
        name: UserProfileAvatarModalRouteName,
        params: {
          presentedFrom: route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          userID,
        },
      });
    });
  }, [navigate, overlayContext, route.key, userID, fullScreenHeight]);

  return (
    <TouchableOpacity onPress={onPressAvatar}>
      <View ref={avatarRef} onLayout={onAvatarLayout}>
        <UserAvatar size="L" userID={userID} />
      </View>
    </TouchableOpacity>
  );
}

export default UserProfileAvatar;
