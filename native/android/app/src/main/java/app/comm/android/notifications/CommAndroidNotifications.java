package app.comm.android.notifications;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.RemoteMessage;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import me.leolin.shortcutbadger.ShortcutBadger;

public class CommAndroidNotifications extends ReactContextBaseJavaModule {
  private static AtomicReference<Promise>
      notificationsPermissionRequestPromise = new AtomicReference(null);

  private NotificationManager notificationManager;

  // Application can request multiple permission, but all
  // will be resolved via `onRequestPermissionsResult` callback
  // in MainActivity. Therefore we use custom request codes
  // to differentiate between different permission requests
  public static final int COMM_ANDROID_NOTIFICATIONS_REQUEST_CODE = 11111;

  CommAndroidNotifications(ReactApplicationContext reactContext) {
    super(reactContext);
    Context context = reactContext.getApplicationContext();
    this.notificationManager = (NotificationManager)context.getSystemService(
        Context.NOTIFICATION_SERVICE);
  }

  @Override
  public String getName() {
    return "CommAndroidNotifications";
  }

  @ReactMethod
  public void removeAllActiveNotificationsForThread(String threadID) {
    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M) {
      // Method used below appeared in API level 23. Details:
      // https://developer.android.com/reference/android/app/NotificationManager#getActiveNotifications()
      // https://developer.android.com/reference/android/os/Build.VERSION_CODES#M
      return;
    }
    for (StatusBarNotification notification :
         notificationManager.getActiveNotifications()) {
      Bundle data = notification.getNotification().extras;
      if (data == null) {
        continue;
      }
      String notificationThreadID = data.getString("threadID");
      if (notificationThreadID != null &&
          notificationThreadID.equals(threadID)) {
        notificationManager.cancel(notification.getTag(), notification.getId());
      }
    }
  }

  @ReactMethod
  public void getInitialNotification(Promise promise) {
    RemoteMessage initialNotification =
        getCurrentActivity().getIntent().getParcelableExtra("message");
    if (initialNotification == null) {
      promise.resolve(null);
      return;
    }
    WritableMap jsReadableNotification =
        CommAndroidNotificationParser.parseRemoteMessageToJSMessage(
            initialNotification);
    promise.resolve(jsReadableNotification);
  }

  @ReactMethod
  public void createChannel(
      String channelID,
      String name,
      int importance,
      String description) {
    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
      // Method used below appeared in API level 26. Details:
      // https://developer.android.com/develop/ui/views/notifications/channels#CreateChannel
      return;
    }
    NotificationChannel channel =
        new NotificationChannel(channelID, name, importance);
    if (description != null) {
      channel.setDescription(description);
    }
    notificationManager.createNotificationChannel(channel);
  }

  @ReactMethod
  public void setBadge(int count) {
    if (count == 0) {
      ShortcutBadger.removeCount(this.getReactApplicationContext());
    } else {
      ShortcutBadger.applyCount(this.getReactApplicationContext(), count);
    }
  }

  @ReactMethod
  public void removeAllDeliveredNotifications() {
    notificationManager.cancelAll();
  }

  @ReactMethod
  public void hasPermission(Promise promise) {
    promise.resolve(hasPermissionInternal());
  }

  @ReactMethod
  public void getToken(Promise promise) {
    FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
      if (task.isSuccessful()) {
        promise.resolve(task.getResult());
      } else {
        promise.reject(task.getException());
      }
    });
  }

  @ReactMethod
  public void canRequestNotificationsPermissionFromUser(Promise promise) {
    promise.resolve(canRequestNotificationsPermissionInternal());
  }

  @ReactMethod
  public void requestNotificationsPermission(Promise promise) {
    if (!canRequestNotificationsPermissionInternal()) {
      // If this method is erroneously called on older Android we should
      // resolve to the value from notifications settings.
      promise.resolve(hasPermissionInternal());
      return;
    }

    if (ActivityCompat.shouldShowRequestPermissionRationale(
            getCurrentActivity(), Manifest.permission.POST_NOTIFICATIONS)) {
      // Since Android 13 user has to deny notifications permission
      // twice to remove possibility to show the prompt again. Details:
      // https://developer.android.com/training/permissions/requesting#handle-denial
      // On iOS user has to deny notifications permission once to disable the
      // prompt. We use the method above to mimic iOS behavior on Android.
      // Details:
      // https://developer.android.com/topic/performance/vitals/permissions#explain
      promise.resolve(hasPermissionInternal());
      return;
    }

    if (!notificationsPermissionRequestPromise.compareAndSet(null, promise)) {
      promise.reject(
          "Programmer error: permission request already in progress.");
      return;
    }

    ActivityCompat.requestPermissions(
        getCurrentActivity(),
        new String[] {Manifest.permission.POST_NOTIFICATIONS},
        CommAndroidNotifications.COMM_ANDROID_NOTIFICATIONS_REQUEST_CODE);
  }

  @Override
  public Map<String, Object> getConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put(
        "NOTIFICATIONS_IMPORTANCE_HIGH", NotificationManager.IMPORTANCE_HIGH);
    return constants;
  }

  public static void resolveNotificationsPermissionRequestPromise(
      Activity mainActivity,
      boolean isPermissionGranted) {
    if (notificationsPermissionRequestPromise.get() == null) {
      return;
    }

    notificationsPermissionRequestPromise.getAndSet(null).resolve(
        isPermissionGranted);
  }

  private boolean hasPermissionInternal() {
    return NotificationManagerCompat.from(getReactApplicationContext())
        .areNotificationsEnabled();
  }

  private boolean canRequestNotificationsPermissionInternal() {
    // Application has to explicitly request notifications permission from
    // user since Android 13. Older versions grant them by default. Details:
    // https://developer.android.com/develop/ui/views/notifications/notification-permission
    return android.os.Build.VERSION.SDK_INT >=
        android.os.Build.VERSION_CODES.TIRAMISU;
  }
}
