// Copyright (c) The NodeRT Contributors
// All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the ""License""); you may
// not use this file except in compliance with the License. You may obtain a
// copy of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// THIS CODE IS PROVIDED ON AN  *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS
// OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY
// IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
// MERCHANTABLITY OR NON-INFRINGEMENT.
//
// See the Apache Version 2.0 License for specific language governing permissions
// and limitations under the License.

// TODO: Verify that this is is still needed..
#define NTDDI_VERSION 0x06010000

#include <v8.h>
#include "nan.h"
#include <string>
#include <ppltasks.h>
#include "CollectionsConverter.h"
#include "CollectionsWrap.h"
#include "node-async.h"
#include "NodeRtUtils.h"
#include "OpaqueWrapper.h"
#include "WrapperBase.h"

#using < Microsoft.Windows.PushNotifications.WinMD>

// this undefs fixes the issues of compiling Windows.Data.Json, Windows.Storag.FileProperties, and Windows.Stroage.Search
// Some of the node header files brings windows definitions with the same names as some of the WinRT methods
#undef DocumentProperties
#undef GetObject
#undef CreateEvent
#undef FindText
#undef SendMessage

const char *REGISTRATION_TOKEN_MAP_PROPERTY_NAME = "__registrationTokenMap__";

using Nan::EscapableHandleScope;
using Nan::False;
using Nan::HandleScope;
using Nan::MaybeLocal;
using Nan::Null;
using Nan::Persistent;
using Nan::True;
using Nan::TryCatch;
using Nan::Undefined;
using v8::Array;
using v8::Boolean;
using v8::Date;
using v8::Function;
using v8::FunctionTemplate;
using v8::Integer;
using v8::Local;
using v8::Number;
using v8::Object;
using v8::Primitive;
using v8::PropertyAttribute;
using v8::String;
using v8::Value;
using namespace concurrency;

namespace NodeRT
{
  namespace Microsoft
  {
    namespace Windows
    {
      namespace PushNotifications
      {
        v8::Local<v8::Value> WrapPushNotificationChannel(::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ wintRtInstance);
        ::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ UnwrapPushNotificationChannel(Local<Value> value);

        v8::Local<v8::Value> WrapPushNotificationCreateChannelResult(::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ wintRtInstance);
        ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ UnwrapPushNotificationCreateChannelResult(Local<Value> value);

        v8::Local<v8::Value> WrapPushNotificationManager(::Microsoft::Windows::PushNotifications::PushNotificationManager ^ wintRtInstance);
        ::Microsoft::Windows::PushNotifications::PushNotificationManager ^ UnwrapPushNotificationManager(Local<Value> value);

        v8::Local<v8::Value> WrapPushNotificationReceivedEventArgs(::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ wintRtInstance);
        ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ UnwrapPushNotificationReceivedEventArgs(Local<Value> value);

        static void InitPushNotificationChannelStatusEnum(const Local<Object> exports)
        {
          HandleScope scope;

          Local<Object> enumObject = Nan::New<Object>();

          Nan::Set(exports, Nan::New<String>("PushNotificationChannelStatus").ToLocalChecked(), enumObject);
          Nan::Set(enumObject, Nan::New<String>("inProgress").ToLocalChecked(), Nan::New<Integer>(static_cast<int>(::Microsoft::Windows::PushNotifications::PushNotificationChannelStatus::InProgress)));
          Nan::Set(enumObject, Nan::New<String>("inProgressRetry").ToLocalChecked(), Nan::New<Integer>(static_cast<int>(::Microsoft::Windows::PushNotifications::PushNotificationChannelStatus::InProgressRetry)));
          Nan::Set(enumObject, Nan::New<String>("completedSuccess").ToLocalChecked(), Nan::New<Integer>(static_cast<int>(::Microsoft::Windows::PushNotifications::PushNotificationChannelStatus::CompletedSuccess)));
          Nan::Set(enumObject, Nan::New<String>("completedFailure").ToLocalChecked(), Nan::New<Integer>(static_cast<int>(::Microsoft::Windows::PushNotifications::PushNotificationChannelStatus::CompletedFailure)));
        }

        static bool IsPushNotificationCreateChannelStatusJsObject(Local<Value> value)
        {
          if (!value->IsObject())
          {
            return false;
          }

          Local<String> symbol;
          Local<Object> obj = Nan::To<Object>(value).ToLocalChecked();

          symbol = Nan::New<String>("status").ToLocalChecked();
          if (Nan::Has(obj, symbol).FromMaybe(false))
          {
            if (!Nan::Get(obj, symbol).ToLocalChecked()->IsInt32())
            {
              return false;
            }
          }

          symbol = Nan::New<String>("extendedError").ToLocalChecked();
          if (Nan::Has(obj, symbol).FromMaybe(false))
          {
            if (!NodeRT::Utils::IsWinRtWrapperOf<::Platform::Exception ^>(Nan::Get(obj, symbol).ToLocalChecked()))
            {
              return false;
            }
          }

          symbol = Nan::New<String>("retryCount").ToLocalChecked();
          if (Nan::Has(obj, symbol).FromMaybe(false))
          {
            if (!Nan::Get(obj, symbol).ToLocalChecked()->IsUint32())
            {
              return false;
            }
          }

          return true;
        }

        ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelStatus PushNotificationCreateChannelStatusFromJsObject(Local<Value> value)
        {
          HandleScope scope;
          ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelStatus returnValue;

          if (!value->IsObject())
          {
            Nan::ThrowError(Nan::TypeError(NodeRT::Utils::NewString(L"Unexpected type, expected an object")));
            return returnValue;
          }

          Local<Object> obj = Nan::To<Object>(value).ToLocalChecked();
          Local<String> symbol;

          symbol = Nan::New<String>("status").ToLocalChecked();
          if (Nan::Has(obj, symbol).FromMaybe(false))
          {
            returnValue.status = static_cast<::Microsoft::Windows::PushNotifications::PushNotificationChannelStatus>(Nan::To<int32_t>(Nan::Get(obj, symbol).ToLocalChecked()).FromMaybe(0));
          }

          symbol = Nan::New<String>("extendedError").ToLocalChecked();
          if (Nan::Has(obj, symbol).FromMaybe(false))
          {
            returnValue.extendedError = NodeRT::Utils::HResultFromJsInt32(Nan::To<int32_t>(Nan::Get(obj, symbol).ToLocalChecked()).FromMaybe(0));
          }

          symbol = Nan::New<String>("retryCount").ToLocalChecked();
          if (Nan::Has(obj, symbol).FromMaybe(false))
          {
            returnValue.retryCount = static_cast<unsigned int>(Nan::To<uint32_t>(Nan::Get(obj, symbol).ToLocalChecked()).FromMaybe(0));
          }

          return returnValue;
        }

        Local<Value> PushNotificationCreateChannelStatusToJsObject(::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelStatus value)
        {
          EscapableHandleScope scope;

          Local<Object> obj = Nan::New<Object>();

          Nan::Set(obj, Nan::New<String>("status").ToLocalChecked(), Nan::New<Integer>(static_cast<int>(value.status)));
          Nan::Set(obj, Nan::New<String>("extendedError").ToLocalChecked(), Nan::New<Integer>(value.extendedError.Value));
          Nan::Set(obj, Nan::New<String>("retryCount").ToLocalChecked(), Nan::New<Integer>(value.retryCount));

          return scope.Escape(obj);
        }
        static bool IsPushNotificationsContractJsObject(Local<Value> value)
        {
          if (!value->IsObject())
          {
            return false;
          }

          Local<String> symbol;
          Local<Object> obj = Nan::To<Object>(value).ToLocalChecked();

          return true;
        }

        ::Microsoft::Windows::PushNotifications::PushNotificationsContract PushNotificationsContractFromJsObject(Local<Value> value)
        {
          HandleScope scope;
          ::Microsoft::Windows::PushNotifications::PushNotificationsContract returnValue;

          if (!value->IsObject())
          {
            Nan::ThrowError(Nan::TypeError(NodeRT::Utils::NewString(L"Unexpected type, expected an object")));
            return returnValue;
          }

          Local<Object> obj = Nan::To<Object>(value).ToLocalChecked();
          Local<String> symbol;

          return returnValue;
        }

        Local<Value> PushNotificationsContractToJsObject(::Microsoft::Windows::PushNotifications::PushNotificationsContract value)
        {
          EscapableHandleScope scope;

          Local<Object> obj = Nan::New<Object>();

          return scope.Escape(obj);
        }

        class PushNotificationChannel : public WrapperBase
        {
        public:
          static void Init(const Local<Object> exports)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(New);
            s_constructorTemplate.Reset(localRef);
            localRef->SetClassName(Nan::New<String>("PushNotificationChannel").ToLocalChecked());
            localRef->InstanceTemplate()->SetInternalFieldCount(1);

            Nan::SetPrototypeMethod(localRef, "close", Close);

            Nan::SetAccessor(localRef->PrototypeTemplate(), Nan::New<String>("expirationTime").ToLocalChecked(), ExpirationTimeGetter);
            Nan::SetAccessor(localRef->PrototypeTemplate(), Nan::New<String>("uri").ToLocalChecked(), UriGetter);

            Local<Object> constructor = Nan::To<Object>(Nan::GetFunction(localRef).ToLocalChecked()).ToLocalChecked();
            Nan::SetMethod(constructor, "castFrom", CastFrom);

            Nan::Set(exports, Nan::New<String>("PushNotificationChannel").ToLocalChecked(), constructor);
          }

          virtual ::Platform::Object ^ GetObjectInstance() const override
          {
            return _instance;
          }

        private:
          PushNotificationChannel(::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ instance)
          {
            _instance = instance;
          }

          static void New(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(s_constructorTemplate);

            // in case the constructor was called without the new operator
            if (!localRef->HasInstance(info.This()))
            {
              if (info.Length() > 0)
              {
                std::unique_ptr<Local<Value>[]> constructorArgs(new Local<Value>[info.Length()]);

                Local<Value> *argsPtr = constructorArgs.get();
                for (int i = 0; i < info.Length(); i++)
                {
                  argsPtr[i] = info[i];
                }

                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), constructorArgs.get());
                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
              else
              {
                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), nullptr);

                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ winRtInstance;

            if (info.Length() == 1 && OpaqueWrapper::IsOpaqueWrapper(info[0]) &&
                NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationChannel ^>(info[0]))
            {
              try
              {
                winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationChannel ^) NodeRT::Utils::GetObjectInstance(info[0]);
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no suitable constructor found")));
              return;
            }

            NodeRT::Utils::SetHiddenValue(info.This(), Nan::New<String>("__winRtInstance__").ToLocalChecked(), True());

            PushNotificationChannel *wrapperInstance = new PushNotificationChannel(winRtInstance);
            wrapperInstance->Wrap(info.This());

            info.GetReturnValue().Set(info.This());
          }

          static void CastFrom(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;
            if (info.Length() < 1 || !NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationChannel ^>(info[0]))
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no object provided, or given object could not be casted to requested type")));
              return;
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ winRtInstance;
            try
            {
              winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationChannel ^) NodeRT::Utils::GetObjectInstance(info[0]);
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }

            info.GetReturnValue().Set(WrapPushNotificationChannel(winRtInstance));
          }

          static void Close(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationChannel ^>(info.This()))
            {
              return;
            }

            PushNotificationChannel *wrapper = PushNotificationChannel::Unwrap<PushNotificationChannel>(info.This());

            if (info.Length() == 0)
            {
              try
              {
                wrapper->_instance->Close();
                return;
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: no suitable overload found")));
              return;
            }
          }

          static void ExpirationTimeGetter(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationChannel ^>(info.This()))
            {
              return;
            }

            PushNotificationChannel *wrapper = PushNotificationChannel::Unwrap<PushNotificationChannel>(info.This());

            try
            {
              ::Windows::Foundation::DateTime result = wrapper->_instance->ExpirationTime;
              info.GetReturnValue().Set(NodeRT::Utils::DateTimeToJS(result));
              return;
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }
          }

          static void UriGetter(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationChannel ^>(info.This()))
            {
              return;
            }

            PushNotificationChannel *wrapper = PushNotificationChannel::Unwrap<PushNotificationChannel>(info.This());

            try
            {
              ::Windows::Foundation::Uri ^ result = wrapper->_instance->Uri;
              info.GetReturnValue().Set(NodeRT::Utils::CreateExternalWinRTObject("Windows.Foundation", "Uri", result));
              return;
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }
          }

        private:
          ::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ _instance;
          static Persistent<FunctionTemplate> s_constructorTemplate;

          friend v8::Local<v8::Value> WrapPushNotificationChannel(::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ wintRtInstance);
          friend ::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ UnwrapPushNotificationChannel(Local<Value> value);
        };

        Persistent<FunctionTemplate> PushNotificationChannel::s_constructorTemplate;

        v8::Local<v8::Value> WrapPushNotificationChannel(::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ winRtInstance)
        {
          EscapableHandleScope scope;

          if (winRtInstance == nullptr)
          {
            return scope.Escape(Undefined());
          }

          Local<Value> opaqueWrapper = CreateOpaqueWrapper(winRtInstance);
          Local<Value> args[] = {opaqueWrapper};
          Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(PushNotificationChannel::s_constructorTemplate);
          return scope.Escape(Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), _countof(args), args).ToLocalChecked());
        }

        ::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ UnwrapPushNotificationChannel(Local<Value> value) {
          return PushNotificationChannel::Unwrap<PushNotificationChannel>(Nan::To<Object>(value).ToLocalChecked())->_instance;
        }

            void InitPushNotificationChannel(Local<Object> exports)
        {
          PushNotificationChannel::Init(exports);
        }

        class PushNotificationCreateChannelResult : public WrapperBase
        {
        public:
          static void Init(const Local<Object> exports)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(New);
            s_constructorTemplate.Reset(localRef);
            localRef->SetClassName(Nan::New<String>("PushNotificationCreateChannelResult").ToLocalChecked());
            localRef->InstanceTemplate()->SetInternalFieldCount(1);

            Nan::SetAccessor(localRef->PrototypeTemplate(), Nan::New<String>("channel").ToLocalChecked(), ChannelGetter);
            Nan::SetAccessor(localRef->PrototypeTemplate(), Nan::New<String>("extendedError").ToLocalChecked(), ExtendedErrorGetter);
            Nan::SetAccessor(localRef->PrototypeTemplate(), Nan::New<String>("status").ToLocalChecked(), StatusGetter);

            Local<Object> constructor = Nan::To<Object>(Nan::GetFunction(localRef).ToLocalChecked()).ToLocalChecked();
            Nan::SetMethod(constructor, "castFrom", CastFrom);

            Nan::Set(exports, Nan::New<String>("PushNotificationCreateChannelResult").ToLocalChecked(), constructor);
          }

          virtual ::Platform::Object ^ GetObjectInstance() const override
          {
            return _instance;
          }

        private:
          PushNotificationCreateChannelResult(::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ instance)
          {
            _instance = instance;
          }

          static void New(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(s_constructorTemplate);

            // in case the constructor was called without the new operator
            if (!localRef->HasInstance(info.This()))
            {
              if (info.Length() > 0)
              {
                std::unique_ptr<Local<Value>[]> constructorArgs(new Local<Value>[info.Length()]);

                Local<Value> *argsPtr = constructorArgs.get();
                for (int i = 0; i < info.Length(); i++)
                {
                  argsPtr[i] = info[i];
                }

                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), constructorArgs.get());
                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
              else
              {
                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), nullptr);

                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ winRtInstance;

            if (info.Length() == 1 && OpaqueWrapper::IsOpaqueWrapper(info[0]) &&
                NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^>(info[0]))
            {
              try
              {
                winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^) NodeRT::Utils::GetObjectInstance(info[0]);
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no suitable constructor found")));
              return;
            }

            NodeRT::Utils::SetHiddenValue(info.This(), Nan::New<String>("__winRtInstance__").ToLocalChecked(), True());

            PushNotificationCreateChannelResult *wrapperInstance = new PushNotificationCreateChannelResult(winRtInstance);
            wrapperInstance->Wrap(info.This());

            info.GetReturnValue().Set(info.This());
          }

          static void CastFrom(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;
            if (info.Length() < 1 || !NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^>(info[0]))
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no object provided, or given object could not be casted to requested type")));
              return;
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ winRtInstance;
            try
            {
              winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^) NodeRT::Utils::GetObjectInstance(info[0]);
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }

            info.GetReturnValue().Set(WrapPushNotificationCreateChannelResult(winRtInstance));
          }

          static void ChannelGetter(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^>(info.This()))
            {
              return;
            }

            PushNotificationCreateChannelResult *wrapper = PushNotificationCreateChannelResult::Unwrap<PushNotificationCreateChannelResult>(info.This());

            try
            {
              ::Microsoft::Windows::PushNotifications::PushNotificationChannel ^ result = wrapper->_instance->Channel;
              info.GetReturnValue().Set(WrapPushNotificationChannel(result));
              return;
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }
          }

          static void ExtendedErrorGetter(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^>(info.This()))
            {
              return;
            }

            PushNotificationCreateChannelResult *wrapper = PushNotificationCreateChannelResult::Unwrap<PushNotificationCreateChannelResult>(info.This());

            try
            {
              ::Windows::Foundation::HResult result = wrapper->_instance->ExtendedError;
              info.GetReturnValue().Set(Nan::New<Integer>(result.Value));
              return;
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }
          }

          static void StatusGetter(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^>(info.This()))
            {
              return;
            }

            PushNotificationCreateChannelResult *wrapper = PushNotificationCreateChannelResult::Unwrap<PushNotificationCreateChannelResult>(info.This());

            try
            {
              ::Microsoft::Windows::PushNotifications::PushNotificationChannelStatus result = wrapper->_instance->Status;
              info.GetReturnValue().Set(Nan::New<Integer>(static_cast<int>(result)));
              return;
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }
          }

        private:
          ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ _instance;
          static Persistent<FunctionTemplate> s_constructorTemplate;

          friend v8::Local<v8::Value> WrapPushNotificationCreateChannelResult(::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ wintRtInstance);
          friend ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ UnwrapPushNotificationCreateChannelResult(Local<Value> value);
        };

        Persistent<FunctionTemplate> PushNotificationCreateChannelResult::s_constructorTemplate;

        v8::Local<v8::Value> WrapPushNotificationCreateChannelResult(::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ winRtInstance)
        {
          EscapableHandleScope scope;

          if (winRtInstance == nullptr)
          {
            return scope.Escape(Undefined());
          }

          Local<Value> opaqueWrapper = CreateOpaqueWrapper(winRtInstance);
          Local<Value> args[] = {opaqueWrapper};
          Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(PushNotificationCreateChannelResult::s_constructorTemplate);
          return scope.Escape(Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), _countof(args), args).ToLocalChecked());
        }

        ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^ UnwrapPushNotificationCreateChannelResult(Local<Value> value) {
          return PushNotificationCreateChannelResult::Unwrap<PushNotificationCreateChannelResult>(Nan::To<Object>(value).ToLocalChecked())->_instance;
        }

            void InitPushNotificationCreateChannelResult(Local<Object> exports)
        {
          PushNotificationCreateChannelResult::Init(exports);
        }

        class PushNotificationManager : public WrapperBase
        {
        public:
          static void Init(const Local<Object> exports)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(New);
            s_constructorTemplate.Reset(localRef);
            localRef->SetClassName(Nan::New<String>("PushNotificationManager").ToLocalChecked());
            localRef->InstanceTemplate()->SetInternalFieldCount(1);

            Local<Function> func;
            Local<FunctionTemplate> funcTemplate;

            Nan::SetPrototypeMethod(localRef, "register", Register);
            Nan::SetPrototypeMethod(localRef, "unregister", Unregister);
            Nan::SetPrototypeMethod(localRef, "unregisterAll", UnregisterAll);

            Nan::SetPrototypeMethod(localRef, "createChannelAsync", CreateChannelAsync);

            Nan::SetPrototypeMethod(localRef, "addListener", AddListener);
            Nan::SetPrototypeMethod(localRef, "on", AddListener);
            Nan::SetPrototypeMethod(localRef, "removeListener", RemoveListener);
            Nan::SetPrototypeMethod(localRef, "off", RemoveListener);

            Local<Object> constructor = Nan::To<Object>(Nan::GetFunction(localRef).ToLocalChecked()).ToLocalChecked();
            Nan::SetMethod(constructor, "castFrom", CastFrom);

            Nan::SetMethod(constructor, "isSupported", IsSupported);
            Nan::SetAccessor(constructor, Nan::New<String>("default").ToLocalChecked(), DefaultGetter);

            Nan::Set(exports, Nan::New<String>("PushNotificationManager").ToLocalChecked(), constructor);
          }

          virtual ::Platform::Object ^ GetObjectInstance() const override
          {
            return _instance;
          }

        private:
          PushNotificationManager(::Microsoft::Windows::PushNotifications::PushNotificationManager ^ instance)
          {
            _instance = instance;
          }

          static void New(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(s_constructorTemplate);

            // in case the constructor was called without the new operator
            if (!localRef->HasInstance(info.This()))
            {
              if (info.Length() > 0)
              {
                std::unique_ptr<Local<Value>[]> constructorArgs(new Local<Value>[info.Length()]);

                Local<Value> *argsPtr = constructorArgs.get();
                for (int i = 0; i < info.Length(); i++)
                {
                  argsPtr[i] = info[i];
                }

                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), constructorArgs.get());
                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
              else
              {
                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), nullptr);

                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationManager ^ winRtInstance;

            if (info.Length() == 1 && OpaqueWrapper::IsOpaqueWrapper(info[0]) &&
                NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info[0]))
            {
              try
              {
                winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationManager ^) NodeRT::Utils::GetObjectInstance(info[0]);
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no suitable constructor found")));
              return;
            }

            NodeRT::Utils::SetHiddenValue(info.This(), Nan::New<String>("__winRtInstance__").ToLocalChecked(), True());

            PushNotificationManager *wrapperInstance = new PushNotificationManager(winRtInstance);
            wrapperInstance->Wrap(info.This());

            info.GetReturnValue().Set(info.This());
          }

          static void CastFrom(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;
            if (info.Length() < 1 || !NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info[0]))
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no object provided, or given object could not be casted to requested type")));
              return;
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationManager ^ winRtInstance;
            try
            {
              winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationManager ^) NodeRT::Utils::GetObjectInstance(info[0]);
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }

            info.GetReturnValue().Set(WrapPushNotificationManager(winRtInstance));
          }

          static void CreateChannelAsync(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info.This()))
            {
              return;
            }

            if (info.Length() == 0 || !info[info.Length() - 1]->IsFunction())
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: No callback was given")));
              return;
            }

            PushNotificationManager *wrapper = PushNotificationManager::Unwrap<PushNotificationManager>(info.This());

            ::Windows::Foundation::IAsyncOperationWithProgress<::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^, ::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelStatus> ^ op;

            if (info.Length() == 2 && NodeRT::Utils::IsGuid(info[0]))
            {
              try
              {
                ::Platform::Guid arg0 = NodeRT::Utils::GuidFromJs(info[0]);

                op = wrapper->_instance->CreateChannelAsync(arg0);
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: no suitable overload found")));
              return;
            }

            auto opTask = create_task(op);
            uv_async_t *asyncToken = NodeUtils::Async::GetAsyncToken(info[info.Length() - 1].As<Function>());

            opTask.then([asyncToken](task<::Microsoft::Windows::PushNotifications::PushNotificationCreateChannelResult ^> t)
                        {
        try {
          auto result = t.get();
          NodeUtils::Async::RunCallbackOnMain(asyncToken, [result](NodeUtils::InvokeCallbackDelegate invokeCallback) {


            Local<Value> error;
            Local<Value> arg1;
            {
              TryCatch tryCatch;
              arg1 = WrapPushNotificationCreateChannelResult(result);
              if (tryCatch.HasCaught())
              {
                error = Nan::To<Object>(tryCatch.Exception()).ToLocalChecked();
              }
              else
              {
                error = Undefined();
              }
              if (arg1.IsEmpty()) arg1 = Undefined();
            }
            Local<Value> args[] = {error, arg1};


            invokeCallback(_countof(args), args);
          });
        } catch (Platform::Exception^ exception) {
          NodeUtils::Async::RunCallbackOnMain(asyncToken, [exception](NodeUtils::InvokeCallbackDelegate invokeCallback) {
            Local<Value> error = NodeRT::Utils::WinRtExceptionToJsError(exception);

            Local<Value> args[] = {error};
            invokeCallback(_countof(args), args);
          });
        } });
          }

          static void Register(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info.This()))
            {
              return;
            }

            PushNotificationManager *wrapper = PushNotificationManager::Unwrap<PushNotificationManager>(info.This());

            if (info.Length() == 0)
            {
              try
              {
                wrapper->_instance->Register();
                return;
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: no suitable overload found")));
              return;
            }
          }
          static void Unregister(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info.This()))
            {
              return;
            }

            PushNotificationManager *wrapper = PushNotificationManager::Unwrap<PushNotificationManager>(info.This());

            if (info.Length() == 0)
            {
              try
              {
                wrapper->_instance->Unregister();
                return;
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: no suitable overload found")));
              return;
            }
          }
          static void UnregisterAll(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info.This()))
            {
              return;
            }

            PushNotificationManager *wrapper = PushNotificationManager::Unwrap<PushNotificationManager>(info.This());

            if (info.Length() == 0)
            {
              try
              {
                wrapper->_instance->UnregisterAll();
                return;
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: no suitable overload found")));
              return;
            }
          }

          static void IsSupported(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (info.Length() == 0)
            {
              try
              {
                bool result;
                result = ::Microsoft::Windows::PushNotifications::PushNotificationManager::IsSupported();
                info.GetReturnValue().Set(Nan::New<Boolean>(result));
                return;
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: no suitable overload found")));
              return;
            }
          }

          static void DefaultGetter(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info)
          {
            HandleScope scope;

            try
            {
              ::Microsoft::Windows::PushNotifications::PushNotificationManager ^ result = ::Microsoft::Windows::PushNotifications::PushNotificationManager::Default;
              info.GetReturnValue().Set(WrapPushNotificationManager(result));
              return;
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }
          }

          static void AddListener(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (info.Length() < 2 || !info[0]->IsString() || !info[1]->IsFunction())
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"wrong arguments, expected arguments are eventName(string),callback(function)")));
              return;
            }

            String::Value eventName(v8::Isolate::GetCurrent(), info[0]);
            auto str = *eventName;

            Local<Function> callback = info[1].As<Function>();

            ::Windows::Foundation::EventRegistrationToken registrationToken;
            if (NodeRT::Utils::CaseInsenstiveEquals(L"pushReceived", str))
            {
              if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info.This()))
              {
                Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"The caller of this method isn't of the expected type or internal WinRt object was disposed")));
                return;
              }
              PushNotificationManager *wrapper = PushNotificationManager::Unwrap<PushNotificationManager>(info.This());

              try
              {
                Persistent<Object> *perstPtr = new Persistent<Object>();
                perstPtr->Reset(NodeRT::Utils::CreateCallbackObjectInDomain(callback));
                std::shared_ptr<Persistent<Object>> callbackObjPtr(perstPtr,
                                                                   [](Persistent<Object> *ptr)
                                                                   {
                                                                     NodeUtils::Async::RunOnMain([ptr]()
                                                                                                 {
                ptr->Reset();
                delete ptr; });
                                                                   });

                registrationToken = wrapper->_instance->PushReceived::add(
                    ref new ::Windows::Foundation::TypedEventHandler<::Microsoft::Windows::PushNotifications::PushNotificationManager ^, ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^>(
                        [callbackObjPtr](::Microsoft::Windows::PushNotifications::PushNotificationManager ^ arg0, ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ arg1)
                        {
                          NodeUtils::Async::RunOnMain([callbackObjPtr, arg0, arg1]()
                                                      {
                HandleScope scope;


                Local<Value> wrappedArg0;
                Local<Value> wrappedArg1;

                {
                  TryCatch tryCatch;


                  wrappedArg0 = WrapPushNotificationManager(arg0);
                  wrappedArg1 = WrapPushNotificationReceivedEventArgs(arg1);


                  if (wrappedArg0.IsEmpty()) wrappedArg0 = Undefined();
                  if (wrappedArg1.IsEmpty()) wrappedArg1 = Undefined();
                }

                Local<Value> args[] = { wrappedArg0, wrappedArg1 };
                Local<Object> callbackObjLocalRef = Nan::New<Object>(*callbackObjPtr);
                NodeRT::Utils::CallCallbackInDomain(callbackObjLocalRef, _countof(args), args); });
                        }));
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(String::Concat(v8::Isolate::GetCurrent(), NodeRT::Utils::NewString(L"given event name isn't supported: "), info[0].As<String>())));
              return;
            }

            Local<Value> tokenMapVal = NodeRT::Utils::GetHiddenValue(callback, Nan::New<String>(REGISTRATION_TOKEN_MAP_PROPERTY_NAME).ToLocalChecked());
            Local<Object> tokenMap;

            if (tokenMapVal.IsEmpty() || Nan::Equals(tokenMapVal, Undefined()).FromMaybe(false))
            {
              tokenMap = Nan::New<Object>();
              NodeRT::Utils::SetHiddenValueWithObject(callback, Nan::New<String>(REGISTRATION_TOKEN_MAP_PROPERTY_NAME).ToLocalChecked(), tokenMap);
            }
            else
            {
              tokenMap = Nan::To<Object>(tokenMapVal).ToLocalChecked();
            }

            Nan::Set(tokenMap, info[0], CreateOpaqueWrapper(::Windows::Foundation::PropertyValue::CreateInt64(registrationToken.Value)));
          }

          static void RemoveListener(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (info.Length() < 2 || !info[0]->IsString() || !info[1]->IsFunction())
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"wrong arguments, expected a string and a callback")));
              return;
            }

            String::Value eventName(v8::Isolate::GetCurrent(), info[0]);
            auto str = *eventName;

            if ((!NodeRT::Utils::CaseInsenstiveEquals(L"pushReceived", str)))
            {
              Nan::ThrowError(Nan::Error(String::Concat(v8::Isolate::GetCurrent(), NodeRT::Utils::NewString(L"given event name isn't supported: "), info[0].As<String>())));
              return;
            }

            Local<Function> callback = info[1].As<Function>();
            Local<Value> tokenMap = NodeRT::Utils::GetHiddenValue(callback, Nan::New<String>(REGISTRATION_TOKEN_MAP_PROPERTY_NAME).ToLocalChecked());

            if (tokenMap.IsEmpty() || Nan::Equals(tokenMap, Undefined()).FromMaybe(false))
            {
              return;
            }

            Local<Value> opaqueWrapperObj = Nan::Get(Nan::To<Object>(tokenMap).ToLocalChecked(), info[0]).ToLocalChecked();

            if (opaqueWrapperObj.IsEmpty() || Nan::Equals(opaqueWrapperObj, Undefined()).FromMaybe(false))
            {
              return;
            }

            OpaqueWrapper *opaqueWrapper = OpaqueWrapper::Unwrap<OpaqueWrapper>(opaqueWrapperObj.As<Object>());

            long long tokenValue = (long long)opaqueWrapper->GetObjectInstance();
            ::Windows::Foundation::EventRegistrationToken registrationToken;
            registrationToken.Value = tokenValue;

            try
            {
              if (NodeRT::Utils::CaseInsenstiveEquals(L"pushReceived", str))
              {
                if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationManager ^>(info.This()))
                {
                  Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"The caller of this method isn't of the expected type or internal WinRt object was disposed")));
                  return;
                }
                PushNotificationManager *wrapper = PushNotificationManager::Unwrap<PushNotificationManager>(info.This());
                wrapper->_instance->PushReceived::remove(registrationToken);
              }
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
            }

            Nan::Delete(Nan::To<Object>(tokenMap).ToLocalChecked(), Nan::To<String>(info[0]).ToLocalChecked());
          }

        private:
          ::Microsoft::Windows::PushNotifications::PushNotificationManager ^ _instance;
          static Persistent<FunctionTemplate> s_constructorTemplate;

          friend v8::Local<v8::Value> WrapPushNotificationManager(::Microsoft::Windows::PushNotifications::PushNotificationManager ^ wintRtInstance);
          friend ::Microsoft::Windows::PushNotifications::PushNotificationManager ^ UnwrapPushNotificationManager(Local<Value> value);
        };

        Persistent<FunctionTemplate> PushNotificationManager::s_constructorTemplate;

        v8::Local<v8::Value> WrapPushNotificationManager(::Microsoft::Windows::PushNotifications::PushNotificationManager ^ winRtInstance)
        {
          EscapableHandleScope scope;

          if (winRtInstance == nullptr)
          {
            return scope.Escape(Undefined());
          }

          Local<Value> opaqueWrapper = CreateOpaqueWrapper(winRtInstance);
          Local<Value> args[] = {opaqueWrapper};
          Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(PushNotificationManager::s_constructorTemplate);
          return scope.Escape(Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), _countof(args), args).ToLocalChecked());
        }

        ::Microsoft::Windows::PushNotifications::PushNotificationManager ^ UnwrapPushNotificationManager(Local<Value> value) {
          return PushNotificationManager::Unwrap<PushNotificationManager>(Nan::To<Object>(value).ToLocalChecked())->_instance;
        }

            void InitPushNotificationManager(Local<Object> exports)
        {
          PushNotificationManager::Init(exports);
        }

        class PushNotificationReceivedEventArgs : public WrapperBase
        {
        public:
          static void Init(const Local<Object> exports)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(New);
            s_constructorTemplate.Reset(localRef);
            localRef->SetClassName(Nan::New<String>("PushNotificationReceivedEventArgs").ToLocalChecked());
            localRef->InstanceTemplate()->SetInternalFieldCount(1);

            Nan::SetPrototypeMethod(localRef, "getDeferral", GetDeferral);

            Nan::SetPrototypeMethod(localRef, "addListener", AddListener);
            Nan::SetPrototypeMethod(localRef, "on", AddListener);
            Nan::SetPrototypeMethod(localRef, "removeListener", RemoveListener);
            Nan::SetPrototypeMethod(localRef, "off", RemoveListener);

            Nan::SetAccessor(localRef->PrototypeTemplate(), Nan::New<String>("payload").ToLocalChecked(), PayloadGetter);

            Local<Object> constructor = Nan::To<Object>(Nan::GetFunction(localRef).ToLocalChecked()).ToLocalChecked();
            Nan::SetMethod(constructor, "castFrom", CastFrom);

            Nan::Set(exports, Nan::New<String>("PushNotificationReceivedEventArgs").ToLocalChecked(), constructor);
          }

          virtual ::Platform::Object ^ GetObjectInstance() const override
          {
            return _instance;
          }

        private:
          PushNotificationReceivedEventArgs(::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ instance)
          {
            _instance = instance;
          }

          static void New(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(s_constructorTemplate);

            // in case the constructor was called without the new operator
            if (!localRef->HasInstance(info.This()))
            {
              if (info.Length() > 0)
              {
                std::unique_ptr<Local<Value>[]> constructorArgs(new Local<Value>[info.Length()]);

                Local<Value> *argsPtr = constructorArgs.get();
                for (int i = 0; i < info.Length(); i++)
                {
                  argsPtr[i] = info[i];
                }

                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), constructorArgs.get());
                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
              else
              {
                MaybeLocal<Object> res = Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), info.Length(), nullptr);

                if (res.IsEmpty())
                {
                  return;
                }

                info.GetReturnValue().Set(res.ToLocalChecked());
                return;
              }
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ winRtInstance;

            if (info.Length() == 1 && OpaqueWrapper::IsOpaqueWrapper(info[0]) &&
                NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^>(info[0]))
            {
              try
              {
                winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^) NodeRT::Utils::GetObjectInstance(info[0]);
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no suitable constructor found")));
              return;
            }

            NodeRT::Utils::SetHiddenValue(info.This(), Nan::New<String>("__winRtInstance__").ToLocalChecked(), True());

            PushNotificationReceivedEventArgs *wrapperInstance = new PushNotificationReceivedEventArgs(winRtInstance);
            wrapperInstance->Wrap(info.This());

            info.GetReturnValue().Set(info.This());
          }

          static void CastFrom(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;
            if (info.Length() < 1 || !NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^>(info[0]))
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Invalid arguments, no object provided, or given object could not be casted to requested type")));
              return;
            }

            ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ winRtInstance;
            try
            {
              winRtInstance = (::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^) NodeRT::Utils::GetObjectInstance(info[0]);
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }

            info.GetReturnValue().Set(WrapPushNotificationReceivedEventArgs(winRtInstance));
          }

          static void GetDeferral(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^>(info.This()))
            {
              return;
            }

            PushNotificationReceivedEventArgs *wrapper = PushNotificationReceivedEventArgs::Unwrap<PushNotificationReceivedEventArgs>(info.This());

            if (info.Length() == 0)
            {
              try
              {
                ::Windows::ApplicationModel::Background::BackgroundTaskDeferral ^ result;
                result = wrapper->_instance->GetDeferral();
                info.GetReturnValue().Set(NodeRT::Utils::CreateExternalWinRTObject("Windows.ApplicationModel.Background", "BackgroundTaskDeferral", result));
                return;
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"Bad arguments: no suitable overload found")));
              return;
            }
          }

          static void PayloadGetter(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info)
          {
            HandleScope scope;

            if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^>(info.This()))
            {
              return;
            }

            PushNotificationReceivedEventArgs *wrapper = PushNotificationReceivedEventArgs::Unwrap<PushNotificationReceivedEventArgs>(info.This());

            try
            {
              ::Platform::Array<unsigned char> ^ result = wrapper->_instance->Payload;
              info.GetReturnValue().Set(NodeRT::Collections::ArrayWrapper<unsigned char>::CreateArrayWrapper(
                  result,
                  [](unsigned char val) -> Local<Value>
                  {
                    return Nan::New<Integer>(val);
                  },
                  [](Local<Value> value) -> bool
                  {
                    return value->IsInt32();
                  },
                  [](Local<Value> value) -> unsigned char
                  {
                    return static_cast<unsigned char>(Nan::To<int32_t>(value).FromMaybe(0));
                  }));
              return;
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
              return;
            }
          }

          static void AddListener(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (info.Length() < 2 || !info[0]->IsString() || !info[1]->IsFunction())
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"wrong arguments, expected arguments are eventName(string),callback(function)")));
              return;
            }

            String::Value eventName(v8::Isolate::GetCurrent(), info[0]);
            auto str = *eventName;

            Local<Function> callback = info[1].As<Function>();

            ::Windows::Foundation::EventRegistrationToken registrationToken;
            if (NodeRT::Utils::CaseInsenstiveEquals(L"canceled", str))
            {
              if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^>(info.This()))
              {
                Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"The caller of this method isn't of the expected type or internal WinRt object was disposed")));
                return;
              }
              PushNotificationReceivedEventArgs *wrapper = PushNotificationReceivedEventArgs::Unwrap<PushNotificationReceivedEventArgs>(info.This());

              try
              {
                Persistent<Object> *perstPtr = new Persistent<Object>();
                perstPtr->Reset(NodeRT::Utils::CreateCallbackObjectInDomain(callback));
                std::shared_ptr<Persistent<Object>> callbackObjPtr(perstPtr,
                                                                   [](Persistent<Object> *ptr)
                                                                   {
                                                                     NodeUtils::Async::RunOnMain([ptr]()
                                                                                                 {
                ptr->Reset();
                delete ptr; });
                                                                   });

                registrationToken = wrapper->_instance->Canceled::add(
                    ref new ::Windows::ApplicationModel::Background::BackgroundTaskCanceledEventHandler(
                        [callbackObjPtr](::Windows::ApplicationModel::Background::IBackgroundTaskInstance ^ arg0, ::Windows::ApplicationModel::Background::BackgroundTaskCancellationReason arg1)
                        {
                          NodeUtils::Async::RunOnMain([callbackObjPtr, arg0, arg1]()
                                                      {
                HandleScope scope;


                Local<Value> wrappedArg0;
                Local<Value> wrappedArg1;

                {
                  TryCatch tryCatch;


                  wrappedArg0 = NodeRT::Utils::CreateExternalWinRTObject("Windows.ApplicationModel.Background", "IBackgroundTaskInstance", arg0);
                  wrappedArg1 = Nan::New<Integer>(static_cast<int>(arg1));


                  if (wrappedArg0.IsEmpty()) wrappedArg0 = Undefined();
                  if (wrappedArg1.IsEmpty()) wrappedArg1 = Undefined();
                }

                Local<Value> args[] = { wrappedArg0, wrappedArg1 };
                Local<Object> callbackObjLocalRef = Nan::New<Object>(*callbackObjPtr);
                NodeRT::Utils::CallCallbackInDomain(callbackObjLocalRef, _countof(args), args); });
                        }));
              }
              catch (Platform::Exception ^ exception)
              {
                NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
                return;
              }
            }
            else
            {
              Nan::ThrowError(Nan::Error(String::Concat(v8::Isolate::GetCurrent(), NodeRT::Utils::NewString(L"given event name isn't supported: "), info[0].As<String>())));
              return;
            }

            Local<Value> tokenMapVal = NodeRT::Utils::GetHiddenValue(callback, Nan::New<String>(REGISTRATION_TOKEN_MAP_PROPERTY_NAME).ToLocalChecked());
            Local<Object> tokenMap;

            if (tokenMapVal.IsEmpty() || Nan::Equals(tokenMapVal, Undefined()).FromMaybe(false))
            {
              tokenMap = Nan::New<Object>();
              NodeRT::Utils::SetHiddenValueWithObject(callback, Nan::New<String>(REGISTRATION_TOKEN_MAP_PROPERTY_NAME).ToLocalChecked(), tokenMap);
            }
            else
            {
              tokenMap = Nan::To<Object>(tokenMapVal).ToLocalChecked();
            }

            Nan::Set(tokenMap, info[0], CreateOpaqueWrapper(::Windows::Foundation::PropertyValue::CreateInt64(registrationToken.Value)));
          }

          static void RemoveListener(Nan::NAN_METHOD_ARGS_TYPE info)
          {
            HandleScope scope;

            if (info.Length() < 2 || !info[0]->IsString() || !info[1]->IsFunction())
            {
              Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"wrong arguments, expected a string and a callback")));
              return;
            }

            String::Value eventName(v8::Isolate::GetCurrent(), info[0]);
            auto str = *eventName;

            if ((!NodeRT::Utils::CaseInsenstiveEquals(L"canceled", str)))
            {
              Nan::ThrowError(Nan::Error(String::Concat(v8::Isolate::GetCurrent(), NodeRT::Utils::NewString(L"given event name isn't supported: "), info[0].As<String>())));
              return;
            }

            Local<Function> callback = info[1].As<Function>();
            Local<Value> tokenMap = NodeRT::Utils::GetHiddenValue(callback, Nan::New<String>(REGISTRATION_TOKEN_MAP_PROPERTY_NAME).ToLocalChecked());

            if (tokenMap.IsEmpty() || Nan::Equals(tokenMap, Undefined()).FromMaybe(false))
            {
              return;
            }

            Local<Value> opaqueWrapperObj = Nan::Get(Nan::To<Object>(tokenMap).ToLocalChecked(), info[0]).ToLocalChecked();

            if (opaqueWrapperObj.IsEmpty() || Nan::Equals(opaqueWrapperObj, Undefined()).FromMaybe(false))
            {
              return;
            }

            OpaqueWrapper *opaqueWrapper = OpaqueWrapper::Unwrap<OpaqueWrapper>(opaqueWrapperObj.As<Object>());

            long long tokenValue = (long long)opaqueWrapper->GetObjectInstance();
            ::Windows::Foundation::EventRegistrationToken registrationToken;
            registrationToken.Value = tokenValue;

            try
            {
              if (NodeRT::Utils::CaseInsenstiveEquals(L"canceled", str))
              {
                if (!NodeRT::Utils::IsWinRtWrapperOf<::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^>(info.This()))
                {
                  Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"The caller of this method isn't of the expected type or internal WinRt object was disposed")));
                  return;
                }
                PushNotificationReceivedEventArgs *wrapper = PushNotificationReceivedEventArgs::Unwrap<PushNotificationReceivedEventArgs>(info.This());
                wrapper->_instance->Canceled::remove(registrationToken);
              }
            }
            catch (Platform::Exception ^ exception)
            {
              NodeRT::Utils::ThrowWinRtExceptionInJs(exception);
            }

            Nan::Delete(Nan::To<Object>(tokenMap).ToLocalChecked(), Nan::To<String>(info[0]).ToLocalChecked());
          }

        private:
          ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ _instance;
          static Persistent<FunctionTemplate> s_constructorTemplate;

          friend v8::Local<v8::Value> WrapPushNotificationReceivedEventArgs(::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ wintRtInstance);
          friend ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ UnwrapPushNotificationReceivedEventArgs(Local<Value> value);
        };

        Persistent<FunctionTemplate> PushNotificationReceivedEventArgs::s_constructorTemplate;

        v8::Local<v8::Value> WrapPushNotificationReceivedEventArgs(::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ winRtInstance)
        {
          EscapableHandleScope scope;

          if (winRtInstance == nullptr)
          {
            return scope.Escape(Undefined());
          }

          Local<Value> opaqueWrapper = CreateOpaqueWrapper(winRtInstance);
          Local<Value> args[] = {opaqueWrapper};
          Local<FunctionTemplate> localRef = Nan::New<FunctionTemplate>(PushNotificationReceivedEventArgs::s_constructorTemplate);
          return scope.Escape(Nan::NewInstance(Nan::GetFunction(localRef).ToLocalChecked(), _countof(args), args).ToLocalChecked());
        }

        ::Microsoft::Windows::PushNotifications::PushNotificationReceivedEventArgs ^ UnwrapPushNotificationReceivedEventArgs(Local<Value> value) {
          return PushNotificationReceivedEventArgs::Unwrap<PushNotificationReceivedEventArgs>(Nan::To<Object>(value).ToLocalChecked())->_instance;
        }

            void InitPushNotificationReceivedEventArgs(Local<Object> exports)
        {
          PushNotificationReceivedEventArgs::Init(exports);
        }

      }
    }
  }
}

NAN_MODULE_INIT(init)
{
  // We ignore failures for now since it probably means that
  // the initialization already happened for STA, and that's cool

  CoInitializeEx(nullptr, COINIT_MULTITHREADED);

  /*
  if (FAILED(CoInitializeEx(nullptr, COINIT_MULTITHREADED))) {
    Nan::ThrowError(Nan::Error(NodeRT::Utils::NewString(L"error in CoInitializeEx()")));
    return;
  }
  */

  NodeRT::Microsoft::Windows::PushNotifications::InitPushNotificationChannelStatusEnum(target);
  NodeRT::Microsoft::Windows::PushNotifications::InitPushNotificationChannel(target);
  NodeRT::Microsoft::Windows::PushNotifications::InitPushNotificationCreateChannelResult(target);
  NodeRT::Microsoft::Windows::PushNotifications::InitPushNotificationManager(target);
  NodeRT::Microsoft::Windows::PushNotifications::InitPushNotificationReceivedEventArgs(target);

  NodeRT::Utils::RegisterNameSpace("Microsoft.Windows.PushNotifications", target);
}

NODE_MODULE(binding, init)