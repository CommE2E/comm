// @flow

import EntypoIcon from '@expo/vector-icons/Entypo.js';
import Feather from '@expo/vector-icons/Feather.js';
import FontAwesome from '@expo/vector-icons/FontAwesome.js';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5.js';
import Ionicons from '@expo/vector-icons/Ionicons.js';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons.js';
import MaterialIcon from '@expo/vector-icons/MaterialIcons.js';
import { useFonts } from 'expo-font';

import CommIcons from '../fonts/CommIcons.ttf';
import SWMansionIcons from '../fonts/SWMansionIcons.ttf';

function useLoadCommFonts(): boolean {
  const [fontsLoaded] = useFonts({
    ...EntypoIcon.font,
    ...Feather.font,
    ...FontAwesome.font,
    ...FontAwesome5.font,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcon.font,
    SWMansionIcons,
    CommIcons,
  });
  // In production we bundle the fonts directly, so we don't need to wait
  if (!__DEV__) {
    return true;
  }
  return fontsLoaded;
}

export { useLoadCommFonts };
