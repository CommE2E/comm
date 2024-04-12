use lazy_static::lazy_static;
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IdentityPublicKeys {
  pub ed25519: String,
  pub curve25519: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClientPublicKeys {
  pub primary_identity_public_keys: IdentityPublicKeys,
  pub notification_identity_public_keys: IdentityPublicKeys,
}

lazy_static! {
  pub static ref DEFAULT_CLIENT_KEYS: ClientPublicKeys = ClientPublicKeys {
    primary_identity_public_keys: IdentityPublicKeys {
      ed25519: "cSlL+VLLJDgtKSPlIwoCZg0h0EmHlQoJC08uV/O+jvg".to_string(),
      curve25519: "Y4ZIqzpE1nv83kKGfvFP6rifya0itRg2hifqYtsISnk".to_string(),
    },
    notification_identity_public_keys: IdentityPublicKeys {
      ed25519: "D0BV2Y7Qm36VUtjwyQTJJWYAycN7aMSJmhEsRJpW2mk".to_string(),
      curve25519: "DYmV8VdkjwG/VtC8C53morogNJhpTPT/4jzW0/cxzQo".to_string(),
    }
  };
  pub static ref MOCK_CLIENT_KEYS_1: ClientPublicKeys = ClientPublicKeys {
    primary_identity_public_keys: IdentityPublicKeys {
      ed25519: "lbp5cS9fH5NnWIJbZ57wGBzDBGvmjoq6gMBHsIyXfJ4".to_string(),
      curve25519: "x74rEeVzfTcjm+B2yLN/wgfvHEzEtphQ/JeQfIrzPzQ".to_string(),
    },
    notification_identity_public_keys: IdentityPublicKeys {
      ed25519: "+mi3TltiSK2883cm0TK2mkSKPcQb+WVfshltTSVgA2Y".to_string(),
      curve25519: "GI8V9FwOYIqxB2TzQN31nXKR8y3/B3k+ZOCgxkTlUlI".to_string(),
    },
  };
  pub static ref MOCK_CLIENT_KEYS_2: ClientPublicKeys = ClientPublicKeys {
    primary_identity_public_keys: IdentityPublicKeys {
      ed25519: "ZXx1ADCFxFm6P+UmVhX0A1tuqUoBU7lYjig/gMzSEJI".to_string(),
      curve25519: "zHfP5eeD3slrgidtNRknHw3NKtJ7hA+vinaT3ACIhRA".to_string(),
    },
    notification_identity_public_keys: IdentityPublicKeys {
      ed25519: "TqzVFQLnJvt9JfMVU54d6InEd/wQV3DCplBuj5axTlU".to_string(),
      curve25519: "nRVVaf+Iz2MfEFtQtzrvV/EmTivqKpOeHlCt9OWYUxM".to_string(),
    },
  };
}

pub fn get_random_otk() -> String {
  rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(43)
    .map(char::from)
    .collect()
}
