package app.comm.android.fbjni;

import app.comm.android.commservices.CommAndroidServicesClient;
import java.io.IOException;
import org.json.JSONException;
import org.json.JSONObject;

public class NotificationsInboundKeysProvider {
  public static String getNotifsInboundKeysForDeviceID(String deviceID)
      throws IOException, JSONException {
    JSONObject notifInboundKeys =
        CommAndroidServicesClient.getInstance()
            .getNotifsInboundKeysForDeviceSync(deviceID);
    String curve25519 = notifInboundKeys.getString("curve25519");
    return new JSONObject().put("curve25519", curve25519).toString();
  }
}
