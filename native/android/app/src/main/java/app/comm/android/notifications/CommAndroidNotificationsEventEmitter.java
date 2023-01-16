package app.comm.android.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
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
    LocalBroadcastManager localBroadcastManager =
        LocalBroadcastManager.getInstance(reactContext);
    localBroadcastManager.registerReceiver(
        new CommAndroidNotificationsTokenReceiver(),
        new IntentFilter(CommNotificationsHandler.TOKEN_EVENT));
    localBroadcastManager.registerReceiver(
        new CommAndroidNotificationsForegroundMessageReceiver(),
        new IntentFilter(CommNotificationsHandler.FOREGROUND_MESSAGE_EVENT));
  }

  @Override
  public String getName() {
    return "CommAndroidNotificationsEventEmitter";
  }

  @ReactMethod
  public void addListener(String eventName) {
    this.listenersCount += 1;
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

  private class CommAndroidNotificationsTokenReceiver
      extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
      String token = intent.getStringExtra("token");
      sendEventToJS("commAndroidNotificationsToken", token);
    }
  }

  private class CommAndroidNotificationsForegroundMessageReceiver
      extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
      RemoteMessage message = intent.getParcelableExtra("message");
      WritableMap jsForegroundMessage =
          CommAndroidNotificationParser.parseRemoteMessageToJSForegroundMessage(
              message);
      if (jsForegroundMessage != null) {
        sendEventToJS(
            "commAndroidNotificationsForegroundMessage", jsForegroundMessage);
      }
    }
  }
}
