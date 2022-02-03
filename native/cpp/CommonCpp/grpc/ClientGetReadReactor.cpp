#include "ClientGetReadReactor.h"

ClientGetReadReactor::ClientGetReadReactor(
    tunnelbroker::TunnelbrokerService::Stub *stub,
    std::string sessionID)
    : sessionID{sessionID}, request{} {
  request.set_sessionid(sessionID);
  stub->async()->Get(&(this->context), &(this->request), this);
  StartRead(&(this->response));
  StartCall();
}

void ClientGetReadReactor::OnReadDone(bool ok) {
  if (!ok) {
    return;
  }
  std::lock_guard<std::mutex> guard{this->onReadDoneCallbackMutex};
  if (this->onReadDoneCallback) {
    this->onReadDoneCallback(this->response.payload());
  }
  StartRead(&(this->response));
}

void ClientGetReadReactor::close() {
  this->context.TryCancel();
}

void ClientGetReadReactor::setOnOpenCallback(
    std::function<void()> onOpenCallback) {
  std::lock_guard<std::mutex> guard{this->onOpenCallbackMutex};
  this->onOpenCallback = onOpenCallback;
}

void ClientGetReadReactor::setOnReadDoneCallback(
    std::function<void(std::string)> onReadDoneCallback) {
  std::lock_guard<std::mutex> guard{this->onReadDoneCallbackMutex};
  this->onReadDoneCallback = onReadDoneCallback;
}

void ClientGetReadReactor::setOnCloseCallback(
    std::function<void()> onCloseCallback) {
  std::lock_guard<std::mutex> guard{this->onCloseCallbackMutex};
  this->onCloseCallback = onCloseCallback;
}

void ClientGetReadReactor::assignSetReadyStateCallback(
    std::function<void(SocketStatus)> callback) {
  std::lock_guard<std::mutex> guard{this->setReadyStateMutex};
  this->setReadyState = callback;
}
