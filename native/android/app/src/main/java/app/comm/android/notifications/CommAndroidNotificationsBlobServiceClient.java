package app.comm.android.notifications;

import android.util.Log;
import com.google.firebase.messaging.RemoteMessage;
import java.io.IOException;
import java.lang.OutOfMemoryError;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

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
    Request request = new Request.Builder()
                          .get()
                          .url(BLOB_SERVICE_URL + "/blob/" + blobHash)
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
}
