#include "GRPCStreamHostObject.h"
#import <jsi/jsi.h>

using namespace facebook;

GRPCStreamHostObject::GRPCStreamHostObject()
    : readyState{0}, onopen{}, onmessage{}, onclose{} {
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
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        0,
        [](facebook::jsi::Runtime &rt,
           const facebook::jsi::Value &thisVal,
           const facebook::jsi::Value *args,
           size_t count) {
          return jsi::String::createFromUtf8(
              rt, std::string{"GRPCStream.send: unimplemented"});
        });
  }

  if (propName == "close") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        0,
        [](facebook::jsi::Runtime &rt,
           const facebook::jsi::Value &thisVal,
           const facebook::jsi::Value *args,
           size_t count) {
          return jsi::String::createFromUtf8(
              rt, std::string{"GRPCStream.close: unimplemented"});
        });
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
