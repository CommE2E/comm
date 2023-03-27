package app.comm.android.notifications;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.ProcessLifecycleOwner;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import app.comm.android.ExpoUtils;
import app.comm.android.MainActivity;
import app.comm.android.R;
import app.comm.android.fbjni.CommSecureStore;
import app.comm.android.fbjni.GlobalDBSingleton;
import app.comm.android.fbjni.MessageOperationsUtilities;
import app.comm.android.fbjni.NetworkModule;
import app.comm.android.fbjni.ThreadOperations;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.File;
import me.leolin.shortcutbadger.ShortcutBadger;

public class CommNotificationsHandler extends FirebaseMessagingService {
  private static final String BADGE_KEY = "badge";
  private static final String BADGE_ONLY_KEY = "badgeOnly";
  private static final String BACKGROUND_NOTIF_TYPE_KEY = "backgroundNotifType";
  private static final String SET_UNREAD_STATUS_KEY = "setUnreadStatus";
  private static final String NOTIF_ID_KEY = "id";

  private static final String CHANNEL_ID = "default";
  private static final long[] VIBRATION_SPEC = {500, 500};
  private Bitmap displayableNotificationLargeIcon;
  private NotificationManager notificationManager;
  private LocalBroadcastManager localBroadcastManager;

  public static final String RESCIND_KEY = "rescind";
  public static final String RESCIND_ID_KEY = "rescindID";
  public static final String TITLE_KEY = "title";
  public static final String PREFIX_KEY = "prefix";
  public static final String BODY_KEY = "body";
  public static final String MESSAGE_INFOS_KEY = "messageInfos";
  public static final String THREAD_ID_KEY = "threadID";

  public static final String TOKEN_EVENT = "TOKEN_EVENT";
  public static final String MESSAGE_EVENT = "MESSAGE_EVENT";

  @Override
  public void onCreate() {
    super.onCreate();
    CommSecureStore.getInstance().initialize(
        ExpoUtils.createExpoSecureStoreSupplier(this.getApplicationContext()));
    notificationManager = (NotificationManager)this.getSystemService(
        Context.NOTIFICATION_SERVICE);
    localBroadcastManager = LocalBroadcastManager.getInstance(this);
    displayableNotificationLargeIcon = BitmapFactory.decodeResource(
        this.getApplicationContext().getResources(), R.mipmap.ic_launcher);
  }

  @Override
  public void onNewToken(String token) {
    Intent intent = new Intent(TOKEN_EVENT);
    intent.putExtra("token", token);
    localBroadcastManager.sendBroadcast(intent);
  }

  @Override
  public void onMessageReceived(RemoteMessage message) {
    String rescind = message.getData().get(RESCIND_KEY);
    if ("true".equals(rescind) &&
        android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
      handleNotificationRescind(message);
    }

    String badge = message.getData().get(BADGE_KEY);
    if (badge != null) {
      try {
        int badgeCount = Integer.parseInt(badge);
        if (badgeCount > 0) {
          ShortcutBadger.applyCount(this, badgeCount);
        } else {
          ShortcutBadger.removeCount(this);
        }
      } catch (NumberFormatException e) {
        Log.w("COMM", "Invalid badge count", e);
      }
    }

    String badgeOnly = message.getData().get(BADGE_ONLY_KEY);
    if ("1".equals(badgeOnly)) {
      return;
    }

    String backgroundNotifType =
        message.getData().get(BACKGROUND_NOTIF_TYPE_KEY);

    String rawMessageInfosString = message.getData().get(MESSAGE_INFOS_KEY);
    File sqliteFile =
        this.getApplicationContext().getDatabasePath("comm.sqlite");
    if (rawMessageInfosString != null && sqliteFile.exists()) {
      GlobalDBSingleton.scheduleOrRun(() -> {
        MessageOperationsUtilities.storeMessageInfos(
            sqliteFile.getPath(), rawMessageInfosString);
      });
    } else if (rawMessageInfosString != null) {
      Log.w("COMM", "Database not existing yet. Skipping notification");
    }

    Intent intent = new Intent(MESSAGE_EVENT);
    intent.putExtra("message", message);
    localBroadcastManager.sendBroadcast(intent);

    if (this.isAppInForeground()) {
      return;
    }
    this.displayNotification(message);
  }

  private boolean isAppInForeground() {
    return ProcessLifecycleOwner.get().getLifecycle().getCurrentState() ==
        Lifecycle.State.RESUMED;
  }

  private void handleNotificationRescind(RemoteMessage message) {
    String setUnreadStatus = message.getData().get(SET_UNREAD_STATUS_KEY);
    if ("true".equals(setUnreadStatus)) {
      File sqliteFile =
          this.getApplicationContext().getDatabasePath("comm.sqlite");
      if (sqliteFile.exists()) {
        String threadID = message.getData().get(THREAD_ID_KEY);
        GlobalDBSingleton.scheduleOrRun(() -> {
          ThreadOperations.updateSQLiteUnreadStatus(
              sqliteFile.getPath(), threadID, false);
        });
      } else {
        Log.w(
            "COMM",
            "Database not existing yet. Skipping thread status update.");
      }
    }
    String rescindID = message.getData().get(RESCIND_ID_KEY);
    for (StatusBarNotification notification :
         notificationManager.getActiveNotifications()) {
      String tag = notification.getTag();
      if (tag != null && tag.equals(rescindID)) {
        notificationManager.cancel(notification.getTag(), notification.getId());
      }
    }
  }

  private void displayNotification(RemoteMessage message) {
    if (message.getData().get(RESCIND_KEY) != null) {
      // don't attempt to display rescinds
      return;
    }
    String id = message.getData().get(NOTIF_ID_KEY);
    String title = message.getData().get(TITLE_KEY);
    String prefix = message.getData().get(PREFIX_KEY);
    String body = message.getData().get(BODY_KEY);
    String threadID = message.getData().get(THREAD_ID_KEY);

    if (prefix != null) {
      body = prefix + " " + body;
    }

    Bundle data = new Bundle();
    data.putString(THREAD_ID_KEY, threadID);

    PendingIntent startMainActivityAction =
        this.createStartMainActivityAction(message);

    NotificationCompat.Builder notificationBuilder =
        new NotificationCompat.Builder(this.getApplicationContext())
            .setDefaults(Notification.DEFAULT_ALL)
            .setContentText(body)
            .setExtras(data)
            .setChannelId(CHANNEL_ID)
            .setVibrate(VIBRATION_SPEC)
            .setSmallIcon(R.drawable.notif_icon)
            .setLargeIcon(displayableNotificationLargeIcon)
            .setAutoCancel(true)
            .setContentIntent(startMainActivityAction);

    if (title != null) {
      notificationBuilder = notificationBuilder.setContentTitle(title);
    }
    notificationManager.notify(id, id.hashCode(), notificationBuilder.build());
  }

  private PendingIntent createStartMainActivityAction(RemoteMessage message) {
    Intent intent =
        new Intent(this.getApplicationContext(), MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    intent.putExtra("message", message);

    return PendingIntent.getActivity(
        this.getApplicationContext(),
        message.getData().get(NOTIF_ID_KEY).hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
  }
}
