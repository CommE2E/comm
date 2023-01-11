package app.comm.android.notifications;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

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
}
