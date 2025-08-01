import {
  Reactive,
  Show,
  useObservable,
  useObserve,
} from "@legendapp/state/react";
import cloneDeep from "lodash.clonedeep";
import React, { useRef, useEffect } from "react";

export default function VISVideo({
  cameraName,
  RecordingsData,
  CurrentTime,
  isPlaying,
}) {
  const renderCount = ++useRef(0).current;
  const videoBufferRef = useRef(null);
  const videoRefs = useRef({});
  const HOST_URL = "http://192.168.1.121:8000";

  const { VideoState, CurrentVideo, downloadedVideos, isSwitching } =
    useObservable({
      VideoState: {},
      downloadedVideos: {},
      CurrentVideo: null,
      isSwitching: false,
    });

  //Fetch video and save as blob, check if blob is present already
  const fetchVideo = async (url, key) => {
    let _downloadedVideos = cloneDeep(downloadedVideos.get());
    if (_downloadedVideos[key]) {
      console.log(`✅ Video already present for ${url} at index- ${key}`);
      return _downloadedVideos[key];
    }
    console.log(`❌ Fetching new video form ${url} ${key} }:`);
    try {
      const response = await fetch(url);
      let blob = await response.blob();
      blob = URL.createObjectURL(blob);
      _downloadedVideos = addOrUpdateObject(_downloadedVideos, key, blob);
      downloadedVideos.set(_downloadedVideos);
      console.log({ _downloadedVideos });
      return blob;
    } catch (error) {
      console.log(error);
    }
  };

  // Create alternating video management system
  const initializeVideoSystem = (recordings) => {
    const sortedRecordings = [...recordings].sort(
      (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
    );

    videoBufferRef.current = {
      recordings: sortedRecordings,
      currentIndex: 0,
      activeVideoIndex: 0, // 0 or 1 - which video is currently active
      preloadingVideoIndex: 1, // 0 or 1 - which video is preloading
      isPreloading: false,
      nextRecordingPreloaded: false,
    };
  };

  // Preload next video in the inactive video element
  const preloadNextVideo = async (cameraName, nextRecording) => {
    console.log("preloadNextVideo");
    if (!nextRecording) return;

    const buffer = videoBufferRef.current;
    if (!buffer || buffer.isPreloading) return;

    buffer.isPreloading = true;
    const preloadVideoRef =
      videoRefs.current[`${cameraName}_${buffer.preloadingVideoIndex}`];

    if (preloadVideoRef) {
      const nextVideoUrl = `${HOST_URL}${nextRecording.Path}`;
      console.log(
        `🔄 Preloading ${cameraName} video ${
          buffer.preloadingVideoIndex
        }: ${nextRecording.Path.split("/").pop()}`
      );

      // Clear any existing video content first
      preloadVideoRef.src = "";
      preloadVideoRef.load();
      preloadVideoRef.style.zIndex = 1;

      //fetch video
      let blobURL = await fetchVideo(nextVideoUrl, buffer.preloadingVideoIndex);
      console.log({ blobURL });

      // Set the new source
      preloadVideoRef.src = blobURL;
      preloadVideoRef.currentTime = 0;

      const onCanPlay = () => {
        // Ensure we're at the beginning and the correct frame is loaded
        preloadVideoRef.currentTime = 0;

        const onSeeked = () => {
          buffer.nextRecordingPreloaded = true;
          buffer.isPreloading = false;
          console.log(
            `✅ Preloaded ${cameraName} video ${buffer.preloadingVideoIndex} at frame 0`
          );
          preloadVideoRef.removeEventListener("seeked", onSeeked);
        };

        preloadVideoRef.addEventListener("seeked", onSeeked);
        preloadVideoRef.removeEventListener("canplay", onCanPlay);
      };

      preloadVideoRef.addEventListener("canplay", onCanPlay);
      preloadVideoRef.load();
    }
  };

  const updateVideoPlayback = async (playbackTime = CurrentTime.get()) => {
    console.log("1. updateVideoPlayback", isSwitching.get());
    let newCurrentVideos = {};
    let newVideoStates = {};
    let _downloadedVideos = cloneDeep(downloadedVideos.get());

    const activeInfo = findActiveRecording(RecordingsData.get(), playbackTime);
    // console.log(activeInfo && activeInfo);
    if (activeInfo) {
      const videoUrl = `${HOST_URL}${activeInfo.recording.Path}`;
      const currentblobURL = _downloadedVideos?.[activeInfo.recordingIndex];
      const currentState = VideoState.get();
      newCurrentVideos = {
        url: videoUrl,
        currentTime: activeInfo.videoTime,
        recording: activeInfo.recording,
        isNearEnd: activeInfo.isNearEnd,
        recordingIndex: activeInfo.recordingIndex,
      };
      newVideoStates = {
        currentVideoUrl: videoUrl,
        currentRecording: activeInfo.recording,
        recordingIndex: activeInfo.recordingIndex,
      };
      if (!videoBufferRef.current) {
        initializeVideoSystem(RecordingsData.get());
      }

      const buffer = videoBufferRef.current;
      // console.log({ buffer });

      // Check if we need to switch to a different recording
      if (
        currentState.recordingIndex !== undefined &&
        currentState.recordingIndex !== activeInfo.recordingIndex
      ) {
        // console.log(
        //   `1.1 📹 ${cameraName.peek()} switching from recording ${
        //     currentState.recordingIndex
        //   } to ${activeInfo.recordingIndex}`
        // );
      } else {
        // console.log(`1.2 Same recording, just sync time and play state`);
        // Same recording, just sync time and play state
        const activeVideoRef =
          videoRefs.current[
            `${cameraName.get()}_${buffer?.activeVideoIndex || 0}`
          ];
        // console.log({ activeVideoRef });
        if (activeVideoRef) {
          // console.log("1.3 If video doesn't have a source yet, set it");
          // If video doesn't have a source yet, set it
          if (!activeVideoRef.src || activeVideoRef.src !== currentblobURL) {
            // console.log(
            //   `1.4 📹 Loading initial video for ${cameraName.get()}: ${videoUrl}`
            // );
            // let url = null;
            let url = await fetchVideo(videoUrl, activeInfo.recordingIndex);
            activeVideoRef.src = url;
            const onLoadedData = () => {
              // console.log("1.7 onLoadedData");
              activeVideoRef.currentTime = activeInfo.videoTime;
              if (isPlaying.get()) {
                activeVideoRef.play().catch(console.error);
              }
              activeVideoRef.removeEventListener("loadeddata", onLoadedData);
            };
            activeVideoRef.addEventListener("loadeddata", onLoadedData);

            // Start preloading next video if available
            if (activeInfo.nextRecording && !buffer.nextRecordingPreloaded) {
              console.log("1.8 Start preloading next video if available");
              setTimeout(
                () =>
                  preloadNextVideo(cameraName.get(), activeInfo.nextRecording),
                3000
              );
            }
          } else {
            // Video already loaded, just sync time and play state
            if (
              Math.abs(activeVideoRef.currentTime - activeInfo.videoTime) > 0.5
            ) {
              // console.log(
              //   `1.9 Video already loaded, just sync time and play state`
              // );
              activeVideoRef.currentTime = activeInfo.videoTime;
            }

            if (isPlaying.get() && activeVideoRef.paused) {
              activeVideoRef.play().catch(console.error);
            } else if (!isPlaying.get() && !activeVideoRef.paused) {
              activeVideoRef.pause();
            }
          }
        } else {
        }
      }
      // Start preloading next video when near end (within 3 seconds)
      if (
        activeInfo.isNearEnd &&
        activeInfo.nextRecording &&
        buffer &&
        !buffer.nextRecordingPreloaded &&
        !buffer.isPreloading
      ) {
        console.log(
          `1.10 Start preloading next video when near end (within 3 seconds)`,
          activeInfo
        );
        // console.log("preloadNextVideo");
        preloadNextVideo(cameraName.get(), activeInfo.nextRecording);
      }
    } else {
      console.log(`Pause all videos if no active recording`);
      newCurrentVideos = null;
      newVideoStates = { currentVideoUrl: null };

      // Pause all videos if no active recording
      const video0 = videoRefs.current[`${cameraName.get()}_0`];
      const video1 = videoRefs.current[`${cameraName.get()}_1`];
      console.log({ video0, video1 });
      if (video0 && !video0.paused) video0.pause();
      if (video1 && !video1.paused) video1.pause();
    }
    CurrentVideo.set(newCurrentVideos);
    VideoState.set(newVideoStates);
    // console.log({ newCurrentVideos, newVideoStates });
    // console.log({ _downloadedVideos });
  };

  // Switch to the preloaded video and start preloading the next one
  const switchToNextVideo = (cameraName) => {
    console.log("switchToNextVideo");
    isSwitching.set(true);
    const buffer = videoBufferRef.current;
    if (!buffer) return;
    console.log(videoRefs.current);
    const currentVideoRef =
      videoRefs.current[`${cameraName}_${buffer.activeVideoIndex}`];
    const nextVideoRef =
      videoRefs.current[`${cameraName}_${buffer.preloadingVideoIndex}`];

    console.log({ currentVideoRef, nextVideoRef });
    if (!currentVideoRef || !nextVideoRef) return;

    // Ensure the next video is at the correct time (0 seconds) before showing it
    nextVideoRef.currentTime = 0;

    // Wait for the video to actually seek to the correct frame
    const switchWhenReady = () => {
      // Make sure we're at time 0 and video is ready
      if (nextVideoRef.currentTime === 0 && nextVideoRef.readyState >= 2) {
        // Now perform the instant switch
        // currentVideoRef.style.display = "none";
        // nextVideoRef.style.display = "block";

        currentVideoRef.style.zIndex = 2;
        nextVideoRef.style.zIndex = 1;

        // Start playing the preloaded video immediately
        if (isPlaying.get()) {
          nextVideoRef.play().catch(console.error);
        }

        // Pause the previous video
        currentVideoRef.pause();

        // Swap the active and preloading indices
        const oldActiveIndex = buffer.activeVideoIndex;
        buffer.activeVideoIndex = buffer.preloadingVideoIndex;
        buffer.preloadingVideoIndex = oldActiveIndex;
        buffer.currentIndex++;
        buffer.nextRecordingPreloaded = false;

        console.log(
          `🔄 Switched ${cameraName}: Now active video ${buffer.activeVideoIndex}, preloading video ${buffer.preloadingVideoIndex}`
        );

        // Start preloading the next recording in the now-inactive video element
        const nextRecordingIndex = buffer.currentIndex + 1;
        if (nextRecordingIndex < buffer.recordings.length) {
          const nextRecording = buffer.recordings[nextRecordingIndex];
          setTimeout(() => preloadNextVideo(cameraName, nextRecording), 3000);
        }
      } else {
        // Video not ready yet, wait a bit more
        setTimeout(switchWhenReady, 16); // ~60fps check
      }
    };

    // Start the switching process
    switchWhenReady();
    isSwitching.set(false);
  };

  useObserve(() => {
    if (CurrentVideo.get()) {
      setTimeout(() => {
        updateVideoPlayback();
      }, 0);
    }
  });

  useObserve(() => {
    if (CurrentTime.get()) {
      updateVideoPlayback();
    }
  });

  useObserve(() => {
    if (isPlaying.get()) {
      console.log("playing......");
      const buffer = videoBufferRef.current;
      if (buffer) {
        const activeVideoRef =
          videoRefs.current[`${cameraName.get()}_${buffer.activeVideoIndex}`];
        if (activeVideoRef && activeVideoRef.src) {
          console.log(
            `▶️ Starting playback for ${cameraName.get()}, active video ${
              buffer.activeVideoIndex
            }`
          );
          activeVideoRef
            .play()
            .then(() => {
              console.log(`✅ Playing ${cameraName.get()}`);
            })
            .catch((error) => {
              console.error(`❌ Failed to play ${cameraName.get()}:`, error);
            });
        }
      }
    }
  });

  // useObserve(() => {
  //   console.log(cameraName.get());
  //   console.log(RecordingsData.get());
  //   console.log(CurrentTime.get());
  //   console.log(CurrentVideo.get());
  //   console.log(videoRefs.current);
  // });

  return (
    <div className="vis_video_item">
      <h4 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
        {cameraName.get().charAt(0).toUpperCase() + cameraName.get().slice(1)}(
        {renderCount})
      </h4>
      <div className="video_item_wrapper">
        <Show if={CurrentVideo} else={() => <div>No recording</div>}>
          {() => (
            <>
              <Reactive.video
                ref={(el) => (videoRefs.current[`${cameraName.get()}_0`] = el)}
                className={"video_item"}
                controls={false}
                muted
                preload="metadata"
                onLoadedData={() => {
                  const buffer = videoBufferRef.current;
                  console.log({ buffer });
                  const videoRef = videoRefs.current[`${cameraName.get()}_0`];
                  if (
                    videoRef &&
                    CurrentVideo.get() &&
                    buffer?.activeVideoIndex === 0
                  ) {
                    videoRef.currentTime = CurrentVideo.get().currentTime;
                    if (isPlaying.get() && videoRef.paused) {
                      console.log(
                        `🎬 Auto-playing ${cameraName.get()}_0 on loadedData`
                      );
                      videoRef.play().catch(console.error);
                    }
                  }
                }}
                onEnded={() => {
                  console.log(`🏁 ${cameraName.get()}_0 video ended`);
                  const buffer = videoBufferRef.current;
                  console.log(buffer);
                  if (
                    buffer &&
                    buffer.activeVideoIndex === 0 &&
                    buffer.nextRecordingPreloaded
                  ) {
                    isSwitching.set(true);
                    switchToNextVideo(cameraName.get());
                  }
                }}
                onError={(e) => {
                  console.error(
                    `❌ ${cameraName.get()}_0 video error:`,
                    e.target.error
                  );
                }}
              />
              {/* Video 1 - Alternates between active and preloading */}

              <Reactive.video
                ref={(el) => (videoRefs.current[`${cameraName.get()}_1`] = el)}
                className={"video_item"}
                controls={false}
                muted
                preload="metadata"
                style={{
                  // display: "none",
                  zIndex: 1,
                }}
                onLoadedData={() => {
                  const buffer = videoBufferRef.current;
                  const videoRef = videoRefs.current[`${cameraName.get()}_1`];
                  console.log("onLoadedData");
                  if (
                    videoRef &&
                    CurrentVideo.get() &&
                    buffer?.activeVideoIndex === 1
                  ) {
                    console.log("first");
                    videoRef.currentTime = CurrentVideo.get().currentTime;
                    if (isPlaying.get() && videoRef.paused) {
                      console.log(
                        `🎬 Auto-playing ${cameraName.get()}_1 on loadedData`
                      );
                      videoRef.play().catch(console.error);
                    }
                  }
                }}
                onEnded={() => {
                  console.log(`🏁 ${cameraName.get()}_1 video ended`);
                  const buffer = videoBufferRef.current[cameraName.get()];
                  if (
                    buffer &&
                    buffer.activeVideoIndex === 1 &&
                    buffer.nextRecordingPreloaded
                  ) {
                    isSwitching.set(true);
                    switchToNextVideo(cameraName.get());
                  }
                }}
                onError={(e) => {
                  console.error(
                    `❌ ${cameraName.get()}_1 video error:`,
                    e.target.error
                  );
                }}
              />
            </>
          )}
        </Show>
      </div>
    </div>
  );
}

// Function to find which recording should be playing at a given time
const findActiveRecording = (cameraRecordings, playbackTime) => {
  if (!cameraRecordings || cameraRecordings.length === 0) return null;

  const sortedRecordings = [...cameraRecordings].sort(
    (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
  );

  const firstStartTime = new Date(sortedRecordings[0].StartTime);
  let continuousTime = firstStartTime;

  for (let i = 0; i < sortedRecordings.length; i++) {
    const recording = sortedRecordings[i];
    const recordingStart = continuousTime;
    const recordingEnd = new Date(
      continuousTime.getTime() + recording.Duration * 1000
    );

    if (playbackTime >= recordingStart && playbackTime < recordingEnd) {
      const videoTime = (playbackTime - recordingStart) / 1000;
      const nextRecording =
        i < sortedRecordings.length - 1 ? sortedRecordings[i + 1] : null;
      return {
        recording,
        videoTime,
        recordingStart,
        recordingEnd,
        recordingIndex: i,
        nextRecording,
        // isNearEnd: videoTime > recording.Duration - 3,
        isNearEnd: videoTime > recording.Duration / 2,
        totalRecordings: sortedRecordings.length,
      };
    }

    continuousTime = recordingEnd;
  }

  return null;
};

//function to limit blob saving
function addOrUpdateObject(obj, newKey, newValue) {
  obj[newKey] = newValue;

  if (Object.keys(obj).length > 3) {
    const firstKey = Object.keys(obj)[0];
    URL.revokeObjectURL(obj[firstKey]);
    console.log("DELETED BLOB: ", obj[firstKey]);
    delete obj[firstKey];
  }
  return obj;
}
