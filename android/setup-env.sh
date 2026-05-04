#!/bin/bash
# Source this file (don't execute it) to put the Android SDK + JDK on
# PATH for the current shell:
#   source ./setup-env.sh
#
# To make it permanent, append the same exports to ~/.zshrc.

export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/Volumes/DevSSD/dev/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
# Keep gradle's caches + wrappers on the SSD too (can be 5+ GB once
# the build's been running for a while).
export GRADLE_USER_HOME="/Volumes/DevSSD/dev/gradle-home"
mkdir -p "$GRADLE_USER_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$PATH"

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "java:    $(java -version 2>&1 | head -1)"
echo "adb:     $(which adb)"
echo "sdkmgr:  $(which sdkmanager)"
