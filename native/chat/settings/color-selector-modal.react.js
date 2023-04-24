// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import * as React from 'react';
import { TouchableHighlight, Alert } from 'react-native';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions.js';
import {
  type ThreadInfo,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
} from 'lib/types/thread-types.js';
import type { DispatchActionPromise } from 'lib/utils/action-utils.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import ColorSelector from '../../components/color-selector.react.js';
import Modal from '../../components/modal.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useStyles, useColors } from '../../themes/colors.js';

export type ColorSelectorModalParams = {
  +presentedFrom: string,
  +color: string,
  +threadInfo: ThreadInfo,
  +setColor: (color: string) => void,
};

type BaseProps = {
  +navigation: RootNavigationProp<'ColorSelectorModal'>,
  +route: NavigationRoute<'ColorSelectorModal'>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +colors: Colors,
  +styles: typeof unboundStyles,
  +windowWidth: number,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +changeThreadSettings: (
    request: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsPayload>,
};
function ColorSelectorModal(props: Props): React.Node {
  const {
    changeThreadSettings: updateThreadSettings,
    dispatchActionPromise,
    windowWidth,
  } = props;
  const { threadInfo, setColor } = props.route.params;

  const close = props.navigation.goBackOnce;

  const onErrorAcknowledged = React.useCallback(() => {
    setColor(threadInfo.color);
  }, [setColor, threadInfo.color]);

  const editColor = React.useCallback(
    async (newColor: string) => {
      const threadID = threadInfo.id;
      try {
        return await updateThreadSettings({
          threadID,
          changes: { color: newColor },
        });
      } catch (e) {
        Alert.alert(
          'Unknown error',
          'Uhh... try again?',
          [{ text: 'OK', onPress: onErrorAcknowledged }],
          { cancelable: false },
        );
        throw e;
      }
    },
    [onErrorAcknowledged, threadInfo.id, updateThreadSettings],
  );

  const onColorSelected = React.useCallback(
    (color: string) => {
      const colorEditValue = color.substr(1);
      setColor(colorEditValue);
      close();

      const action = changeThreadSettingsActionTypes.started;
      const threadID = props.route.params.threadInfo.id;
      dispatchActionPromise(
        changeThreadSettingsActionTypes,
        editColor(colorEditValue),
        {
          customKeyName: `${action}:${threadID}:color`,
        },
      );
    },
    [
      setColor,
      close,
      dispatchActionPromise,
      editColor,
      props.route.params.threadInfo.id,
    ],
  );

  const { colorSelectorContainer, closeButton, closeButtonIcon } = props.styles;
  // Based on the assumption we are always in portrait,
  // and consequently width is the lowest dimensions
  const modalStyle = React.useMemo(
    () => [colorSelectorContainer, { height: 0.75 * windowWidth }],
    [colorSelectorContainer, windowWidth],
  );

  const { modalIosHighlightUnderlay } = props.colors;
  const { color } = props.route.params;
  return (
    <Modal modalStyle={modalStyle}>
      <ColorSelector
        currentColor={color}
        windowWidth={windowWidth}
        onColorSelected={onColorSelected}
      />
      <TouchableHighlight
        onPress={close}
        style={closeButton}
        underlayColor={modalIosHighlightUnderlay}
      >
        <Icon name="close" size={16} style={closeButtonIcon} />
      </TouchableHighlight>
    </Modal>
  );
}

const unboundStyles = {
  closeButton: {
    borderRadius: 3,
    height: 18,
    position: 'absolute',
    right: 5,
    top: 5,
    width: 18,
  },
  closeButtonIcon: {
    color: 'modalBackgroundSecondaryLabel',
    left: 3,
    position: 'absolute',
  },
  colorSelector: {
    bottom: 10,
    left: 10,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  colorSelectorContainer: {
    backgroundColor: 'modalBackground',
    borderRadius: 5,
    flex: 0,
    marginHorizontal: 15,
    marginVertical: 20,
  },
};

const ConnectedColorSelectorModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedColorSelectorModal(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const colors = useColors();
    const windowWidth = useSelector(state => state.dimensions.width);

    const dispatchActionPromise = useDispatchActionPromise();
    const callChangeThreadSettings = useServerCall(changeThreadSettings);

    return (
      <ColorSelectorModal
        {...props}
        styles={styles}
        colors={colors}
        windowWidth={windowWidth}
        dispatchActionPromise={dispatchActionPromise}
        changeThreadSettings={callChangeThreadSettings}
      />
    );
  });

export default ConnectedColorSelectorModal;
