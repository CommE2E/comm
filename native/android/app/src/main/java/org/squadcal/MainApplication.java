package org.squadcal;

import android.app.Application;
import android.util.Log;

import com.facebook.react.PackageList;
import com.facebook.hermes.reactexecutor.HermesExecutorFactory;
import com.facebook.react.bridge.JavaScriptExecutorFactory;
import com.facebook.react.ReactApplication;
import com.rnfs.RNFSPackage;
import fr.bamlab.rnimageresizer.ImageResizerPackage;
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
      List<ReactPackage> packages = new PackageList(this).getPackages();
      packages.add(new RNFSPackage());
      packages.add(new ImageResizerPackage());
      packages.add(new LottiePackage());
      packages.add(new CameraRollPackage());
      packages.add(new RNFirebasePackage());
      packages.add(new RNFirebaseMessagingPackage());
      packages.add(new RNFirebaseNotificationsPackage());
      packages.add(new NetInfoPackage());
      packages.add(new AsyncStoragePackage());
      packages.add(new ReanimatedPackage());
      packages.add(new OrientationPackage());
      packages.add(new FastImageViewPackage());
      packages.add(new RNScreensPackage());
      packages.add(new RNGestureHandlerPackage());
      packages.add(new SplashScreenReactPackage());
      packages.add(new RNExitAppPackage());
      packages.add(new VectorIconsPackage());
      packages.add(new KeychainPackage());
      packages.add(new KeyboardInputPackage(this.getApplication()));
      return packages;
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
