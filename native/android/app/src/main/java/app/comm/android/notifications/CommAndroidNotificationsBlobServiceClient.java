package app.comm.android.notifications;

import android.util.Log;
import com.google.firebase.messaging.RemoteMessage;
import java.io.IOException;
import java.lang.OutOfMemoryError;
import java.util.Base64;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.json.JSONException;
import org.json.JSONObject;

public class CommAndroidNotificationsBlobServiceClient {
  private static final String BLOB_SERVICE_URL =
      "https://blob.commtechnologies.org";
  // The FirebaseMessagingService docs state that message
  // processing should complete within at most 20 seconds
  // window. Therefore we limit http time call to 15 seconds
  // https://firebase.google.com/docs/cloud-messaging/android/receive#handling_messages
  private static final int NOTIFICATION_PROCESSING_TIME_LIMIT = 15;
  // OkHttp docs advise to share OkHttpClient instances
  // https://square.github.io/okhttp/4.x/okhttp/okhttp3/-ok-http-client/#okhttpclients-should-be-shared
  private static final OkHttpClient httpClient =
      new OkHttpClient.Builder()
          .callTimeout(NOTIFICATION_PROCESSING_TIME_LIMIT, TimeUnit.SECONDS)
          .build();

  @FunctionalInterface
  public interface BlobServiceMessageConsumer {
    void accept(RemoteMessage message, byte[] blob);
  }

  public void getAndConsumeAsync(
      String blobHash,
      RemoteMessage message,
      BlobServiceMessageConsumer successConsumer,
      Consumer<RemoteMessage> fallbackConsumer) {
    String authToken = getAuthToken();
    Request request = new Request.Builder()
                          .get()
                          .url(BLOB_SERVICE_URL + "/blob/" + blobHash)
                          .header("Authorization", authToken)
                          .build();

    httpClient.newCall(request).enqueue(new Callback() {
      @Override
      public void onFailure(Call call, IOException e) {
        fallbackConsumer.accept(message);
        Log.w("COMM", "Failed to download blob from blob service.", e);
        call.cancel();
      }

      @Override
      public void onResponse(Call call, Response response) {
        try {
          successConsumer.accept(message, response.body().bytes());
        } catch (OutOfMemoryError e) {
          fallbackConsumer.accept(message);
          Log.w("COMM", "Notification payload exceeds available memory.", e);
        } catch (IOException e) {
          fallbackConsumer.accept(message);
          Log.w("COMM", "Unable to get payload from HTTP response.", e);
        }
      }
    });
  }

  private String getAuthToken() {
    // Authentication data are retrieved on every request
    // since they might change while CommNotificationsHandler
    // thread is running so we should not rely on caching
    // them in memory.

    // TODO: retrieve those values from CommSecureStore

    String userID = "placeholder";
    String accessToken = "placeholder";
    String deviceID = "placeholder";

    String authObjectJsonBody;
    try {
      authObjectJsonBody = new JSONObject()
                               .put("userID", userID)
                               .put("accessToken", accessToken)
                               .put("deviceID", deviceID)
                               .toString();
    } catch (JSONException e) {
      Log.w("COMM", "Failed to build authentication token as JSON object.", e);
      return null;
    }

    String encodedAuthObjectJsonBody =
        Base64.getEncoder().encodeToString(authObjectJsonBody.getBytes());

    return "Bearer " + encodedAuthObjectJsonBody;
  }
}
