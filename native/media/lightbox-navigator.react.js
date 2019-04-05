// @flow

import type {
  NavigationScreenProp,
  NavigationState,
  NavigationDescriptor,
  NavigationStackScreenOptions,
  NavigationRouteConfigMap,
  NavigationTransitionProps,
  NavigationScene,
} from '@react-navigation/core';
import type { 
  StackNavigatorConfig,
} from 'react-navigation';

import * as React from 'react';
import {
  View,
  StyleSheet,
  Animated as BaseAnimated,
  Easing as BaseEasing,
} from 'react-native';
import {
  StackRouter,
  createNavigator,
  StackActions,
} from '@react-navigation/core';
import { Transitioner } from 'react-navigation-stack';
import Animated, { Easing } from 'react-native-reanimated';

function createLightboxNavigator(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig: StackNavigatorConfig = {},
) {
  const {
    initialRouteName,
    initialRouteParams,
    paths,
    defaultNavigationOptions,
    initialRouteKey,
  } = stackConfig;
  const stackRouterConfig = {
    initialRouteName,
    initialRouteParams,
    paths,
    defaultNavigationOptions,
    initialRouteKey,
  };
  return createNavigator<
    NavigationStackScreenOptions,
    NavigationState,
    StackNavigatorConfig,
  >(
    // $FlowFixMe maybe will be fixed on flow-bin@0.89
    Lightbox,
    StackRouter(routeConfigMap, stackRouterConfig),
    stackConfig,
  );
}

type Props = $ReadOnly<{|
  navigation: NavigationScreenProp<NavigationState>,
  descriptors: { [key: string]: NavigationDescriptor },
  navigationConfig: StackNavigatorConfig,
|}>;
class Lightbox extends React.PureComponent<Props> {

  position: Animated.Value;

  constructor(props: Props) {
    super(props);
    this.position = new Animated.Value(props.navigation.state.index);
  }

  render() {
    return (
      <Transitioner
        render={this.renderScenes}
        configureTransition={this.configureTransition}
        navigation={this.props.navigation}
        descriptors={this.props.descriptors}
        onTransitionStart={this.onTransitionStart}
        onTransitionEnd={this.onTransitionEnd}
      />
    );
  }

  configureTransition = () => ({
    duration: 250,
    easing: BaseEasing.inOut(BaseEasing.ease),
    timing: BaseAnimated.timing,
    useNativeDriver: true,
  })

  onTransitionStart = (transitionProps: NavigationTransitionProps) => {
    const { index } = transitionProps.navigation.state;
    Animated.timing(
      this.position,
      {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        toValue: index,
      },
    ).start();
  }

  onTransitionEnd = (transitionProps: NavigationTransitionProps) => {
    if (!transitionProps.navigation.state.isTransitioning) {
      return;
    }
    const { navigation } = this.props;
    const transitionDestKey = transitionProps.scene.route.key;
    const isCurrentKey =
      navigation.state.routes[navigation.state.index].key === transitionDestKey;
    if (!isCurrentKey) {
      return;
    }
    navigation.dispatch(
      StackActions.completeTransition({ toChildKey: transitionDestKey }),
    );
  }

  renderScenes = (transitionProps: NavigationTransitionProps) => {
    const { scenes } = transitionProps;
    const renderScene =
      (scene: NavigationScene) => this.renderScene(
        scene,
        transitionProps,
      );
    return (
      <React.Fragment>
        {scenes.map(renderScene)}
      </React.Fragment>
    );
  }

  renderScene(scene: NavigationScene, transitionProps: NavigationTransitionProps) {
    if (!scene.descriptor) {
      return null;
    }
    const { navigation, getComponent } = scene.descriptor;
    const SceneComponent = getComponent();
    return (
      <View style={styles.scene} key={scene.key}>
        <SceneComponent
          navigation={navigation}
          scene={scene}
          transitionProps={transitionProps}
          position={this.position}
        />
      </View>
    );
  }

}

const styles = StyleSheet.create({
  scene: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export {
  createLightboxNavigator,
};
