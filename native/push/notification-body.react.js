// @flow

import type { ImageSource } from 'react-native/Libraries/Image/ImageSource';

import * as React from 'react';
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
class NotificationBody extends React.PureComponent<Props> {

  render() {
    return (
      <View style={styles.notificationBodyContainer}>
        <DefaultNotificationBody
          title={this.props.title}
          message={this.props.message}
          onPress={this.onPress}
          isOpen={this.props.isOpen}
          iconApp={this.props.iconApp}
          icon={this.props.icon}
          vibrate={this.props.vibrate}
          onClose={this.props.onClose}
        />
      </View>
    );
  }

  onPress = () => {
    const { onPress } = this.props;
    if (onPress) {
      // onPress is null when the notification is animating closed. It's not
      // clear why this needs to be the case, but isn't fixed as of
      // react-native-in-app-notification@3.0.0. Especially weird given that
      // DefaultNotificationBody crashes if passed a null onPress and pressed.
      onPress();
    }
  }

}

const styles = StyleSheet.create({
  notificationBodyContainer: {
    flex: 1,
    paddingTop: DeviceInfo.isIPhoneX_deprecated ? 24 : 0,
    backgroundColor: Platform.OS === "ios" ? "#050505" : "#FFFFFF",
  },
});

export default NotificationBody;
