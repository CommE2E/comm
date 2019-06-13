package org.squadcal;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.rnfs.RNFSPackage;
import fr.bamlab.rnimageresizer.ImageResizerPackage;
import com.horcrux.svg.SvgPackage;
import com.airbnb.android.react.lottie.LottiePackage;
import com.reactnativecommunity.cameraroll.CameraRollPackage;
import io.invertase.firebase.RNFirebasePackage;
import io.invertase.firebase.messaging.RNFirebaseMessagingPackage;
import io.invertase.firebase.notifications.RNFirebaseNotificationsPackage;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.swmansion.reanimated.ReanimatedPackage;
import org.wonday.orientation.OrientationPackage;
import com.dylanvann.fastimage.FastImageViewPackage;
import com.swmansion.rnscreens.RNScreensPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import org.devio.rn.splashscreen.SplashScreenReactPackage;
import com.github.wumke.RNExitApp.RNExitAppPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.oblador.keychain.KeychainPackage;
import com.wix.reactnativekeyboardinput.KeyboardInputPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new RNFSPackage(),
            new ImageResizerPackage(),
            new SvgPackage(),
            new LottiePackage(),
            new CameraRollPackage(),
            new RNFirebasePackage(),
            new RNFirebaseMessagingPackage(),
            new RNFirebaseNotificationsPackage(),
            new NetInfoPackage(),
            new AsyncStoragePackage(),
            new ReanimatedPackage(),
            new OrientationPackage(),
            new FastImageViewPackage(),
            new RNScreensPackage(),
            new RNGestureHandlerPackage(),
            new SplashScreenReactPackage(),
            new RNExitAppPackage(),
            new VectorIconsPackage(),
            new KeychainPackage(),
            new KeyboardInputPackage(this.getApplication())
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
