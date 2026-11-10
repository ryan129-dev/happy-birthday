# Third-party assets

The build downloads `public/mediapipe/hand_landmarker-v1.task` and verifies its SHA-256. It is the MediaPipe Hand Landmarker Full FP16 model by Google, downloaded from https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task. The file matches the `latest` Full FP16 model linked from the [official model page](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker#models), SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`. The [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf) identifies its license as Apache License 2.0; see [LICENSE-APACHE-2.0.txt](LICENSE-APACHE-2.0.txt).

The MediaPipe WASM files are copied from the installed `@mediapipe/tasks-vision` npm package during development and builds. That package is licensed under Apache License 2.0.
