# The cmake version of this build is meant to enable both cmake and .pc being exported
# this is important because grpc exports a .cmake file which also expects for protobuf
# to have been exported through cmake as well.
{ lib, stdenv
, buildPackages
, cmake
, fetchFromGitHub
, fetchpatch
, gtest
, zlib
}:

stdenv.mkDerivation rec {
  pname = "protobuf";
  version = "3.15.8";

  src = fetchFromGitHub {
    owner = "protocolbuffers";
    repo = "protobuf";
    rev = "v${version}";
    sha256 = "sha256-G+fU6YWfpkRDJ9Xf+/zLmd52/1vTtPoZdugZDLtCc+A=";
  };

  # re-create git submodules
  postPatch = ''
    rm -rf gmock
    cp -r ${gtest.src}/googlemock third_party/gmock
    cp -r ${gtest.src}/googletest third_party/

    chmod -R a+w third_party/
    ln -s ../googletest third_party/gmock/gtest
    ln -s ../gmock third_party/googletest/googlemock
    ln -s $(pwd)/third_party/googletest third_party/googletest/googletest
  '' + lib.optionalString stdenv.isDarwin ''
    substituteInPlace src/google/protobuf/testing/googletest.cc \
    --replace 'tmpnam(b)' '"'$TMPDIR'/foo"'
  '';

  patches = [
    # This is an adjusted patch for https://github.com/protocolbuffers/protobuf/pull/9822
    ./cmake-install-path.patch
  ];

  # There's a top-level BUILD file which doesn't allow for APFS to create a directory named "build"
  dontUseCmakeBuildDir = true;
  # Point cmake setup hook to cmake/CMakeLists.txt
  cmakeDir = "cmake";

  nativeBuildInputs = [
    cmake
  ];

  buildInputs = [
    zlib
  ];

  cmakeFlags = lib.optionals (!stdenv.targetPlatform.isStatic) [
    "-Dprotobuf_BUILD_SHARED_LIBS=ON"
  ];

  enableParallelBuilding = true;

  # unfortunately the shared libraries have yet to been patched by nix, thus tests will fail
  doCheck = false;

  meta = {
    description = "Google's data interchange format";
    longDescription = ''
      Protocol Buffers are a way of encoding structured data in an efficient
      yet extensible format. Google uses Protocol Buffers for almost all of
      its internal RPC protocols and file formats.
    '';
    license = lib.licenses.bsd3;
    platforms = lib.platforms.unix;
    homepage = "https://developers.google.com/protocol-buffers/";
  };
}
