package app.comm.android;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import app.comm.android.notifications.CommAndroidNotifications;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import expo.modules.ReactActivityDelegateWrapper;

public class MainActivity extends ReactActivity
    implements ActivityCompat.OnRequestPermissionsResultCallback {

  /**
   * Returns the name of the main component registered from JavaScript.
   * This is used to schedule rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "Comm";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. There the
   * RootView is created and you can specify the renderer you wish to use - the
   * new renderer (Fabric) or the old renderer (Paper).
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegateWrapper(
        this, new MainActivityDelegate(this, getMainComponentName()));
  }
  public static class MainActivityDelegate extends ReactActivityDelegate {
    public MainActivityDelegate(
        ReactActivity activity,
        String mainComponentName) {
      super(activity, mainComponentName);
    }
    @Override
    protected ReactRootView createRootView() {
      ReactRootView reactRootView = new ReactRootView(getContext());
      // If you opted-in for the New Architecture, we enable the Fabric
      // Renderer.
      reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED);
      return reactRootView;
    }
    @Override
    protected boolean isConcurrentRootEnabled() {
      // If you opted-in for the New Architecture, we enable Concurrent Root
      // (i.e. React 18). More on this on
      // https://reactjs.org/blog/2022/03/29/react-v18.html
      return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
    }
  }

  @Override
  public void invokeDefaultOnBackPressed() {
    moveTaskToBack(true);
  }

  @Override
  public void onRequestPermissionsResult(
      int requestCode,
      String[] permissions,
      int[] grantResults) {

    for (int permissionIndex = 0; permissionIndex < grantResults.length;
         permissionIndex++) {
      String permissionName = permissions[permissionIndex];
      if (requestCode ==
              CommAndroidNotifications
                  .COMM_ANDROID_NOTIFICATIONS_REQUEST_CODE &&
          permissionName.equals(Manifest.permission.POST_NOTIFICATIONS)) {
        CommAndroidNotifications.resolveNotificationsPermissionRequestPromise(
            this,
            grantResults[permissionIndex] == PackageManager.PERMISSION_GRANTED);
      }
    }
  }
}
