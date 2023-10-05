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
import android.util.JsonReader;
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
import app.comm.android.fbjni.NotificationsCryptoModule;
import app.comm.android.fbjni.StaffUtils;
import app.comm.android.fbjni.ThreadOperations;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.File;
import java.lang.StringBuilder;
import java.util.ArrayList;
import java.util.Arrays;
import me.leolin.shortcutbadger.ShortcutBadger;
import org.json.JSONException;
import org.json.JSONObject;

public class CommNotificationsHandler extends FirebaseMessagingService {
  private static final String BADGE_KEY = "badge";
  private static final String BADGE_ONLY_KEY = "badgeOnly";
  private static final String BACKGROUND_NOTIF_TYPE_KEY = "backgroundNotifType";
  private static final String SET_UNREAD_STATUS_KEY = "setUnreadStatus";
  private static final String NOTIF_ID_KEY = "id";
  private static final String ENCRYPTED_PAYLOAD_KEY = "encryptedPayload";
  private static final String ENCRYPTION_FAILED_KEY = "encryptionFailed";
  private static final String GROUP_NOTIF_IDS_KEY = "groupNotifIDs";
  private static final String COLLAPSE_ID_KEY = "collapseKey";
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
    if (message.getData().get(ENCRYPTED_PAYLOAD_KEY) != null) {
      try {
        message = this.decryptRemoteMessage(message);
      } catch (JSONException e) {
        Log.w("COMM", "Malformed notification JSON payload.", e);
        return;
      } catch (IllegalStateException e) {
        Log.w("COMM", "Android notification type violation.", e);
        return;
      } catch (Exception e) {
        Log.w("COMM", "Notification decryption failure.", e);
        return;
      }
    } else if ("1".equals(message.getData().get(ENCRYPTION_FAILED_KEY))) {
      Log.w(
          "COMM",
          "Received unencrypted notification for client with existing olm session for notifications");
    }

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
    intent.putExtra(
        "message", serializeMessageDataForIntentAttachment(message));
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

  private boolean notificationGroupingSupported() {
    // Comm doesn't support notification grouping for clients running
    // Android versions older than 23
    return android.os.Build.VERSION.SDK_INT > android.os.Build.VERSION_CODES.M;
  }

  private void handleNotificationRescind(RemoteMessage message) {
    String setUnreadStatus = message.getData().get(SET_UNREAD_STATUS_KEY);
    String threadID = message.getData().get(THREAD_ID_KEY);
    if ("true".equals(setUnreadStatus)) {
      File sqliteFile =
          this.getApplicationContext().getDatabasePath("comm.sqlite");
      if (sqliteFile.exists()) {
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
    boolean groupSummaryPresent = false;
    boolean threadGroupPresent = false;

    for (StatusBarNotification notification :
         notificationManager.getActiveNotifications()) {
      String tag = notification.getTag();
      boolean isGroupMember =
          threadID.equals(notification.getNotification().getGroup());
      boolean isGroupSummary =
          (notification.getNotification().flags &
           Notification.FLAG_GROUP_SUMMARY) == Notification.FLAG_GROUP_SUMMARY;

      if (tag != null && tag.equals(rescindID)) {
        notificationManager.cancel(notification.getTag(), notification.getId());
      } else if (
          isGroupMember && isGroupSummary && StaffUtils.isStaffRelease()) {
        groupSummaryPresent = true;
        removeNotificationFromGroupSummary(threadID, rescindID, notification);
      } else if (isGroupMember && isGroupSummary) {
        groupSummaryPresent = true;
      } else if (isGroupMember) {
        threadGroupPresent = true;
      } else if (isGroupSummary && StaffUtils.isStaffRelease()) {
        checkForUnmatchedRescind(threadID, rescindID, notification);
      }
    }

    if (groupSummaryPresent && !threadGroupPresent) {
      notificationManager.cancel(threadID, threadID.hashCode());
    }
  }

  private void addToThreadGroupAndDisplay(
      String notificationID,
      NotificationCompat.Builder notificationBuilder,
      String threadID) {

    notificationBuilder.setGroup(threadID).setGroupAlertBehavior(
        NotificationCompat.GROUP_ALERT_CHILDREN);

    NotificationCompat.Builder groupSummaryNotificationBuilder =
        new NotificationCompat.Builder(this.getApplicationContext())
            .setChannelId(CHANNEL_ID)
            .setSmallIcon(R.drawable.notif_icon)
            .setContentIntent(
                this.createStartMainActivityAction(threadID, threadID))
            .setGroup(threadID)
            .setGroupSummary(true)
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN);

    if (StaffUtils.isStaffRelease()) {
      ArrayList<String> groupNotifIDs =
          recordNotificationInGroupSummary(threadID, notificationID);

      String notificationSummaryBody =
          "Notif IDs: " + String.join(System.lineSeparator(), groupNotifIDs);

      Bundle data = new Bundle();
      data.putStringArrayList(GROUP_NOTIF_IDS_KEY, groupNotifIDs);

      groupSummaryNotificationBuilder
          .setContentTitle("Summary for thread id " + threadID)
          .setExtras(data)
          .setStyle(new NotificationCompat.BigTextStyle().bigText(
              notificationSummaryBody))
          .setAutoCancel(false);
    } else {
      groupSummaryNotificationBuilder.setAutoCancel(true);
    }

    notificationManager.notify(
        notificationID, notificationID.hashCode(), notificationBuilder.build());
    notificationManager.notify(
        threadID, threadID.hashCode(), groupSummaryNotificationBuilder.build());
  }

  private void displayNotification(RemoteMessage message) {
    if (message.getData().get(RESCIND_KEY) != null) {
      // don't attempt to display rescinds
      return;
    }
    String id = message.getData().get(NOTIF_ID_KEY);
    String collapseKey = message.getData().get(COLLAPSE_ID_KEY);
    String notificationID = id;

    if (collapseKey != null) {
      notificationID = collapseKey;
    }

    String title = message.getData().get(TITLE_KEY);
    String prefix = message.getData().get(PREFIX_KEY);
    String body = message.getData().get(BODY_KEY);
    String threadID = message.getData().get(THREAD_ID_KEY);

    if (prefix != null) {
      body = prefix + " " + body;
    }

    Bundle data = new Bundle();
    data.putString(THREAD_ID_KEY, threadID);

    NotificationCompat.Builder notificationBuilder =
        new NotificationCompat.Builder(this.getApplicationContext())
            .setDefaults(Notification.DEFAULT_ALL)
            .setContentText(body)
            .setExtras(data)
            .setChannelId(CHANNEL_ID)
            .setVibrate(VIBRATION_SPEC)
            .setSmallIcon(R.drawable.notif_icon)
            .setLargeIcon(displayableNotificationLargeIcon)
            .setAutoCancel(true);

    if (title != null) {
      notificationBuilder.setContentTitle(title);
    }

    if (threadID != null) {
      notificationBuilder.setContentIntent(
          this.createStartMainActivityAction(id, threadID));
    }

    if (!this.notificationGroupingSupported() || threadID == null) {
      notificationManager.notify(
          notificationID,
          notificationID.hashCode(),
          notificationBuilder.build());
      return;
    }
    this.addToThreadGroupAndDisplay(
        notificationID, notificationBuilder, threadID);
  }

  private PendingIntent
  createStartMainActivityAction(String notificationID, String threadID) {
    Intent intent =
        new Intent(this.getApplicationContext(), MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    intent.putExtra("threadID", threadID);

    return PendingIntent.getActivity(
        this.getApplicationContext(),
        notificationID.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
  }

  private RemoteMessage decryptRemoteMessage(RemoteMessage message)
      throws JSONException, IllegalStateException {
    String encryptedSerializedPayload =
        message.getData().get(ENCRYPTED_PAYLOAD_KEY);
    String decryptedSerializedPayload = NotificationsCryptoModule.decrypt(
        encryptedSerializedPayload,
        NotificationsCryptoModule.olmEncryptedTypeMessage(),
        "CommNotificationsHandler");

    JSONObject decryptedPayload = new JSONObject(decryptedSerializedPayload);

    ((Iterable<String>)() -> decryptedPayload.keys())
        .forEach(payloadFieldName -> {
          if (decryptedPayload.optJSONArray(payloadFieldName) != null ||
              decryptedPayload.optJSONObject(payloadFieldName) != null) {
            throw new IllegalStateException(
                "Notification payload JSON is not {[string]: string} type.");
          }
          String payloadFieldValue =
              decryptedPayload.optString(payloadFieldName);
          message.getData().put(payloadFieldName, payloadFieldValue);
        });
    return message;
  }

  private Bundle
  serializeMessageDataForIntentAttachment(RemoteMessage message) {
    Bundle bundle = new Bundle();
    message.getData().forEach(bundle::putString);
    return bundle;
  }

  private void displayErrorMessageNotification(
      String errorMessage,
      String errorTitle,
      String largeErrorData) {

    NotificationCompat.Builder errorNotificationBuilder =
        new NotificationCompat.Builder(this.getApplicationContext())
            .setDefaults(Notification.DEFAULT_ALL)
            .setChannelId(CHANNEL_ID)
            .setSmallIcon(R.drawable.notif_icon)
            .setLargeIcon(displayableNotificationLargeIcon);

    if (errorMessage != null) {
      errorNotificationBuilder.setContentText(errorMessage);
    }

    if (errorTitle != null) {
      errorNotificationBuilder.setContentTitle(errorTitle);
    }

    if (largeErrorData != null) {
      errorNotificationBuilder.setStyle(
          new NotificationCompat.BigTextStyle().bigText(largeErrorData));
    }

    notificationManager.notify(
        errorMessage,
        errorMessage.hashCode(),
        errorNotificationBuilder.build());
  }

  private boolean
  isGroupSummary(StatusBarNotification notification, String threadID) {
    boolean isAnySummary = (notification.getNotification().flags &
                            Notification.FLAG_GROUP_SUMMARY) != 0;
    if (threadID == null) {
      return isAnySummary;
    }
    return isAnySummary &&
        threadID.equals(notification.getNotification().getGroup());
  }

  private ArrayList<String>
  recordNotificationInGroupSummary(String threadID, String notificationID) {
    ArrayList<String> groupNotifIDs =
        Arrays.stream(notificationManager.getActiveNotifications())
            .filter(notif -> isGroupSummary(notif, threadID))
            .findFirst()
            .map(
                notif
                -> notif.getNotification().extras.getStringArrayList(
                    GROUP_NOTIF_IDS_KEY))
            .orElse(new ArrayList<>());

    groupNotifIDs.add(notificationID);
    return groupNotifIDs;
  }

  private void removeNotificationFromGroupSummary(
      String threadID,
      String notificationID,
      StatusBarNotification groupSummaryNotification) {
    ArrayList<String> groupNotifIDs =
        groupSummaryNotification.getNotification().extras.getStringArrayList(
            GROUP_NOTIF_IDS_KEY);
    if (groupNotifIDs == null) {
      displayErrorMessageNotification(
          "Empty summary notif for thread ID " + threadID,
          "Empty Summary Notif",
          "Summary notification for thread ID " + threadID +
              " had empty body when rescinding " + notificationID);
    }

    boolean notificationRemoved =
        groupNotifIDs.removeIf(notifID -> notifID.equals(notificationID));

    if (!notificationRemoved) {
      displayErrorMessageNotification(
          "Notif with ID " + notificationID + " not in " + threadID,
          "Unrecorded Notif",
          "Rescinded notification with id " + notificationID +
              " not found in group summary for thread id " + threadID);
      return;
    }

    String notificationSummaryBody =
        "Notif IDs: " + String.join(System.lineSeparator(), groupNotifIDs);

    Bundle data = new Bundle();
    data.putStringArrayList(GROUP_NOTIF_IDS_KEY, groupNotifIDs);

    NotificationCompat.Builder groupSummaryNotificationBuilder =
        new NotificationCompat.Builder(this.getApplicationContext())
            .setChannelId(CHANNEL_ID)
            .setSmallIcon(R.drawable.notif_icon)
            .setContentIntent(
                this.createStartMainActivityAction(threadID, threadID))
            .setContentTitle("Summary for thread id " + threadID)
            .setExtras(data)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(
                notificationSummaryBody))
            .setGroup(threadID)
            .setGroupSummary(true)
            .setAutoCancel(false)
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN);

    notificationManager.notify(
        threadID, threadID.hashCode(), groupSummaryNotificationBuilder.build());
  }

  private void checkForUnmatchedRescind(
      String threadID,
      String notificationID,
      StatusBarNotification anySummaryNotification) {
    ArrayList<String> anyGroupNotifIDs =
        anySummaryNotification.getNotification().extras.getStringArrayList(
            GROUP_NOTIF_IDS_KEY);
    if (anyGroupNotifIDs == null) {
      return;
    }

    String groupID = anySummaryNotification.getNotification().getGroup();
    for (String notifID : anyGroupNotifIDs) {
      if (!notificationID.equals(notifID)) {
        continue;
      }

      displayErrorMessageNotification(
          "Summary for thread id " + groupID + "has " + notifID,
          "Rescind Mismatch",
          "Summary notif for thread id " + groupID + " contains notif id " +
              notifID + " which was received in rescind with thread id " +
              threadID);
    }
  }
}
