#include "TunnelbrokerServiceImpl.h"

namespace comm {
namespace network {

using namespace std::chrono_literals;

TunnelBrokerServiceImpl::TunnelBrokerServiceImpl() {
  Aws::InitAPI({});
}

TunnelBrokerServiceImpl::~TunnelBrokerServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::Status TunnelBrokerServiceImpl::SessionSignature(
    grpc::ServerContext *context,
    const tunnelbroker::SessionSignatureRequest *request,
    tunnelbroker::SessionSignatureResponse *reply) {

  const std::string deviceID = request->deviceid();
  // Generate new random string to sign request for the deviceID
  const std::string toSign = generateRandomString(SIGNATURE_REQUEST_LENGTH);
  // TODO: Save toSign to the global hashmap
  // Linear task: ENG-436
  // We need to save `toSign` to the global hashmap with the deviceID as a key
  // to check the sign of the signature for the certain deviceID later on
  // `NewSession` request.
  reply->set_tosign(toSign);
  return grpc::Status::OK;
}

grpc::Status TunnelBrokerServiceImpl::NewSession(
    grpc::ServerContext *context,
    const tunnelbroker::NewSessionRequest *request,
    tunnelbroker::NewSessionResponse *reply) {

  const std::string signature = request->signature();
  const std::string pubkey = request->publickey();
  // TODO: Check the key ownership
  // Linear task: ENG-436
  // We need to compare the signature as a signed `toSign` string by the
  // publicKey provided for the certain deviceID. Get `toSign` from the
  // global hashmap which saved from the `SessionSignature` request before
  // `NewSession` request.

  std::shared_ptr<database::DeviceSessionItem> deviceSessionItem;
  // Generate new sessionId from random string
  const std::string sessionId = generateRandomString(SESSION_ID_LENGTH);
  try {
    // Check if a session already exist and throw an error if not
    if (database::DatabaseManager::getInstance().findSessionItem(sessionId) ==
        nullptr) {
      return grpc::Status(
          grpc::StatusCode::ALREADY_EXISTS, "Session already exist.");
    }
    // Insert a new session item to the database
    deviceSessionItem = std::make_shared<database::DeviceSessionItem>(
        sessionId,
        request->deviceid(),
        request->publickey(),
        request->notifytoken(),
        tunnelbroker::NewSessionRequest_DeviceTypes_Name(request->devicetype()),
        request->deviceappversion(),
        request->deviceos());
    database::DatabaseManager::getInstance().putSessionItem(*deviceSessionItem);
  } catch (std::runtime_error &e) {
    std::cout << "Error while processing NewSession request: " << e.what()
              << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  // Send a reply with new sessionId
  reply->set_sessionid(sessionId);
  return grpc::Status::OK;
}

grpc::Status TunnelBrokerServiceImpl::Send(
    grpc::ServerContext *context,
    const tunnelbroker::SendRequest *request,
    google::protobuf::Empty *reply) {

  try {
    // Todo:
    // Send implementation
  } catch (std::runtime_error &e) {
    std::cout << "Error while processing Send request: " << e.what()
              << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

grpc::Status TunnelBrokerServiceImpl::Get(
    grpc::ServerContext *context,
    const tunnelbroker::GetRequest *request,
    grpc::ServerWriter<tunnelbroker::GetResponse> *stream) {

  try {
    // Todo:
    // Get implementation
  } catch (std::runtime_error &e) {
    std::cout << "Error while processing Get request: " << e.what()
              << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
