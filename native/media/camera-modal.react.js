// @flow

import type {
  NavigationStackProp,
  NavigationLeafRoute,
  NavigationStackScene,
  NavigationStackTransitionProps,
} from 'react-navigation-stack';
import type { AppState } from '../redux/redux-setup';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';
import { RNCamera } from 'react-native-camera';
import {
  PinchGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';

import { connect } from 'lib/utils/redux-utils';

import {
  contentBottomOffset,
  dimensionsSelector,
  contentVerticalOffsetSelector,
} from '../selectors/dimension-selectors';
import ConnectedStatusBar from '../connected-status-bar.react';
import { gestureJustEnded } from '../utils/animation-utils';

const {
  Value,
  event,
  Extrapolate,
  block,
  set,
  call,
  cond,
  or,
  eq,
  greaterThan,
  sub,
  multiply,
  divide,
  abs,
  interpolate,
} = Animated;
const maxZoom = 8;
const zoomUpdateFactor = (() => {
  if (Platform.OS === "ios") {
    return 0.002;
  }
  if (Platform.OS === "android" && Platform.Version > 26) {
    return 0.005;
  }
  if (Platform.OS === "android" && Platform.Version > 23) {
    return 0.01;
  }
  return 0.03;
})();
const permissionRationale = {
  title: "Access Your Camera",
  message: "Requesting access to your device camera",
};
let hasCamerasOnBothSides = true;
let defaultUseFrontCamera = false;

type Props = {|
  navigation: NavigationStackProp<NavigationLeafRoute>,
  scene: NavigationStackScene,
  transitionProps: NavigationStackTransitionProps,
  position: Value,
  // Redux state
  screenDimensions: Dimensions,
  contentVerticalOffset: number,
|};
type State = {|
  zoom: number,
  useFrontCamera: bool,
  hasCamerasOnBothSides: bool,
|};
class CameraModal extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    scene: PropTypes.object.isRequired,
    transitionProps: PropTypes.object.isRequired,
    position: PropTypes.instanceOf(Value).isRequired,
    screenDimensions: dimensionsPropType.isRequired,
    contentVerticalOffset: PropTypes.number.isRequired,
  };
  state = {
    zoom: 0,
    useFrontCamera: defaultUseFrontCamera,
    hasCamerasOnBothSides,
  };
  camera: ?RNCamera;

  progress: Value;

  closeButton: ?TouchableOpacity;
  closeButtonX = new Value(0);
  closeButtonY = new Value(0);
  closeButtonWidth = new Value(0);
  closeButtonHeight = new Value(0);

  photoButton: ?TouchableOpacity;
  photoButtonX = new Value(0);
  photoButtonY = new Value(0);
  photoButtonWidth = new Value(0);
  photoButtonHeight = new Value(0);

  switchCameraButton: ?TouchableOpacity;
  switchCameraButtonX = new Value(0);
  switchCameraButtonY = new Value(0);
  switchCameraButtonWidth = new Value(0);
  switchCameraButtonHeight = new Value(0);

  pinchEvent;
  animationCode: Value;

  constructor(props: Props) {
    super(props);

    const { position } = props;
    const { index } = props.scene;
    this.progress = interpolate(
      position,
      {
        inputRange: [ index - 1, index ],
        outputRange: [ 0, 1 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );

    const pinchState = new Value(-1);
    const pinchScale = new Value(1);
    this.pinchEvent = event([{
      nativeEvent: {
        state: pinchState,
        scale: pinchScale,
      },
    }]);

    const zoomBase = new Value(1);
    const zoomReported = new Value(1);
    const pinchJustEnded = gestureJustEnded(pinchState);

    const currentZoom = interpolate(
      multiply(zoomBase, pinchScale),
      {
        inputRange: [ 1, 8 ],
        outputRange: [ 1, 8 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );
    const cameraZoomFactor = interpolate(
      zoomReported,
      {
        inputRange: [ 1, 8 ],
        outputRange: [ 0, 1 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );
    const resolvedZoom = cond(
      eq(pinchState, GestureState.ACTIVE),
      currentZoom,
      zoomBase,
    );

    this.animationCode = block([
      cond(
        pinchJustEnded,
        set(zoomBase, currentZoom),
      ),
      cond(
        or(
          pinchJustEnded,
          greaterThan(
            abs(sub(divide(resolvedZoom, zoomReported), 1)),
            zoomUpdateFactor,
          ),
        ),
        [
          set(zoomReported, resolvedZoom),
          call(
            [ cameraZoomFactor ],
            this.updateZoom,
          ),
        ],
      ),
    ]);
  }

  static isActive(props) {
    const { index } = props.scene;
    return index === props.transitionProps.index;
  }

  get containerStyle() {
    return {
      ...styles.container,
      opacity: this.progress,
    };
  }

  render() {
    let switchCameraButton = null;
    if (this.state.hasCamerasOnBothSides) {
      switchCameraButton = (
        <TouchableOpacity
          onPress={this.switchCamera}
          onLayout={this.onSwitchCameraButtonLayout}
          style={styles.switchCameraButton}
          ref={this.switchCameraButtonRef}
        >
          <Icon
            name="ios-reverse-camera"
            style={styles.switchCameraIcon}
          />
        </TouchableOpacity>
      );
    }

    const statusBar = CameraModal.isActive(this.props)
      ? <ConnectedStatusBar hidden />
      : null;
    const closeButtonStyle = {
      top: Math.max(this.props.contentVerticalOffset - 2, 4),
    };
    const type = this.state.useFrontCamera
      ? RNCamera.Constants.Type.front
      : RNCamera.Constants.Type.back;
    return (
      <PinchGestureHandler
        onGestureEvent={this.pinchEvent}
        onHandlerStateChange={this.pinchEvent}
      >
        <Animated.View style={this.containerStyle}>
          {statusBar}
          <Animated.Code exec={this.animationCode} />
          <RNCamera
            type={type}
            captureAudio={false}
            maxZoom={maxZoom}
            zoom={this.state.zoom}
            style={styles.fill}
            androidCameraPermissionOptions={permissionRationale}
            ref={this.cameraRef}
          />
          <TouchableOpacity
            onPress={this.close}
            onLayout={this.onCloseButtonLayout}
            style={[ styles.closeButtonContainer, closeButtonStyle ]}
            ref={this.closeButtonRef}
          >
            <Text style={styles.closeButton}>
              ×
            </Text>
          </TouchableOpacity>
          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity
              onPress={this.takePhoto}
              onLayout={this.onPhotoButtonLayout}
              style={styles.saveButton}
              ref={this.photoButtonRef}
            >
              <View style={styles.saveButtonInner} />
            </TouchableOpacity>
            {switchCameraButton}
          </View>
        </Animated.View>
      </PinchGestureHandler>
    );
  }

  cameraRef = (camera: ?RNCamera) => {
    this.camera = camera;
    if (camera) {
      this.fetchCameraIDs();
    }
  }

  closeButtonRef = (closeButton: ?TouchableOpacity) => {
    this.closeButton = closeButton;
  }

  onCloseButtonLayout = () => {
    const { closeButton } = this;
    if (!closeButton) {
      return;
    }
    closeButton.measure((x, y, width, height, pageX, pageY) => {
      this.closeButtonX.setValue(pageX);
      this.closeButtonY.setValue(pageY);
      this.closeButtonWidth.setValue(width);
      this.closeButtonHeight.setValue(height);
    });
  }

  photoButtonRef = (photoButton: ?TouchableOpacity) => {
    this.photoButton = photoButton;
  }

  onPhotoButtonLayout = () => {
    const { photoButton } = this;
    if (!photoButton) {
      return;
    }
    photoButton.measure((x, y, width, height, pageX, pageY) => {
      this.photoButtonX.setValue(pageX);
      this.photoButtonY.setValue(pageY);
      this.photoButtonWidth.setValue(width);
      this.photoButtonHeight.setValue(height);
    });
  }

  switchCameraButtonRef = (switchCameraButton: ?TouchableOpacity) => {
    this.switchCameraButton = switchCameraButton;
  }

  onSwitchCameraButtonLayout = () => {
    const { switchCameraButton } = this;
    if (!switchCameraButton) {
      return;
    }
    switchCameraButton.measure((x, y, width, height, pageX, pageY) => {
      this.switchCameraButtonX.setValue(pageX);
      this.switchCameraButtonY.setValue(pageY);
      this.switchCameraButtonWidth.setValue(width);
      this.switchCameraButtonHeight.setValue(height);
    });
  }

  close = () => {
    this.props.navigation.goBack();
  }

  takePhoto = () => {
  }

  switchCamera = () => {
    this.setState((prevState: State) => ({
      useFrontCamera: !prevState.useFrontCamera,
    }));
  }

  updateZoom = ([ zoom ]: [ number ]) => {
    this.setState({ zoom });
  }

  fetchCameraIDs = async () => {
    const { camera } = this;
    if (!camera) {
      return;
    }
    if (!camera._cameraHandle) {
      setTimeout(this.fetchCameraIDs, 50);
      return;
    }
    const deviceCameras = await camera.getCameraIdsAsync();

    let hasFront = false, hasBack = false, i = 0;
    while ((!hasFront || !hasBack) && i < deviceCameras.length) {
      const deviceCamera = deviceCameras[i];
      if (deviceCamera.type === RNCamera.Constants.Type.front) {
        hasFront = true;
      } else if (deviceCamera.type === RNCamera.Constants.Type.back) {
        hasBack = true;
      }
      i++;
    }

    hasCamerasOnBothSides = hasFront && hasBack;
    defaultUseFrontCamera = !hasBack && hasFront;
    if (hasCamerasOnBothSides !== this.state.hasCamerasOnBothSides) {
      this.setState({ hasCamerasOnBothSides });
    }
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fill: {
    flex: 1,
  },
  closeButtonContainer: {
    position: "absolute",
    left: 4,
  },
  closeButton: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    fontSize: 36,
    color: "white",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  bottomButtonsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: contentBottomOffset + 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButton: {
    height: 75,
    width: 75,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonInner: {
    height: 60,
    width: 60,
    borderRadius: 60,
    backgroundColor: '#FFFFFF88',
  },
  switchCameraButton: {
    position: 'absolute',
    right: 24,
    top: 0,
    bottom: 2,
    justifyContent: 'center',
  },
  switchCameraIcon: {
    color: 'white',
    fontSize: 36,
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
    contentVerticalOffset: contentVerticalOffsetSelector(state),
  }),
)(CameraModal);
