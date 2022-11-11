package app.comm.android;

import android.app.NotificationManager;
import android.content.Context;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import app.comm.android.fbjni.CommSecureStore;
import app.comm.android.fbjni.GlobalDBSingleton;
import app.comm.android.fbjni.MessageOperationsUtilities;
import app.comm.android.fbjni.NetworkModule;
import app.comm.android.fbjni.ThreadOperations;
import com.google.firebase.messaging.RemoteMessage;
import io.invertase.firebase.messaging.RNFirebaseMessagingService;
import java.io.File;
import me.leolin.shortcutbadger.ShortcutBadger;

/**
 * We're extending RNFirebaseMessagingService here instead of
 * FirebaseMessagingService which is not ideal but let's us work around an
 * Android limitation. If there are a couple of FirebaseMessagingServices
 * declared in manifest, only the first one would get all the notifications.
 * So we need to find a way to have only one service that implements this.
 *
 * There are a couple of solutions here:
 * 1. We could have both services declared and only one of them would handle
 * the intents. Then it would check the intent and forward it to
 * another service. This solution is problematic as the second service would
 * need to listen for a different set of intents that effectively duplicate
 * all the notifications intents.
 * 2. We can instantiate RNFirebaseMessagingService here and call its callbacks
 * which sounds like a good solution. But then, some mechanisms would not work
 * correctly, e.g. we would need to somehow take care of the Context.
 * 3. This solution, in which we extend RNFirebaseMessagingService, would
 * consist of implementing the callbacks and either handling them or calling
 * super methods. In near future we plan to get rid of
 * RNFirebaseMessagingService and at that point super methods will no longer be
 * called and this class could start implementing FirebaseMessagingService.
 *
 * There's nothing that makes 1st and 2nd solution impossible, but 3rd one is
 * the easiest in terms of making it safe.
 */
public class CommNotificationsHandler extends RNFirebaseMessagingService {
  private static final String RESCIND_KEY = "rescind";
  private static final String RESCIND_ID_KEY = "rescindID";
  private static final String BADGE_KEY = "badge";
  private static final String BADGE_ONLY_KEY = "badgeOnly";
  private static final String BACKGROUND_NOTIF_TYPE_KEY = "backgroundNotifType";
  private static final String THREAD_ID_KEY = "threadID";
  private static final String SET_UNREAD_STATUS_KEY = "setUnreadStatus";
  private static final String MESSAGE_INFOS_KEY = "messageInfos";
  private NotificationManager notificationManager;

  @Override
  public void onCreate() {
    super.onCreate();
    CommSecureStore.getInstance().initialize(
        ExpoUtils.createExpoSecureStoreSupplier(this.getApplicationContext()));
    notificationManager = (NotificationManager)this.getSystemService(
        Context.NOTIFICATION_SERVICE);
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

    super.onMessageReceived(message);
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
      if (notification.getTag().equals(rescindID)) {
        notificationManager.cancel(notification.getTag(), notification.getId());
      }
    }
  }
}
