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
import { View, StyleSheet, Animated, Easing } from 'react-native';
import {
  StackRouter,
  createNavigator,
  StackActions,
} from '@react-navigation/core';
import { Transitioner } from 'react-navigation-stack';

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

type LightboxProps = {|
  navigation: NavigationScreenProp<NavigationState>,
  descriptors: { [key: string]: NavigationDescriptor },
  navigationConfig: StackNavigatorConfig,
|};
class Lightbox extends React.PureComponent<LightboxProps> {

  render() {
    return (
      <Transitioner
        render={this.renderScenes}
        configureTransition={this.configureTransition}
        navigation={this.props.navigation}
        descriptors={this.props.descriptors}
        onTransitionEnd={this.onTransitionEnd}
      />
    );
  }

  configureTransition = (
    transitionProps: NavigationTransitionProps,
    prevTransitionProps: NavigationTransitionProps,
  ) => ({
    duration: 250,
    easing: Easing.inOut(Easing.ease),
    timing: Animated.timing,
    useNativeDriver: true,
  })

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

  renderScenes = (
    transitionProps: NavigationTransitionProps,
    prevTransitionProps: NavigationTransitionProps,
  ) => {
    const { scenes } = transitionProps;
    const renderScene =
      (scene: NavigationScene) => this.renderScene(
        scene,
        transitionProps,
        prevTransitionProps,
      );
    return (
      <React.Fragment>
        {scenes.map(renderScene)}
      </React.Fragment>
    );
  }

  renderScene(
    scene: NavigationScene,
    transitionProps: NavigationTransitionProps,
    prevTransitionProps: NavigationTransitionProps,
  ) {
    if (!scene.descriptor) {
      return null;
    }
    const { navigation, getComponent } = scene.descriptor;
    const SceneComponent = getComponent();
    return (
      <View style={styles.scene} key={scene.key}>
        <SceneComponent
          navigation={navigation}
          transitionProps={transitionProps}
          prevTransitionProps={prevTransitionProps}
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
