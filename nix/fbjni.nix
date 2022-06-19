{ lib
, stdenv
, fetchFromGitHub
, cmake
, fetchpatch
, openjdk
, gtest
}:

stdenv.mkDerivation rec {
  pname = "fbjni";
  version = "0.3.0";

  src = fetchFromGitHub {
    owner = "facebookincubator";
    repo = pname;
    rev = "v${version}";
    sha256 = "132s9c8vlx1r4zcjjsgii9n3f2fx5qxgj3yvg6hw0dzg61x07bpg";
  };

  patches = [
    # fix cmake install of cmake and include directories
    (fetchpatch {
      url = "https://github.com/facebookincubator/fbjni/pull/76.patch";
      sha256 = "sha256-ZCJmzwTKT/n4rdypXBZ2Vv8qYVcQxB3UoFIgoK7qmvE=";
    })
  ];

  nativeBuildInputs = [
    cmake
    openjdk
  ];

  buildInputs = [
    gtest
  ];

  cmakeFlags = [
    "-DJAVA_HOME=${openjdk.passthru.home}"
  ];

  meta = with lib; {
    description = ''
      A library designed to simplify the usage of the Java Native Interface
    '';
    homepage = "https://github.com/facebookincubator/fbjni";
    license = licenses.asl20;
  };
}
