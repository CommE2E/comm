use commtest::identity::device::{
  register_user_device, register_user_device_with_farcaster, DeviceInfo,
  DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use grpc_clients::identity::authenticated::ChainedInterceptedAuthClient;
use grpc_clients::identity::protos::unauth::Empty;
use grpc_clients::identity::PlatformMetadata;
use grpc_clients::identity::{
  get_auth_client,
  protos::auth::{
    LinkFarcasterAccountRequest, LinkFarcasterDCsAccountRequest,
    UserIdentitiesRequest,
  },
};
use rand::{distributions::Alphanumeric, Rng};

async fn get_client_for_device(
  device_info: &DeviceInfo,
) -> ChainedInterceptedAuthClient {
  get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id.clone(),
    device_info.device_id.clone(),
    device_info.access_token.clone(),
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service")
}

fn generate_test_farcaster_id() -> String {
  rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(16)
    .collect()
}

fn generate_test_farcaster_dcs_token() -> String {
  let token: String = rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(32)
    .collect();
  format!("dcs_token_{}", token)
}

async fn verify_user_farcaster_data(
  device_info: &DeviceInfo,
  expected_farcaster_id: Option<&str>,
  expected_has_dcs_token: bool,
) {
  let mut client = get_client_for_device(device_info).await;

  let request = UserIdentitiesRequest {
    user_ids: vec![device_info.user_id.clone()],
  };

  let response = client
    .find_user_identities(request)
    .await
    .expect("Failed to query user identities")
    .into_inner();

  let user_identity = response
    .identities
    .get(&device_info.user_id)
    .expect("User identity should exist");

  assert_eq!(user_identity.farcaster_id.as_deref(), expected_farcaster_id);
  assert_eq!(
    user_identity.has_farcaster_dcs_token,
    expected_has_dcs_token
  );
}

#[tokio::test]
async fn test_link_farcaster_account_success() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  let farcaster_id = generate_test_farcaster_id();
  let request = LinkFarcasterAccountRequest {
    farcaster_id: farcaster_id.clone(),
  };

  let response = client
    .link_farcaster_account(request)
    .await
    .expect("Failed to link farcaster account");

  assert_eq!(response.into_inner(), Empty {});

  verify_user_farcaster_data(
    &device_info,
    Some(&farcaster_id),
    false, // No DCs token yet
  )
  .await;
}

#[tokio::test]
async fn test_link_farcaster_account_duplicate_fid() {
  // Register two users
  let device_info1 = register_user_device(None, None).await;
  let device_info2 = register_user_device(None, None).await;

  // Generate the same farcaster ID for both users to test duplicate prevention
  let shared_farcaster_id = generate_test_farcaster_id();

  // Link farcaster account for first user
  let mut client1 = get_client_for_device(&device_info1).await;

  let request1 = LinkFarcasterAccountRequest {
    farcaster_id: shared_farcaster_id.clone(),
  };

  client1
    .link_farcaster_account(request1)
    .await
    .expect("Failed to link farcaster account for first user");

  // Try to link same farcaster ID for second user - should fail
  let mut client2 = get_client_for_device(&device_info2).await;

  let request2 = LinkFarcasterAccountRequest {
    farcaster_id: shared_farcaster_id,
  };

  let result = client2.link_farcaster_account(request2).await;
  assert!(
    result.is_err(),
    "Should fail when trying to link already taken farcaster ID"
  );
}

#[tokio::test]
async fn test_link_farcaster_account_idempotent() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  let farcaster_id = generate_test_farcaster_id();
  let request = LinkFarcasterAccountRequest {
    farcaster_id: farcaster_id.clone(),
  };

  // Link first time
  client
    .link_farcaster_account(request)
    .await
    .expect("Failed to link farcaster account first time");

  // Link again with same ID - should be idempotent
  let request2 = LinkFarcasterAccountRequest { farcaster_id };
  let response = client
    .link_farcaster_account(request2)
    .await
    .expect("Failed to link farcaster account second time");

  assert_eq!(response.into_inner(), Empty {});
}

#[tokio::test]
async fn test_dcs_token_farcaster_relink() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  let farcaster_id = generate_test_farcaster_id();

  // 1. Link farcaster ID
  client
    .link_farcaster_account(LinkFarcasterAccountRequest {
      farcaster_id: farcaster_id.clone(),
    })
    .await
    .expect("Failed to link farcaster ID");

  // 2. Link DCs token for the same farcaster ID
  client
    .link_farcaster_d_cs_account(LinkFarcasterDCsAccountRequest {
      farcaster_id: farcaster_id.clone(),
      farcaster_dcs_token: generate_test_farcaster_dcs_token(),
    })
    .await
    .expect("Failed to link DCs token");

  // 3. Verify both farcaster ID and DCs token exist
  verify_user_farcaster_data(
    &device_info,
    Some(&farcaster_id),
    true, // has DCs token
  )
  .await;

  // 4. Re-link the same farcaster ID
  client
    .link_farcaster_account(LinkFarcasterAccountRequest {
      farcaster_id: farcaster_id.clone(),
    })
    .await
    .expect("Failed to re-link same farcaster ID");

  // 5. Verify farcaster ID and that token hasn't changed
  verify_user_farcaster_data(&device_info, Some(&farcaster_id), true).await;
}

#[tokio::test]
async fn test_link_farcaster_dcs_account_success() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  let farcaster_id = generate_test_farcaster_id();

  // First link farcaster ID
  let link_id_request = LinkFarcasterAccountRequest {
    farcaster_id: farcaster_id.clone(),
  };

  client
    .link_farcaster_account(link_id_request)
    .await
    .expect("Failed to link farcaster ID");

  // Then link DCs token with same farcaster ID
  let link_dcs_request = LinkFarcasterDCsAccountRequest {
    farcaster_id: farcaster_id.clone(),
    farcaster_dcs_token: generate_test_farcaster_dcs_token(),
  };

  let response = client
    .link_farcaster_d_cs_account(link_dcs_request)
    .await
    .expect("Failed to link farcaster DCs account");

  assert_eq!(response.into_inner(), Empty {});

  verify_user_farcaster_data(&device_info, Some(&farcaster_id), true).await;
}

#[tokio::test]
async fn test_link_farcaster_dcs_account_without_fid() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  // Try to link DCs token without first linking farcaster ID - should fail
  let request = LinkFarcasterDCsAccountRequest {
    farcaster_id: generate_test_farcaster_id(),
    farcaster_dcs_token: generate_test_farcaster_dcs_token(),
  };

  let result = client.link_farcaster_d_cs_account(request).await;
  assert!(
    result.is_err(),
    "Should fail when trying to link DCs token without farcaster ID"
  );
}

#[tokio::test]
async fn test_unlink_farcaster_account_success() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  // First link farcaster account
  let link_request = LinkFarcasterAccountRequest {
    farcaster_id: generate_test_farcaster_id(),
  };

  client
    .link_farcaster_account(link_request)
    .await
    .expect("Failed to link farcaster account");

  // Then unlink it
  let response = client
    .unlink_farcaster_account(Empty {})
    .await
    .expect("Failed to unlink farcaster account");

  assert_eq!(response.into_inner(), Empty {});

  verify_user_farcaster_data(&device_info, None, false).await;
}

#[tokio::test]
async fn test_unlink_farcaster_account_idempotent() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  // Unlink without linking first - should be idempotent
  let response = client
    .unlink_farcaster_account(Empty {})
    .await
    .expect("Failed to unlink farcaster account");

  assert_eq!(response.into_inner(), Empty {});
}

#[tokio::test]
async fn test_complete_farcaster_workflow() {
  let device_info = register_user_device(None, None).await;
  let mut client = get_client_for_device(&device_info).await;

  let farcaster_id = generate_test_farcaster_id();

  // 1. Link farcaster ID
  let link_id_request = LinkFarcasterAccountRequest {
    farcaster_id: farcaster_id.clone(),
  };

  client
    .link_farcaster_account(link_id_request)
    .await
    .expect("Failed to link farcaster ID");

  // Verify farcaster ID is linked but no DCs token yet
  verify_user_farcaster_data(&device_info, Some(&farcaster_id), false).await;

  // 2. Link DCs token with same farcaster ID
  let link_dcs_request = LinkFarcasterDCsAccountRequest {
    farcaster_id: farcaster_id.clone(),
    farcaster_dcs_token: generate_test_farcaster_dcs_token(),
  };

  client
    .link_farcaster_d_cs_account(link_dcs_request)
    .await
    .expect("Failed to link farcaster DCs token");

  // Verify both farcaster ID and DCs token are linked
  verify_user_farcaster_data(&device_info, Some(&farcaster_id), true).await;

  // 3. Unlink everything
  let response = client
    .unlink_farcaster_account(Empty {})
    .await
    .expect("Failed to unlink farcaster account");

  assert_eq!(response.into_inner(), Empty {});

  // Verify everything is unlinked
  verify_user_farcaster_data(&device_info, None, false).await;
}

#[tokio::test]
async fn test_register_user_with_farcaster_id_only() {
  let farcaster_id = generate_test_farcaster_id();
  let device_info = register_user_device_with_farcaster(
    None,
    None,
    Some(farcaster_id.clone()),
    None,
    None,
  )
  .await;

  // Verify farcaster ID was set during registration
  verify_user_farcaster_data(&device_info, Some(&farcaster_id), false).await;

  let mut client = get_client_for_device(&device_info).await;

  // User should be able to link same farcaster ID (idempotent)
  let link_request = LinkFarcasterAccountRequest {
    farcaster_id: farcaster_id.clone(),
  };

  let response = client
    .link_farcaster_account(link_request)
    .await
    .expect("Failed to link same farcaster account");

  assert_eq!(response.into_inner(), Empty {});

  // Verify data is still there after idempotent operation
  verify_user_farcaster_data(&device_info, Some(&farcaster_id), false).await;
}

#[tokio::test]
async fn test_register_user_with_full_farcaster_data() {
  let farcaster_id = generate_test_farcaster_id();
  let device_info = register_user_device_with_farcaster(
    None,
    None,
    Some(farcaster_id.clone()),
    Some(generate_test_farcaster_dcs_token()),
    None,
  )
  .await;

  // Verify both farcaster ID and DCs token were set during registration
  verify_user_farcaster_data(&device_info, Some(&farcaster_id), true).await;
  let mut client = get_client_for_device(&device_info).await;

  // User should be able to link a different DCs token (updates existing)
  let link_dcs_request = LinkFarcasterDCsAccountRequest {
    farcaster_id: farcaster_id.clone(),
    farcaster_dcs_token: generate_test_farcaster_dcs_token(),
  };

  let response = client
    .link_farcaster_d_cs_account(link_dcs_request)
    .await
    .expect("Failed to link farcaster DCs token");

  assert_eq!(response.into_inner(), Empty {});
}

#[tokio::test]
async fn test_register_user_with_farcaster_id_prevents_duplicate() {
  // Generate shared farcaster ID for this test
  let shared_farcaster_id = generate_test_farcaster_id();

  // Register first user with farcaster ID
  register_user_device_with_farcaster(
    None,
    None,
    Some(shared_farcaster_id.clone()),
    None,
    None,
  )
  .await;

  // Register second user normally
  let device_info2 = register_user_device(None, None).await;
  let mut client2 = get_client_for_device(&device_info2).await;

  // Second user should not be able to link same farcaster ID
  let link_request = LinkFarcasterAccountRequest {
    farcaster_id: shared_farcaster_id,
  };

  let result = client2.link_farcaster_account(link_request).await;
  assert!(
    result.is_err(),
    "Should fail when trying to link already taken farcaster ID"
  );
}
