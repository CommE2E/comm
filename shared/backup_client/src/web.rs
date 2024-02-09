use crate::{BackupClient, RequestedData};
use futures_util::TryStreamExt;
use std::time::Duration;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::js_sys::{self, Function as JSFunction, Uint8Array};

#[wasm_bindgen]
impl BackupClient {
  #[wasm_bindgen(constructor)]
  pub fn wasm_new(url: &str) -> Result<BackupClient, JsError> {
    Ok(BackupClient::new(url)?)
  }

  #[wasm_bindgen(js_name = "downloadBackupData")]
  pub async fn wasm_download_backup_data(
    &self,
    backup_descriptor: JsValue,
    requested_data: RequestedData,
  ) -> Result<Uint8Array, JsError> {
    let backup_descriptor = serde_wasm_bindgen::from_value(backup_descriptor)?;
    let data = self
      .download_backup_data(&backup_descriptor, requested_data)
      .await?;

    Ok(Uint8Array::from(&data[..]))
  }

  #[wasm_bindgen(js_name = "downloadLogs")]
  pub async fn wasm_download_logs(
    &self,
    user_identity: JsValue,
    backup_id: String,
    f: &JSFunction,
  ) -> Result<(), JsError> {
    let user_identity = serde_wasm_bindgen::from_value(user_identity)?;
    let stream = self.download_logs(&user_identity, &backup_id).await;
    let mut stream = Box::pin(stream);

    let this = JsValue::null();
    while let Some(log) = stream.try_next().await? {
      let value = JsValue::from(Uint8Array::from(&log.content[..]));
      let promise = f
        .call1(&this, &value)
        .map_err(|_| JsError::new("Log callback failed"))?;
      let promise = js_sys::Promise::from(promise);
      wasm_bindgen_futures::JsFuture::from(promise)
        .await
        .map_err(|_| JsError::new("Log callback future failed"))?;
    }

    Ok(())
  }
}

pub async fn sleep(duration: Duration) -> Result<JsValue, JsValue> {
  let mut cb = |resolve: JSFunction, reject: JSFunction| {
    let Some(window) = web_sys::window() else {
      let _ = reject.call0(&JsValue::null());
      return;
    };

    let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
      &resolve,
      duration.as_millis() as i32,
    );
  };

  let p = js_sys::Promise::new(&mut cb);

  wasm_bindgen_futures::JsFuture::from(p).await
}
