package app.comm.android.commservices;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.WorkRequest;
import app.comm.android.BuildConfig;
import app.comm.android.fbjni.CommSecureStore;
import java.io.IOException;
import java.lang.OutOfMemoryError;
import java.util.Base64;
import java.util.concurrent.TimeUnit;
import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.json.JSONException;
import org.json.JSONObject;

public class CommAndroidBlobClient {
  // The FirebaseMessagingService docs state that message
  // processing should complete within at most 20 seconds
  // window. Therefore we limit http time call to 15 seconds
  // https://firebase.google.com/docs/cloud-messaging/android/receive#handling_messages
  private static final int NOTIF_PROCESSING_TIME_LIMIT_SECONDS = 15;
  // OkHttp docs advise to share OkHttpClient instances
  // https://square.github.io/okhttp/4.x/okhttp/okhttp3/-ok-http-client/#okhttpclients-should-be-shared
  public static final OkHttpClient httpClient =
      new OkHttpClient.Builder()
          .callTimeout(NOTIF_PROCESSING_TIME_LIMIT_SECONDS, TimeUnit.SECONDS)
          .build();

  public static final String BLOB_SERVICE_URL = BuildConfig.DEBUG
      ? "https://blob.staging.commtechnologies.org"
      : "https://blob.commtechnologies.org";
  public static final String BLOB_HASH_KEY = "blob_hash";
  public static final String BLOB_HOLDER_KEY = "holder";

  public byte[] getBlobSync(String blobHash) throws IOException, JSONException {
    String authToken = getAuthToken();
    Request request = new Request.Builder()
                          .get()
                          .url(BLOB_SERVICE_URL + "/blob/" + blobHash)
                          .header("Authorization", authToken)
                          .build();

    Response response = httpClient.newCall(request).execute();
    if (!response.isSuccessful()) {
      throw new RuntimeException(
          "Failed to download blob from blob service. Response error code: " +
          response);
    }
    return response.body().bytes();
  }

  public void scheduleDeferredBlobDeletion(
      String blobHash,
      String blobHolder,
      Context context) {
    Constraints constraints = new Constraints.Builder()
                                  .setRequiredNetworkType(NetworkType.CONNECTED)
                                  .build();
    WorkRequest deleteBlobWorkRequest =
        new OneTimeWorkRequest.Builder(CommAndroidDeleteBlobWork.class)
            .setConstraints(constraints)
            .setInitialDelay(
                NOTIF_PROCESSING_TIME_LIMIT_SECONDS, TimeUnit.SECONDS)
            .setInputData(new Data.Builder()
                              .putString(BLOB_HASH_KEY, blobHash)
                              .putString(BLOB_HOLDER_KEY, blobHolder)
                              .build())
            .build();

    WorkManager.getInstance(context).enqueue(deleteBlobWorkRequest);
  }

  public static String getAuthToken() throws JSONException {
    // Authentication data are retrieved on every request
    // since they might change while CommNotificationsHandler
    // thread is running so we should not rely on caching
    // them in memory.

    String userID = CommSecureStore.get("userID");
    String accessToken = CommSecureStore.get("accessToken");
    String deviceID = CommSecureStore.get("deviceID");

    userID = userID == null ? "" : userID;
    accessToken = accessToken == null ? "" : accessToken;
    deviceID = deviceID == null ? "" : deviceID;

    String authObjectJsonBody = new JSONObject()
                                    .put("userID", userID)
                                    .put("accessToken", accessToken)
                                    .put("deviceID", deviceID)
                                    .toString();

    String encodedAuthObjectJsonBody =
        Base64.getEncoder().encodeToString(authObjectJsonBody.getBytes());

    return "Bearer " + encodedAuthObjectJsonBody;
  }
}
