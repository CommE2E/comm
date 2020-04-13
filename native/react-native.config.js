module.exports = {
  dependencies: {
    'react-native-firebase': { platforms: { ios: null } },
    'react-native-notifications': { platforms: { android: null } },
    'react-native-video': {
      platforms: {
        android: { sourceDir: '../node_modules/react-native-video/android' },
        ios: null,
      },
    },
    '@react-native-community/cameraroll': { platforms: { android: null } },
  },
};
