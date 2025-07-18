use actix_web::{
  error::{ErrorBadRequest, ErrorForbidden},
  web::{self, Bytes},
  HttpResponse, Responder,
};
use comm_lib::{
  auth::{AuthorizationCredential, UserIdentity},
  backup::{BackupVersionInfo, LatestBackupInfoResponse},
  blob::{
    client::BlobServiceClient,
    types::{http::BlobSizesRequest, BlobInfo},
  },
  http::{
    auth_service::Authenticated,
    multipart::{
      get_all_remaining_fields, get_named_text_field, get_text_field,
      parse_bytes_to_string,
    },
  },
  tools::Defer,
};
use std::{collections::HashMap, convert::Infallible};
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use tracing::{info, instrument, trace, warn};

use crate::identity::{find_keyserver_device_for_user, find_user_id};
use crate::{
  database::{backup_item::BackupItem, DatabaseClient},
  error::BackupError,
};

#[instrument(skip_all, fields(backup_id))]
pub async fn upload(
  user: UserIdentity,
  blob_client: Authenticated<BlobServiceClient>,
  db_client: web::Data<DatabaseClient>,
  mut multipart: actix_multipart::Multipart,
) -> actix_web::Result<HttpResponse> {
  let backup_id = get_named_text_field("backup_id", &mut multipart).await?;
  tracing::Span::current().record("backup_id", &backup_id);

  info!("Backup data upload started");

  let (user_keys_blob_info, user_keys_revoke) = multipart
    .forward_field_to_blob(&blob_client, "user_keys_hash", "user_keys")
    .await?;

  let (user_data_blob_info, user_data_revoke) = multipart
    .forward_field_to_blob(&blob_client, "user_data_hash", "user_data")
    .await?;

  let (attachments, attachments_revokes) =
    multipart.process_attachmens_field(&blob_client).await?;

  let aux_data = multipart.get_aux_data().await?;
  let siwe_backup_msg = aux_data.get_siwe_backup_msg()?;
  let version_info = aux_data
    .get_backup_version_info()?
    .ok_or(BackupError::BadRequest("missing_version_info"))?;

  let item = BackupItem::new(
    user.user_id.clone(),
    backup_id,
    user_keys_blob_info,
    Some(user_data_blob_info),
    attachments,
    siwe_backup_msg,
    version_info,
  );

  db_client
    .put_backup_item(item)
    .await
    .map_err(BackupError::from)?;

  user_keys_revoke.cancel();
  user_data_revoke.cancel();
  for attachment_revoke in attachments_revokes {
    attachment_revoke.cancel();
  }

  db_client
    .remove_old_backups(&user.user_id, &blob_client)
    .await
    .map_err(BackupError::from)?;

  Ok(HttpResponse::Ok().finish())
}

#[instrument(skip_all, fields(backup_id))]
pub async fn upload_user_keys(
  user: UserIdentity,
  blob_client: Authenticated<BlobServiceClient>,
  db_client: web::Data<DatabaseClient>,
  multipart: actix_multipart::Multipart,
) -> actix_web::Result<HttpResponse> {
  let (item, revokes) = upload_userkeys_and_create_backup_item(
    &db_client,
    &blob_client,
    multipart,
    &user.user_id,
  )
  .await?;

  db_client
    .put_backup_item(item)
    .await
    .map_err(BackupError::from)?;

  for revoke in revokes {
    revoke.cancel();
  }

  db_client
    .remove_old_backups(&user.user_id, &blob_client)
    .await
    .map_err(BackupError::from)?;

  Ok(HttpResponse::Ok().finish())
}

#[instrument(skip_all, fields(backup_id))]
pub async fn prepare_user_keys(
  requesting_identity: AuthorizationCredential,
  blob_client: Authenticated<BlobServiceClient>,
  db_client: web::Data<DatabaseClient>,
  mut multipart: actix_multipart::Multipart,
) -> actix_web::Result<HttpResponse> {
  match requesting_identity {
    AuthorizationCredential::ServicesToken(_) => (),
    _ => {
      return Err(ErrorForbidden(
        "This endpoint can only be called by other services",
      ));
    }
  };

  let user_id = get_named_text_field("user_id", &mut multipart).await?;

  let (item, revokes) = upload_userkeys_and_create_backup_item(
    &db_client,
    &blob_client,
    multipart,
    &user_id,
  )
  .await?;

  for revoke in revokes {
    revoke.cancel();
  }

  Ok(HttpResponse::Ok().json(item))
}

#[instrument(skip_all, fields(backup_id))]
pub async fn upload_user_data(
  user: UserIdentity,
  blob_client: Authenticated<BlobServiceClient>,
  db_client: web::Data<DatabaseClient>,
  mut multipart: actix_multipart::Multipart,
) -> actix_web::Result<HttpResponse> {
  let backup_id = get_named_text_field("backup_id", &mut multipart).await?;
  tracing::Span::current().record("backup_id", &backup_id);

  info!("Backup User Data upload started");

  let (user_data_blob_info, user_data_revoke) = multipart
    .forward_field_to_blob(&blob_client, "user_data_hash", "user_data")
    .await?;

  let (attachments, attachments_revokes) =
    multipart.process_attachmens_field(&blob_client).await?;

  let aux_data = multipart.get_aux_data().await?;
  let version_info = aux_data
    .get_backup_version_info()?
    .ok_or(BackupError::BadRequest("missing_version_info"))?;

  let existing_backup_item = db_client
    .find_backup_item(&user.user_id, &backup_id)
    .await
    .map_err(BackupError::from)?
    .ok_or(BackupError::NoBackup)?;

  let item = BackupItem::new(
    user.user_id.clone(),
    backup_id,
    existing_backup_item.user_keys.clone(),
    Some(user_data_blob_info),
    attachments,
    existing_backup_item.siwe_backup_msg.clone(),
    version_info,
  );

  db_client
    .put_backup_item(item)
    .await
    .map_err(BackupError::from)?;

  user_data_revoke.cancel();
  for attachment_revoke in attachments_revokes {
    attachment_revoke.cancel();
  }

  existing_backup_item.revoke_user_data_holders(&blob_client);

  db_client
    .remove_old_backups(&user.user_id, &blob_client)
    .await
    .map_err(BackupError::from)?;

  Ok(HttpResponse::Ok().finish())
}

#[instrument(skip_all, fields(backup_id = %path))]
pub async fn download_user_keys(
  user: UserIdentity,
  path: web::Path<String>,
  blob_client: Authenticated<BlobServiceClient>,
  db_client: web::Data<DatabaseClient>,
) -> actix_web::Result<HttpResponse> {
  info!("Download user keys request");
  let backup_id = path.into_inner();
  blob_utils::download_user_blob(
    |item| Ok(&item.user_keys),
    &user.user_id,
    &backup_id,
    blob_client.into_inner(),
    db_client,
  )
  .await
}

#[instrument(skip_all, fields(backup_id = %path))]
pub async fn download_user_data(
  user: UserIdentity,
  path: web::Path<String>,
  blob_client: Authenticated<BlobServiceClient>,
  db_client: web::Data<DatabaseClient>,
) -> actix_web::Result<HttpResponse> {
  info!("Download user data request");
  let backup_id = path.into_inner();
  blob_utils::download_user_blob(
    |item| item.user_data.as_ref().ok_or(BackupError::NoUserData),
    &user.user_id,
    &backup_id,
    blob_client.into_inner(),
    db_client,
  )
  .await
}

#[instrument(skip_all, fields(username = %path))]
pub async fn get_latest_backup_info(
  path: web::Path<String>,
  db_client: web::Data<DatabaseClient>,
  auth_service: comm_lib::auth::AuthService,
  blob_client: Authenticated<BlobServiceClient>,
) -> actix_web::Result<impl Responder> {
  info!("Latest backup info request.");

  let user_identifier = path.into_inner();
  let user_id = find_user_id(&user_identifier).await?;

  let Some(backup_item) = db_client
    .find_last_backup_item(&user_id)
    .await
    .map_err(BackupError::from)?
  else {
    return Err(BackupError::NoBackup.into());
  };

  let keyserver_device_id =
    find_keyserver_device_for_user(&user_id, &auth_service).await?;

  let total_backup_size = get_total_backup_size(
    &user_id,
    &backup_item.backup_id,
    &auth_service,
    &db_client,
    &blob_client,
  )
  .await?;

  let response = LatestBackupInfoResponse {
    backup_id: backup_item.backup_id,
    user_id,
    siwe_backup_msg: backup_item.siwe_backup_msg,
    keyserver_device_id,
    total_backup_size,
    creation_timestamp: backup_item.created.to_rfc3339(),
    version_info: backup_item.version_info,
  };

  Ok(web::Json(response))
}

#[instrument(skip_all, fields(username = %path))]
pub async fn download_latest_backup_keys(
  path: web::Path<String>,
  db_client: web::Data<DatabaseClient>,
  blob_client: Authenticated<BlobServiceClient>,
) -> actix_web::Result<HttpResponse> {
  info!("UserKeys download request.");

  let user_identifier = path.into_inner();
  let user_id = find_user_id(&user_identifier).await?;

  let Some(backup_item) = db_client
    .find_last_backup_item(&user_id)
    .await
    .map_err(BackupError::from)?
  else {
    return Err(BackupError::NoBackup.into());
  };

  let stream = blob_client
    .get(&backup_item.user_keys.blob_hash)
    .await
    .map_err(BackupError::from)?;

  Ok(
    HttpResponse::Ok()
      .content_type("application/octet-stream")
      .streaming(stream),
  )
}

async fn upload_userkeys_and_create_backup_item<'revoke, 'blob: 'revoke>(
  db_client: &DatabaseClient,
  blob_client: &'blob BlobServiceClient,
  mut multipart: actix_multipart::Multipart,
  user_id: &str,
) -> actix_web::Result<(BackupItem, Vec<Defer<'revoke>>)> {
  let backup_id = get_named_text_field("backup_id", &mut multipart).await?;
  tracing::Span::current().record("backup_id", &backup_id);
  info!("Backup User Keys upload started");

  let (user_keys_blob_info, user_keys_revoke) = multipart
    .forward_field_to_blob(blob_client, "user_keys_hash", "user_keys")
    .await?;

  let aux_data = multipart.get_aux_data().await?;
  let siwe_backup_msg = aux_data.get_siwe_backup_msg()?;
  let input_version_info = aux_data.get_backup_version_info()?;

  let ordered_backup_item = db_client
    .find_last_backup_item(user_id)
    .await
    .map_err(BackupError::from)?;

  let old_backup_item = match ordered_backup_item {
    None => None,
    Some(item) => db_client
      .find_backup_item(user_id, &item.backup_id)
      .await
      .map_err(BackupError::from)?,
  };

  let mut revokes = vec![user_keys_revoke];

  // copy user data and logs from old backup item, but assign new holders for all blobs
  let (user_data, attachments, version_info) = match old_backup_item {
    // old clients didn't upload version info so use defaults
    None => (None, Vec::new(), input_version_info.unwrap_or_default()),
    // If attachments and user_data exists, we need to create holder.
    // Otherwise, cleanup can remove this data.
    Some(item) => {
      tracing::debug!("Found existing backup item, copying data.");
      let attachments_hashes: Vec<String> = item
        .attachments
        .iter()
        .map(|attachment| attachment.blob_hash.clone())
        .collect();
      let (attachments, attachments_revokes) =
        blob_utils::create_holders_for_blob_hashes(
          attachments_hashes,
          blob_client,
        )
        .await?;

      revokes.extend(attachments_revokes);

      let user_data = if let Some(data) = item.user_data {
        let (blob_info, defer) =
          blob_utils::create_holder_for_hash(&data.blob_hash, blob_client)
            .await?;
        revokes.push(defer);

        Some(blob_info)
      } else {
        None
      };

      // version info is absent when uplodaing UserKeys by Identity.
      // We should copy it along with UserData and attachments.
      let version_info = input_version_info.unwrap_or(item.version_info);

      let log_revoke = db_client
        .copy_log_items_to_new_backup(
          user_id,
          &item.backup_id,
          &backup_id,
          blob_client,
        )
        .await?;
      revokes.push(log_revoke);

      (user_data, attachments, version_info)
    }
  };

  let item = BackupItem::new(
    user_id.to_string(),
    backup_id,
    user_keys_blob_info,
    user_data,
    attachments,
    siwe_backup_msg,
    version_info,
  );

  Ok((item, revokes))
}

#[tracing::instrument(skip_all, fields(backup_id))]
async fn get_total_backup_size(
  user_id: &str,
  backup_id: &str,
  auth_service: &comm_lib::auth::AuthService,
  db_client: &DatabaseClient,
  blob_client: &BlobServiceClient,
) -> Result<u64, BackupError> {
  let backup_item = db_client
    .find_backup_item(user_id, backup_id)
    .await?
    .ok_or(BackupError::NoBackup)?;

  // gather blob infos for backup item
  let mut blob_infos = backup_item.attachments;
  blob_infos.push(backup_item.user_keys);
  blob_infos.extend(backup_item.user_data);

  // gather blob infos and DDB size for logs
  let (log_blob_infos, ddb_logs_size) = db_client
    .get_blob_infos_and_size_for_logs(user_id, &backup_item.backup_id)
    .await?;
  blob_infos.extend(log_blob_infos);

  // we have to re-auth blob client with s2s token because the sizes endpoint is service-only
  let credential = auth_service.get_services_token().await?;
  let blob_client = blob_client.with_authentication(credential.into());

  // query Blob Service for blobs size
  let blob_hashes = blob_infos.into_iter().map(|it| it.blob_hash).collect();
  let total_blobs_size = blob_client
    .fetch_blob_sizes(BlobSizesRequest { blob_hashes })
    .await?
    .total_size();

  let total_backup_size = total_blobs_size + ddb_logs_size;
  tracing::debug!(
    total_blobs_size,
    ddb_logs_size,
    total_backup_size,
    "Calculated backup size."
  );

  Ok(total_backup_size)
}

trait BackupRequestInput {
  /// Consumes two next fields: blob hash and blob data
  /// and uploads content to Blob Service, returning a BlobInfo
  /// and a revoke handle for deleting the uploaded blob
  /// in case of further failure. The revoke has to be later
  /// canceled.
  async fn forward_field_to_blob<'revoke, 'blob: 'revoke>(
    &mut self,
    blob_client: &'blob BlobServiceClient,
    hash_field_name: &str,
    data_field_name: &str,
  ) -> actix_web::Result<(BlobInfo, Defer<'revoke>)>;

  /// Consumes a text field named `attachments`.
  /// For each attachment hash, establishes a new blob holder.
  /// Returns BlobInfos and a revoke handle for removing the holder
  /// in case of further failure. All revokes have to be later
  /// canceled.
  async fn process_attachmens_field<'revoke, 'blob: 'revoke>(
    &mut self,
    blob_client: &'blob BlobServiceClient,
  ) -> Result<(Vec<BlobInfo>, Vec<Defer<'revoke>>), BackupError>;

  /// Consumes all remaining fields and stores them in [`BackupAuxFields`]
  async fn get_aux_data(&mut self) -> actix_web::Result<BackupAuxFields>;
}

impl BackupRequestInput for actix_multipart::Multipart {
  #[instrument(skip_all, fields(hash_field_name, data_field_name))]
  async fn forward_field_to_blob<'revoke, 'blob: 'revoke>(
    &mut self,
    blob_client: &'blob BlobServiceClient,
    hash_field_name: &str,
    data_field_name: &str,
  ) -> actix_web::Result<(BlobInfo, Defer<'revoke>)> {
    trace!("Reading blob fields: {hash_field_name:?}, {data_field_name:?}");

    let multipart = self;
    let blob_hash = get_named_text_field(hash_field_name, multipart).await?;

    let Some(mut field) = multipart.try_next().await? else {
      warn!("Malformed request: expected a field.");
      return Err(ErrorBadRequest("multipart_field_expected"))?;
    };
    if field.name() != data_field_name {
      warn!(
        hash_field_name,
        "Malformed request: '{data_field_name}' data field expected."
      );
      return Err(ErrorBadRequest("missing_data_field"))?;
    }

    let blob_info = BlobInfo {
      blob_hash,
      holder: uuid::Uuid::new_v4().to_string(),
    };

    // [`actix_multipart::Multipart`] isn't [`std::marker::Send`], and so we cannot pass it to the blob client directly.
    // Instead we have to forward it to a channel and create stream from the receiver.
    let (tx, rx) = tokio::sync::mpsc::channel(1);
    let receive_promise = async move {
      trace!("Receiving blob data");
      // [`actix_multipart::MultipartError`] isn't [`std::marker::Send`] so we return it here, and pass [`Infallible`]
      // as the error to the channel
      while let Some(chunk) = field.try_next().await? {
        if let Err(err) = tx.send(Result::<Bytes, Infallible>::Ok(chunk)).await
        {
          warn!("Error when sending data through a channel: '{err}'");
          // Error here means that the channel has been closed from the blob client side. We don't want to return an error
          // here, because `tokio::try_join!` only returns the first error it receives and we want to prioritize the backup
          // client error.
          break;
        }
      }
      trace!("Finished receiving blob data");
      Result::<(), actix_web::Error>::Ok(())
    };

    let data_stream = ReceiverStream::new(rx);
    let send_promise = async {
      blob_client
        .simple_put(&blob_info.blob_hash, &blob_info.holder, data_stream)
        .await
        .map_err(BackupError::from)?;

      Ok(())
    };

    tokio::try_join!(receive_promise, send_promise)?;

    let revoke_info = blob_info.clone();
    let revoke_holder = Defer::new(|| {
      blob_client
        .schedule_revoke_holder(revoke_info.blob_hash, revoke_info.holder)
    });

    Ok((blob_info, revoke_holder))
  }

  #[instrument(skip_all)]
  async fn process_attachmens_field<'revoke, 'blob: 'revoke>(
    &mut self,
    blob_client: &'blob BlobServiceClient,
  ) -> Result<(Vec<BlobInfo>, Vec<Defer<'revoke>>), BackupError> {
    let attachments_hashes: Vec<String> = match get_text_field(self).await {
      Ok(Some((name, attachments))) => {
        if name != "attachments" {
          warn!(
            name,
            "Malformed request: 'attachments' text field expected."
          );
          return Err(BackupError::BadRequest("attachments_field_expected"));
        }

        attachments.lines().map(ToString::to_string).collect()
      }
      Ok(None) => Vec::new(),
      Err(_) => return Err(BackupError::BadRequest("multipart_error")),
    };

    blob_utils::create_holders_for_blob_hashes(attachments_hashes, blob_client)
      .await
  }

  async fn get_aux_data(&mut self) -> actix_web::Result<BackupAuxFields> {
    let field_map = get_all_remaining_fields(self).await?;
    Ok(BackupAuxFields(field_map))
  }
}

struct BackupAuxFields(HashMap<String, Vec<u8>>);

impl BackupAuxFields {
  fn get_siwe_backup_msg(&self) -> actix_web::Result<Option<String>> {
    let Some(buf) = self.0.get("siwe_backup_msg") else {
      return Ok(None);
    };

    let siwe_backup_msg = parse_bytes_to_string(buf.clone())?;
    Ok(Some(siwe_backup_msg))
  }

  fn get_backup_version_info(
    &self,
  ) -> actix_web::Result<Option<BackupVersionInfo>> {
    let Some(buf) = self.0.get("version_info") else {
      return Ok(None);
    };

    let version_info = serde_json::from_slice(buf)?;
    Ok(Some(version_info))
  }
}

mod blob_utils {
  use super::*;

  pub async fn download_user_blob(
    data_extractor: impl FnOnce(&BackupItem) -> Result<&BlobInfo, BackupError>,
    user_id: &str,
    backup_id: &str,
    blob_client: BlobServiceClient,
    db_client: web::Data<DatabaseClient>,
  ) -> actix_web::Result<HttpResponse> {
    let backup_item = db_client
      .find_backup_item(user_id, backup_id)
      .await
      .map_err(BackupError::from)?
      .ok_or(BackupError::NoBackup)?;

    let blob_info = data_extractor(&backup_item)?;

    let stream = blob_client
      .get(&blob_info.blob_hash)
      .await
      .map_err(BackupError::from)?;

    Ok(
      HttpResponse::Ok()
        .content_type("application/octet-stream")
        .streaming(stream),
    )
  }

  pub async fn create_holders_for_blob_hashes<'revoke, 'blob: 'revoke>(
    hashes: Vec<String>,
    blob_client: &'blob BlobServiceClient,
  ) -> Result<(Vec<BlobInfo>, Vec<Defer<'revoke>>), BackupError> {
    let mut blob_infos = Vec::new();
    let mut revokes = Vec::new();
    for hash in hashes {
      let (blob_info, revoke) =
        create_holder_for_hash(&hash, blob_client).await?;
      blob_infos.push(blob_info);
      revokes.push(revoke);
    }

    Ok((blob_infos, revokes))
  }

  #[instrument(skip_all)]
  pub async fn create_holder_for_hash<'revoke, 'blob: 'revoke>(
    hash: &str,
    blob_client: &'blob BlobServiceClient,
  ) -> Result<(BlobInfo, Defer<'revoke>), BackupError> {
    let holder = uuid::Uuid::new_v4().to_string();

    if !blob_client
      .assign_holder(hash, &holder)
      .await
      .map_err(BackupError::from)?
    {
      warn!("Blob with hash {hash:?} doesn't exist");
    }

    let revoke_hash = hash.to_string();
    let revoke_holder = holder.clone();
    let revoke_holder = Defer::new(|| {
      blob_client.schedule_revoke_holder(revoke_hash, revoke_holder)
    });

    let blob_info = BlobInfo {
      blob_hash: hash.to_string(),
      holder,
    };

    Ok((blob_info, revoke_holder))
  }
}
