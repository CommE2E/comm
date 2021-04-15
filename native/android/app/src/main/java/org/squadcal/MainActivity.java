package org.squadcal;

import com.facebook.react.ReactActivity;
import android.os.Bundle;
import android.content.Intent;
import android.content.res.Configuration;

import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

import expo.modules.splashscreen.SplashScreen;
import expo.modules.splashscreen.SplashScreenImageResizeMode;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;

import org.squadcal.fbjni.CommHybrid;

public class MainActivity extends ReactActivity
        implements ReactInstanceManager.ReactInstanceEventListener {

  static {
    System.loadLibrary("comm_jni_module");
  }

  /**
   * Returns the name of the main component registered from JavaScript.
   * This is used to schedule rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "SquadCal";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    SplashScreen.show(this, SplashScreenImageResizeMode.NATIVE, ReactRootView.class);
  }

  @Override
  public void onResume() {
    super.onResume();
    getReactInstanceManager().addReactInstanceEventListener(this);
  }

  @Override
  public void onPause() {
    super.onPause();
    getReactInstanceManager().removeReactInstanceEventListener(this);
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    Intent intent = new Intent("onConfigurationChanged");
    intent.putExtra("newConfig", newConfig);
    this.sendBroadcast(intent);
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegate(this, getMainComponentName()) {
      @Override
      protected ReactRootView createRootView() {
       return new RNGestureHandlerEnabledRootView(MainActivity.this);
      }
    };
  }

  @Override
  public void invokeDefaultOnBackPressed() {
    moveTaskToBack(true);
  }

  @Override
  public void onReactContextInitialized(ReactContext context) {
    CommHybrid.initHybrid(context);
  }
}
