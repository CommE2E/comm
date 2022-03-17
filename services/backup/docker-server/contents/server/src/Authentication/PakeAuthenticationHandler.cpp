#include "PakeAuthenticationHandler.h"

namespace comm {
namespace network {
namespace auth {

/**
message PakeAuthenticationRequestData {
  oneof data {
    PakeRegistrationRequestAndUserID pakeRegistrationRequestAndUserID = 1;
    bytes pakeRegistrationUpload = 2;
    bytes pakeCredentialRequest = 3;
    bytes pakeCredentialFinalization = 4;
    bytes pakeClientMAC = 5;
  }
}

message PakeAuthenticationResponseData {
  oneof data {
    bytes pakeRegistrationResponse = 1;
    bool pakeRegistrationSuccess = 2;
    bytes pakeCredentialResponse = 3;
    bytes pakeServerMAC = 4;
  }
}

flow:
REGISTRATION
client => PakeRegistrationRequestAndUserID => server
server => pakeRegistrationResponse => client
REGISTRATION_UPLOAD
client => pakeRegistrationUpload => server
server => pakeRegistrationSuccess => client
CREDENTIAL
client => pakeCredentialRequest => server
server => pakeCredentialResponse => client
CREDENTIAL_FINALIZATION
client => pakeCredentialFinalization => server
server => pakeServerMAC => client
MAC_EXCHANGE
client => pakeClientMAC => server
server => empty response => client

authentication is done
*/

PakeAuthenticationHandler::PakeAuthenticationHandler(
    AuthenticationType authenticationType)
    : authenticationType(authenticationType) {
}

backup::FullAuthenticationResponseData *
PakeAuthenticationHandler::processRequest(
    const backup::FullAuthenticationRequestData &request) {
  backup::PakeAuthenticationRequestData requestData =
      request.pakeauthenticationrequestdata();
  backup::PakeAuthenticationResponseData *responseData =
      new backup::PakeAuthenticationResponseData();

  if (this->getState() != AuthenticationState::IN_PROGRESS) {
    throw std::runtime_error(
        "authentication is terminated but additional action has been "
        "requested");
  }

  // todo in case of any failure you can:
  // - throw here - that terminates the connection
  // - set `this->state = AuthenticationState::FAIL;` and throw in the outter
  // scope
  switch (this->pakeState) {
    case PakeAuthenticationState::REGISTRATION: {
      if (!requestData.has_pakeregistrationrequestanduserid()) {
        throw std::runtime_error("registration data expected but not received");
      }
      std::string userID =
          requestData.pakeregistrationrequestanduserid().userid();
      std::string registrationData =
          requestData.pakeregistrationrequestanduserid()
              .pakeregistrationrequest();
      // todo process with PAKE lib
      // ...
      // responseData->set_pakeregistrationresponse("...");
      this->pakeState = PakeAuthenticationState::REGISTRATION_UPLOAD;
      break;
    }
    case PakeAuthenticationState::REGISTRATION_UPLOAD: {
      if (!requestData.has_pakeregistrationupload()) {
        throw std::runtime_error(
            "registration upload data expected but not received");
      }
      // requestData.pakeregistrationupload();
      // todo process with PAKE lib
      // ...
      // responseData->set_pakeregistrationsuccess(true/false);
      this->pakeState = PakeAuthenticationState::CREDENTIAL;
      break;
    }
    case PakeAuthenticationState::CREDENTIAL: {
      if (!requestData.has_pakecredentialrequest()) {
        throw std::runtime_error("credential data expected but not received");
      }
      // requestData.pakecredentialrequest();
      // todo process with PAKE lib
      // ...
      // responseData->set_pakecredentialresponse("...");
      this->pakeState = PakeAuthenticationState::CREDENTIAL_FINALIZATION;
      break;
    }
    case PakeAuthenticationState::CREDENTIAL_FINALIZATION: {
      if (!requestData.has_pakecredentialfinalization()) {
        throw std::runtime_error(
            "credential finalization expected but not received");
      }
      // requestData.pakecredentialfinalization();
      // todo process with PAKE lib
      // ...
      // responseData->set_pakeservermac("...");
      this->pakeState = PakeAuthenticationState::MAC_EXCHANGE;
      break;
    }
    case PakeAuthenticationState::MAC_EXCHANGE: {
      if (!requestData.has_pakeclientmac()) {
        throw std::runtime_error("client mac expected but not received");
      }
      // requestData.pakeclientmac();
      // todo process with PAKE lib
      // ...

      // mock a success for now
      this->state = AuthenticationState::SUCCESS;
      break;
    }
  }
  backup::FullAuthenticationResponseData *response =
      new backup::FullAuthenticationResponseData();
  response->set_allocated_pakeauthenticationresponsedata(responseData);
  return response;
}

AuthenticationType PakeAuthenticationHandler::getAuthenticationType() const {
  return this->authenticationType;
}

} // namespace auth
} // namespace network
} // namespace comm
