package app.comm.android.notifications;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
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
import me.leolin.shortcutbadger.ShortcutBadger;

public class CommAndroidNotifications extends ReactContextBaseJavaModule {
  private NotificationManager notificationManager;

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
    boolean enabled =
        NotificationManagerCompat.from(getReactApplicationContext())
            .areNotificationsEnabled();
    promise.resolve(enabled);
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

  @Override
  public Map<String, Object> getConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put(
        "NOTIFICATIONS_IMPORTANCE_HIGH", NotificationManager.IMPORTANCE_HIGH);
    return constants;
  }
}
