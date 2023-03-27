package app.comm.android.notifications;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.firebase.messaging.RemoteMessage;

public class CommAndroidNotificationsEventEmitter
    extends ReactContextBaseJavaModule {
  private static final String TAG = "CommAndroidNotifications";
  private volatile int listenersCount = 0;

  CommAndroidNotificationsEventEmitter(ReactApplicationContext reactContext) {
    super(reactContext);
    reactContext.addActivityEventListener(
        new CommAndroidNotificationsActivityEventListener());
    LocalBroadcastManager localBroadcastManager =
        LocalBroadcastManager.getInstance(reactContext);
    localBroadcastManager.registerReceiver(
        new CommAndroidNotificationsTokenReceiver(),
        new IntentFilter(CommNotificationsHandler.TOKEN_EVENT));
    localBroadcastManager.registerReceiver(
        new CommAndroidNotificationsMessageReceiver(),
        new IntentFilter(CommNotificationsHandler.MESSAGE_EVENT));
  }

  @Override
  public String getName() {
    return "CommAndroidNotificationsEventEmitter";
  }

  @ReactMethod
  public void addListener(String eventName) {
    this.listenersCount += 1;

    // This is for the edge case that the app was started by tapping
    // on notification in notification center. We want to open the app
    // and navigate to relevant thread. We need to parse notification
    // so that JS can get its threadID.
    sendInitialNotificationFromIntentToJS(getCurrentActivity().getIntent());
  }

  @ReactMethod
  public void removeListeners(Integer count) {
    this.listenersCount -= count;
  }

  private void sendEventToJS(String eventName, Object body) {
    if (this.listenersCount == 0) {
      return;
    }
    getReactApplicationContext()
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(eventName, body);
  }

  private void sendInitialNotificationFromIntentToJS(Intent intent) {
    RemoteMessage initialNotification = intent.getParcelableExtra("message");
    if (initialNotification == null) {
      return;
    }
    WritableMap jsReadableNotification =
        CommAndroidNotificationParser.parseRemoteMessageToJSMessage(
            initialNotification);
    if (jsReadableNotification != null) {
      sendEventToJS(
          "commAndroidNotificationsNotificationOpened", jsReadableNotification);
    }
  }

  private class CommAndroidNotificationsTokenReceiver
      extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
      String token = intent.getStringExtra("token");
      sendEventToJS("commAndroidNotificationsToken", token);
    }
  }

  private class CommAndroidNotificationsMessageReceiver
      extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
      RemoteMessage message = intent.getParcelableExtra("message");
      WritableMap jsMessage =
          CommAndroidNotificationParser.parseRemoteMessageToJSMessage(message);
      if (jsMessage != null) {
        sendEventToJS("commAndroidNotificationsMessage", jsMessage);
      }
    }
  }

  private class CommAndroidNotificationsActivityEventListener
      implements ActivityEventListener {
    @Override
    public void onNewIntent(Intent intent) {
      sendInitialNotificationFromIntentToJS(intent);
    }

    @Override
    public void onActivityResult(
        Activity activity,
        int requestCode,
        int resultCode,
        Intent data) {
      // Required by ActivityEventListener, but not needed for this project
    }
  }
}
