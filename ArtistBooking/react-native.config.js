module.exports = {
  assets: ['./assets/fonts/'],
  dependencies: {
    // VisionCamera 4 dropped FrameProcessorPlugin.h. Cropper's iOS pod
    // cannot compile; Android native + JS rotate stay linked. Camera UI
    // still uses react-native-vision-camera on both platforms.
    'vision-camera-cropper': {
      platforms: {
        ios: null,
      },
    },
  },
};
