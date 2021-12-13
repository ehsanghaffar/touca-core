# Copyright 2021 Touca, Inc. Subject to Apache-2.0 License.

from conans import ConanFile, CMake


class ToucaConan(ConanFile):

    name = "touca_cmp"
    homepage = "https://touca.io"
    description = "Touca server component for comparing submitted test results"
    topics = (
        "regression-testing",
        "snapshot-testing",
        "test-framework",
        "test-automation",
    )
    url = "https://docs.touca.io"
    license = "Private"
    version = "1.4.0"
    author = "Pejman Ghorbanzade <pejman@touca.io>"
    settings = "os", "compiler", "build_type", "arch"
    generators = "cmake_find_package"

    def requirements(self):
        self.requires("aws-sdk-cpp/1.8.130")
        self.requires("cxxopts/2.2.1")
        self.requires("fmt/8.0.1")
        self.requires("openssl/1.1.1j")
        self.requires("spdlog/1.9.2")
        self.requires("touca/1.4.2")

    def source(self):
        self.run("git clone https://github.com/trytouca/touca.git")

    def configure(self):
        self.options["aws-sdk-cpp"].s3 = True
        self.options["spdlog"].header_only = True
        self.options["touca"].shared = True
        self.options["touca"].with_tests = False
        self.options["touca"].with_utils = False
        self.options["touca"].with_framework = False

    def _configure_cmake(self):
        cmake = CMake(self)
        cmake.configure()
        return cmake

    def build(self):
        cmake = self._configure_cmake()
        cmake.build()

    def test(self):
        cmake = self._configure_cmake()
        cmake.test()

    def package(self):
        cmake = self._configure_cmake()
        cmake.install()

    def imports(self):
        self.copy("*.so*", dst="../dist/lib", src="lib")
        self.copy("*.dylib*", dst="../dist/lib", src="lib")
        self.copy("*.dll", dst="..\bin\Release", src="bin")
