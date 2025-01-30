use actix_web::{
  error::{ErrorBadRequest, ErrorForbidden},
  web::{self, Bytes},
  HttpResponse, Responder,
};
use comm_lib::{
  auth::{AuthorizationCredential, UserIdentity},
  backup::LatestBackupInfoResponse,
  blob::{client::BlobServiceClient, types::BlobInfo},
  http::{
    auth_service::Authenticated,
    multipart::{get_named_text_field, get_text_field},
  },
  tools::Defer,
};
use std::convert::Infallible;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use tracing::{info, instrument, trace, warn};

use crate::identity::find_user_id;
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
  let blob_client = blob_client.with_user_identity(user.clone());
  tracing::Span::current().record("backup_id", &backup_id);

  info!("Backup data upload started");

  let (user_keys_blob_info, user_keys_revoke) = forward_field_to_blob(
    &mut multipart,
    &blob_client,
    "user_keys_hash",
    "user_keys",
  )
  .await?;

  let (user_data_blob_info, user_data_revoke) = forward_field_to_blob(
    &mut multipart,
    &blob_client,
    "user_data_hash",
    "user_data",
  )
  .await?;

  let (attachments, attachments_revokes) =
    process_attachments(&mut multipart, &blob_client).await?;

  let siwe_backup_msg = get_siwe_backup_msg(&mut multipart).await?;

  let item = BackupItem::new(
    user.user_id.clone(),
    backup_id,
    user_keys_blob_info,
    Some(user_data_blob_info),
    attachments,
    siwe_backup_msg,
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
  let blob_client = blob_client.with_user_identity(user.clone());

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
  let blob_client = blob_client.with_user_identity(user.clone());
  tracing::Span::current().record("backup_id", &backup_id);

  info!("Backup User Data upload started");

  let (user_data_blob_info, user_data_revoke) = forward_field_to_blob(
    &mut multipart,
    &blob_client,
    "user_data_hash",
    "user_data",
  )
  .await?;

  let (attachments, attachments_revokes) =
    process_attachments(&mut multipart, &blob_client).await?;

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

#[instrument(skip_all, fields(hash_field_name, data_field_name))]
async fn forward_field_to_blob<'revoke, 'blob: 'revoke>(
  multipart: &mut actix_multipart::Multipart,
  blob_client: &'blob BlobServiceClient,
  hash_field_name: &str,
  data_field_name: &str,
) -> actix_web::Result<(BlobInfo, Defer<'revoke>)> {
  trace!("Reading blob fields: {hash_field_name:?}, {data_field_name:?}");

  let blob_hash = get_named_text_field(hash_field_name, multipart).await?;

  let Some(mut field) = multipart.try_next().await? else {
    warn!("Malformed request: expected a field.");
    return Err(ErrorBadRequest("Bad request"))?;
  };
  if field.name() != data_field_name {
    warn!(
      hash_field_name,
      "Malformed request: '{data_field_name}' data field expected."
    );
    return Err(ErrorBadRequest("Bad request"))?;
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
      if let Err(err) = tx.send(Result::<Bytes, Infallible>::Ok(chunk)).await {
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
async fn create_holder<'revoke, 'blob: 'revoke>(
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

async fn process_blob_hashes<'revoke, 'blob: 'revoke>(
  hashes: Vec<String>,
  blob_client: &'blob BlobServiceClient,
) -> Result<(Vec<BlobInfo>, Vec<Defer<'revoke>>), BackupError> {
  let mut blob_infos = Vec::new();
  let mut revokes = Vec::new();
  for hash in hashes {
    let (blob_info, revoke) = create_holder(&hash, blob_client).await?;
    blob_infos.push(blob_info);
    revokes.push(revoke);
  }

  Ok((blob_infos, revokes))
}

#[instrument(skip_all)]
async fn process_attachments<'revoke, 'blob: 'revoke>(
  multipart: &mut actix_multipart::Multipart,
  blob_client: &'blob BlobServiceClient,
) -> Result<(Vec<BlobInfo>, Vec<Defer<'revoke>>), BackupError> {
  let attachments_hashes: Vec<String> = match get_text_field(multipart).await {
    Ok(Some((name, attachments))) => {
      if name != "attachments" {
        warn!(
          name,
          "Malformed request: 'attachments' text field expected."
        );
        return Err(BackupError::BadRequest);
      }

      attachments.lines().map(ToString::to_string).collect()
    }
    Ok(None) => Vec::new(),
    Err(_) => return Err(BackupError::BadRequest),
  };

  process_blob_hashes(attachments_hashes, blob_client).await
}

#[instrument(skip_all)]
pub async fn get_siwe_backup_msg(
  multipart: &mut actix_multipart::Multipart,
) -> actix_web::Result<Option<String>> {
  Ok(
    get_text_field(multipart)
      .await?
      .filter(|(name, _)| name == "siwe_backup_msg")
      .map(|(_, siwe_backup_msg)| siwe_backup_msg),
  )
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
  download_user_blob(
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
  download_user_blob(
    |item| item.user_data.as_ref().ok_or(BackupError::NoUserData),
    &user.user_id,
    &backup_id,
    blob_client.into_inner(),
    db_client,
  )
  .await
}

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

#[instrument(skip_all, fields(username = %path))]
pub async fn get_latest_backup_info(
  path: web::Path<String>,
  db_client: web::Data<DatabaseClient>,
) -> actix_web::Result<impl Responder> {
  let user_identifier = path.into_inner();
  let user_id = find_user_id(&user_identifier).await?;

  let Some(backup_item) = db_client
    .find_last_backup_item(&user_id)
    .await
    .map_err(BackupError::from)?
  else {
    return Err(BackupError::NoBackup.into());
  };

  let response = LatestBackupInfoResponse {
    backup_id: backup_item.backup_id,
    user_id,
    siwe_backup_msg: backup_item.siwe_backup_msg,
  };

  Ok(web::Json(response))
}

#[instrument(skip_all, fields(username = %path))]
pub async fn download_latest_backup_keys(
  path: web::Path<String>,
  db_client: web::Data<DatabaseClient>,
  blob_client: Authenticated<BlobServiceClient>,
) -> actix_web::Result<HttpResponse> {
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

  let (user_keys_blob_info, user_keys_revoke) = forward_field_to_blob(
    &mut multipart,
    blob_client,
    "user_keys_hash",
    "user_keys",
  )
  .await?;

  let siwe_backup_msg = get_siwe_backup_msg(&mut multipart).await?;
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

  let (user_data, attachments) = match old_backup_item.clone() {
    None => (None, Vec::new()),
    // If attachments and user_data exists, we need to create holder.
    // Otherwise, cleanup can remove this data.
    Some(item) => {
      let attachments_hashes: Vec<String> = item
        .attachments
        .iter()
        .map(|attachment| attachment.blob_hash.clone())
        .collect();

      let (attachments, attachments_revokes) =
        process_blob_hashes(attachments_hashes, blob_client).await?;

      revokes.extend(attachments_revokes);

      match item.user_data {
        None => (None, attachments),
        Some(data) => {
          let (blob_infos, defers) =
            process_blob_hashes(vec![data.blob_hash], blob_client).await?;

          let blob_info = blob_infos
            .into_iter()
            .next()
            .ok_or(BackupError::BadRequest)?;
          revokes.extend(defers);

          (Some(blob_info), attachments)
        }
      }
    }
  };

  let item = BackupItem::new(
    user_id.to_string(),
    backup_id,
    user_keys_blob_info,
    user_data,
    attachments,
    siwe_backup_msg,
  );

  Ok((item, revokes))
}
