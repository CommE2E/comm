// @flow

import type { ImageSource } from 'react-native/Libraries/Image/ImageSource';

import React from 'react';
import { View, StyleSheet, DeviceInfo, Platform } from 'react-native';
import DefaultNotificationBody
  from 'react-native-in-app-notification/DefaultNotificationBody';

type Props = {
  title: string,
  message: string,
  onPress: () => void,
  isOpen: bool,
  iconApp: ImageSource,
  icon: ImageSource,
  vibrate: bool,
  onClose: () => void,
};
function NotificationBody(props: Props) {
  return (
    <View style={styles.notificationBodyContainer}>
      <DefaultNotificationBody
        title={props.title}
        message={props.message}
        onPress={props.onPress}
        isOpen={props.isOpen}
        iconApp={props.iconApp}
        icon={props.icon}
        vibrate={props.vibrate}
        onClose={props.onClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notificationBodyContainer: {
    flex: 1,
    paddingTop: DeviceInfo.isIPhoneX_deprecated ? 24 : 0,
    backgroundColor: Platform.OS === "ios" ? "#050505" : "#FFFFFF",
  },
});

export default NotificationBody;
