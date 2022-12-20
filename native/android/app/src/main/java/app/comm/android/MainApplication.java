package app.comm.android;

import android.content.Context;
import android.content.res.Configuration;
import android.database.CursorWindow;
import androidx.annotation.NonNull;
import androidx.multidex.MultiDexApplication;
import app.comm.android.newarchitecture.MainApplicationReactNativeHost;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.soloader.SoLoader;
import com.wix.reactnativekeyboardinput.KeyboardInputPackage;
import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ReactNativeHostWrapper;
import io.invertase.firebase.messaging.RNFirebaseMessagingPackage;
import io.invertase.firebase.notifications.RNFirebaseNotificationsPackage;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.security.Security;
import java.util.List;
public class MainApplication
    extends MultiDexApplication implements ReactApplication {

  static {
    System.loadLibrary("comm_jni_module");
  }

  private final ReactNativeHost mReactNativeHost =
      new ReactNativeHostWrapper(this, new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          packages.add(new RNFirebaseMessagingPackage());
          packages.add(new RNFirebaseNotificationsPackage());
          packages.add(new KeyboardInputPackage(this.getApplication()));
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected JSIModulePackage getJSIModulePackage() {
          return new CommCoreJSIModulePackage();
        }
      });

  private final ReactNativeHost mNewArchitectureNativeHost =
      new ReactNativeHostWrapper(
          this,
          new MainApplicationReactNativeHost(this));

  @Override
  public ReactNativeHost getReactNativeHost() {
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      return mNewArchitectureNativeHost;
    } else {
      return mReactNativeHost;
    }
  }

  @Override
  public void onCreate() {
    super.onCreate();
    // If you opted-in for the New Architecture, we enable the TurboModule
    // system
    ReactFeatureFlags.useTurboModules = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;

    Security.insertProviderAt(new org.conscrypt.OpenSSLProvider(), 1);

    SoLoader.init(this, /* native exopackage */ false);
    ApplicationLifecycleDispatcher.onApplicationCreate(this);
    try {
      Field field = CursorWindow.class.getDeclaredField("sCursorWindowSize");
      field.setAccessible(true);
      field.set(null, 100 * 1024 * 1024); // 100 MiB
    } catch (Exception e) {
      if (BuildConfig.DEBUG) {
        e.printStackTrace();
      }
    }
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
  }
}
