package app.comm.android.notifications;

import android.content.Context;
import android.util.Log;
import androidx.work.Data;
import androidx.work.ListenableWorker.Result;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.IOException;
import java.util.function.Consumer;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.json.JSONException;
import org.json.JSONObject;

public class DeleteBlobWork extends Worker {

  private static final int MAX_RETRY_ATTEMPTS = 10;

  public DeleteBlobWork(Context context, WorkerParameters params) {
    super(context, params);
  }

  @Override
  public Result doWork() {
    String blobHash = getInputData().getString(
        CommAndroidNotificationsBlobServiceClient.BLOB_HASH_KEY);
    String blobHolder = getInputData().getString(
        CommAndroidNotificationsBlobServiceClient.BLOB_HOLDER_KEY);

    String jsonBody;
    try {
      jsonBody =
          new JSONObject()
              .put(
                  CommAndroidNotificationsBlobServiceClient.BLOB_HASH_KEY,
                  blobHash)
              .put(
                  CommAndroidNotificationsBlobServiceClient.BLOB_HOLDER_KEY,
                  blobHolder)
              .toString();
    } catch (JSONException e) {
      // This should never happen since the code
      // throwing is just simple JSON creation.
      // If it happens there is no way to retry
      // so we fail immediately.
      Log.w(
          "COMM",
          "Failed to create JSON from blob hash and holder provided.",
          e);
      return Result.failure();
    }

    String authToken = CommAndroidNotificationsBlobServiceClient.getAuthToken();
    RequestBody requestBody =
        RequestBody.create(MediaType.parse("application/json"), jsonBody);
    Request request =
        new Request.Builder()
            .delete(requestBody)
            .url(
                CommAndroidNotificationsBlobServiceClient.BLOB_SERVICE_URL +
                "/blob")
            .header("Authorization", authToken)
            .build();

    try {
      Response response =
          CommAndroidNotificationsBlobServiceClient.httpClient.newCall(request)
              .execute();
      if (response.isSuccessful()) {
        return Result.success();
      }
      Log.w(
          "COMM",
          "Failed to execute blob deletion request. HTTP code:" +
              response.code() + " status: " + response.message());
      return retryOrFail();
    } catch (IOException e) {
      Log.w(
          "COMM",
          "IO exception occurred while issuing blob deletion request.",
          e);
      return retryOrFail();
    }
  }

  private Result retryOrFail() {
    if (getRunAttemptCount() > MAX_RETRY_ATTEMPTS) {
      return Result.failure();
    }
    return Result.retry();
  }
}