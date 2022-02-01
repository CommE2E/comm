#include "GRPCStreamHostObject.h"
#include "../NativeModules/InternalModules/GlobalNetworkSingleton.h"

using namespace facebook;

GRPCStreamHostObject::GRPCStreamHostObject(
    jsi::Runtime &rt,
    std::shared_ptr<react::CallInvoker> jsInvoker)
    : readyState{0},
      onopen{},
      onmessage{},
      onclose{},
      send{jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, "send"),
          1,
          [](jsi::Runtime &rt,
             const jsi::Value &thisVal,
             const jsi::Value *args,
             size_t count) {
            auto payload{args->asString(rt).utf8(rt)};
            comm::GlobalNetworkSingleton::instance.scheduleOrRun(
                [=](comm::NetworkModule &networkModule) {
                  std::vector<std::string> blobHashes{};
                  networkModule.send(
                      "sessionID-placeholder",
                      "toDeviceID-placeholder",
                      payload,
                      blobHashes);
                });
            return jsi::Value::undefined();
          })},
      close{jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, "close"),
          0,
          [](jsi::Runtime &rt,
             const jsi::Value &thisVal,
             const jsi::Value *args,
             size_t count) {
            return jsi::String::createFromUtf8(
                rt, std::string{"GRPCStream.close: unimplemented"});
          })},
      jsInvoker{jsInvoker} {

  comm::GlobalNetworkSingleton::instance.scheduleOrRun(
      [](comm::NetworkModule &networkModule) {
        networkModule.initializeNetworkModule(
            "userId-placeholder", "deviceToken-placeholder", "localhost");
        networkModule.get("sessionID-placeholder");
      });

  auto onReadDoneCallback = [this, &rt](std::string data) {
    this->jsInvoker->invokeAsync([this, &rt, data]() {
      if (this->onmessage.isNull()) {
        return;
      }
      auto msgObject = jsi::Object(rt);
      msgObject.setProperty(rt, "data", jsi::String::createFromUtf8(rt, data));
      this->onmessage.asObject(rt).asFunction(rt).call(rt, msgObject, 1);
    });
  };

  comm::GlobalNetworkSingleton::instance.scheduleOrRun(
      [onReadDoneCallback =
           std::move(onReadDoneCallback)](comm::NetworkModule &networkModule) {
        networkModule.setOnReadDoneCallback(onReadDoneCallback);
      });
}

std::vector<jsi::PropNameID>
GRPCStreamHostObject::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> names;
  names.reserve(6);
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"readyState"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"onopen"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"onmessage"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"onclose"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"close"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"send"}));
  return names;
}

jsi::Value
GRPCStreamHostObject::get(jsi::Runtime &runtime, const jsi::PropNameID &name) {
  auto propName = name.utf8(runtime);

  if (propName == "readyState") {
    return jsi::Value(this->readyState);
  }

  if (propName == "send") {
    return this->send.asObject(runtime).asFunction(runtime);
  }

  if (propName == "close") {
    return this->close.asObject(runtime).asFunction(runtime);
  }

  if (propName == "onopen") {
    return this->onopen.isNull()
        ? jsi::Value::null()
        : this->onopen.asObject(runtime).asFunction(runtime);
  }

  if (propName == "onmessage") {
    return this->onmessage.isNull()
        ? jsi::Value::null()
        : this->onmessage.asObject(runtime).asFunction(runtime);
  }

  if (propName == "onclose") {
    return this->onclose.isNull()
        ? jsi::Value::null()
        : this->onclose.asObject(runtime).asFunction(runtime);
  }

  return jsi::String::createFromUtf8(runtime, std::string{"unimplemented"});
}

void GRPCStreamHostObject::set(
    jsi::Runtime &runtime,
    const jsi::PropNameID &name,
    const jsi::Value &value) {
  auto propName = name.utf8(runtime);

  if (propName == "readyState" && value.isNumber()) {
    this->readyState = static_cast<int>(value.asNumber());
  } else if (
      propName == "onopen" && value.isObject() &&
      value.asObject(runtime).isFunction(runtime)) {
    this->onopen = value.asObject(runtime).asFunction(runtime);
  } else if (
      propName == "onmessage" && value.isObject() &&
      value.asObject(runtime).isFunction(runtime)) {
    this->onmessage = value.asObject(runtime).asFunction(runtime);
  } else if (
      propName == "onclose" && value.isObject() &&
      value.asObject(runtime).isFunction(runtime)) {
    this->onclose = value.asObject(runtime).asFunction(runtime);
  }
}
