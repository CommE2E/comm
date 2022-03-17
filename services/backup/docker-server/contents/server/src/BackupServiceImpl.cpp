#include "BackupServiceImpl.h"

#include "AuthenticationManager.h"
#include "ServerBidiReactorBase.h"
#include "ServerReadReactorBase.h"

#include <aws/core/Aws.h>

namespace comm {
namespace network {

BackupServiceImpl::BackupServiceImpl() {
  Aws::InitAPI({});
}

BackupServiceImpl::~BackupServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::ServerBidiReactor<
    backup::CreateNewBackupRequest,
    backup::CreateNewBackupResponse> *
BackupServiceImpl::CreateNewBackup(grpc::CallbackServerContext *context) {
  class CreateNewBackupReactor : public ServerBidiReactorBase<
                                     backup::CreateNewBackupRequest,
                                     backup::CreateNewBackupResponse> {
    enum class State {
      AUTHENTICATION = 1,
      KEY_ENTROPY = 2,
      DATA_CHUNKS = 3,
    };

    State state = State::AUTHENTICATION;
    auth::AuthenticationManager authenticationManager;
    std::string keyEntropy;

  public:
    std::unique_ptr<grpc::Status> handleRequest(
        backup::CreateNewBackupRequest request,
        backup::CreateNewBackupResponse *response) override {
      std::cout << "here handle request" << std::endl;
      switch (this->state) {
        case State::AUTHENTICATION: {
          if (this->authenticationManager.getState() !=
                  auth::AuthenticationState::SUCCESS &&
              !request.has_authenticationrequestdata()) {
            throw std::runtime_error(
                "authentication has not been finished properly");
          }
          if (this->authenticationManager.getState() ==
              auth::AuthenticationState::FAIL) {
            throw std::runtime_error("authentication failure");
          }
          if (this->authenticationManager.getState() !=
              auth::AuthenticationState::SUCCESS) {
            std::cout << "here handle request auth" << std::endl;
            backup::FullAuthenticationResponseData *authResponse =
                this->authenticationManager.processRequest(
                    request.authenticationrequestdata());
            if (this->authenticationManager.getState() ==
                auth::AuthenticationState::SUCCESS) {
              this->state = State::KEY_ENTROPY;
            }
            response->set_allocated_authenticationresponsedata(authResponse);
            return nullptr;
          }
          throw std::runtime_error(
              "invalid state, still authenticating while authentication's "
              "succeeded");
        }
        case State::KEY_ENTROPY: {
          if (!request.has_backupkeyentropy()) {
            throw std::runtime_error(
                "backup key entropy expected but not received");
          }
          std::cout << "here handle request key entropy" << std::endl;
          if (this->authenticationManager.getAuthenticationType() ==
              auth::AuthenticationType::PAKE) {
            this->keyEntropy = request.backupkeyentropy().nonce();
          } else if (
              this->authenticationManager.getAuthenticationType() ==
              auth::AuthenticationType::WALLET) {
            this->keyEntropy = request.backupkeyentropy().rawmessage();
          } else {
            throw std::runtime_error(
                "key entropy: invalid authentication type");
          }
          this->state = State::DATA_CHUNKS;
          return nullptr;
        }
        case State::DATA_CHUNKS: {
          std::cout << "here handle request data chunk"
                    << request.newcompactionchunk().size() << std::endl;

          return nullptr;
        }
      }
      throw std::runtime_error("new backup - invalid state");
    }

    void doneCallback() {
      std::cout << "create new backup done " << this->status.error_code() << "/"
                << this->status.error_message() << std::endl;
    }
  };

  return new CreateNewBackupReactor();
}

grpc::ServerReadReactor<backup::SendLogRequest> *BackupServiceImpl::SendLog(
    grpc::CallbackServerContext *context,
    google::protobuf::Empty *response) {
  class SendLogReactor : public ServerReadReactorBase<
                             backup::SendLogRequest,
                             google::protobuf::Empty> {
    enum class State {
      AUTHENTICATION = 1,
      RECEIVING_LOGS = 2,
    };

    auth::AuthenticationManager authenticationManager;
    State state = State::AUTHENTICATION;

  public:
    using ServerReadReactorBase<
        backup::SendLogRequest,
        google::protobuf::Empty>::ServerReadReactorBase;
    std::unique_ptr<grpc::Status>
    readRequest(backup::SendLogRequest request) override {
      std::cout << "here send log enter" << std::endl;
      switch (this->state) {
        case State::AUTHENTICATION: {
          std::cout << "here send log auth" << std::endl;
          if (!this->authenticationManager.performSimpleAuthentication(
                  request.authenticationdata())) {
            throw std::runtime_error("simple authentication failed");
          }
          this->state = State::RECEIVING_LOGS;
          return nullptr;
        }
        case State::RECEIVING_LOGS: {
          std::cout << "here handle request log chunk "
                    << request.logdata().size() << std::endl;
          return nullptr;
        }
      }
      throw std::runtime_error("send log - invalid state");
    }

    void doneCallback() override {
      std::cout << "receive logs done " << this->status.error_code() << "/"
                << this->status.error_message() << std::endl;
    }
  };

  return new SendLogReactor(response);
}

grpc::ServerBidiReactor<
    backup::RecoverBackupKeyRequest,
    backup::RecoverBackupKeyResponse> *
BackupServiceImpl::RecoverBackupKey(grpc::CallbackServerContext *context) {
  class RecoverBackupKeyReactor : public ServerBidiReactorBase<
                                      backup::RecoverBackupKeyRequest,
                                      backup::RecoverBackupKeyResponse> {
  public:
    std::unique_ptr<grpc::Status> handleRequest(
        backup::RecoverBackupKeyRequest request,
        backup::RecoverBackupKeyResponse *response)
        override { // TODO handle request
      return std::make_unique<grpc::Status>(
          grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
    }
  };

  return new RecoverBackupKeyReactor();
}

grpc::ServerBidiReactor<backup::PullBackupRequest, backup::PullBackupResponse> *
BackupServiceImpl::PullBackup(grpc::CallbackServerContext *context) {
  class PullBackupReactor : public ServerBidiReactorBase<
                                backup::PullBackupRequest,
                                backup::PullBackupResponse> {
  public:
    std::unique_ptr<grpc::Status> handleRequest(
        backup::PullBackupRequest request,
        backup::PullBackupResponse *response) override {
      // TODO handle request
      return std::make_unique<grpc::Status>(
          grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
    }
  };

  return new PullBackupReactor();
}

} // namespace network
} // namespace comm
