import {
  Reactive,
  Show,
  useObservable,
  useObserve,
} from "@legendapp/state/react";
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

  const { VideoState, CurrentVideo, downloadedVideos } = useObservable({
    VideoState: {},
    downloadedVideos: {},
    CurrentVideo: null,
  });

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

  const updateVideoPlayback = async (playbackTime = CurrentTime.get()) => {
    let newCurrentVideos = {};
    let newVideoStates = {};
    const activeInfo = findActiveRecording(RecordingsData.get(), playbackTime);
    console.log(activeInfo);
    if (activeInfo) {
      const videoUrl = `${HOST_URL}${activeInfo.recording.Path}`;
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
      console.log({ buffer });

      // Check if we need to switch to a different recording
      if (
        currentState.recordingIndex !== undefined &&
        currentState.recordingIndex !== activeInfo.recordingIndex
      ) {
        console.log(
          `📹 ${cameraName.peek()} switching from recording ${
            currentState.recordingIndex
          } to ${activeInfo.recordingIndex}`
        );
      } else {
        // Same recording, just sync time and play state
        console.log(
          "else",
          videoRefs.current,
          `${cameraName.get()}_${buffer?.activeVideoIndex || 0}`
        );
        const activeVideoRef =
          videoRefs.current[
            `${cameraName.get()}_${buffer?.activeVideoIndex || 0}`
          ];
        console.log({ activeVideoRef });
        if (activeVideoRef) {
          console.log("If video doesn't have a source yet, set it");
          // If video doesn't have a source yet, set it
          if (!activeVideoRef.src || activeVideoRef.src !== videoUrl) {
            console.log(
              `📹 Loading initial video for ${cameraName.get()}: ${videoUrl}`
            );

            const response = await fetch(videoUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            console.log(activeInfo.recordingIndex);
            let _downloadedVideos = { ...downloadedVideos.get() };
            _downloadedVideos = addOrUpdateObject(
              _downloadedVideos,
              [activeInfo.recordingIndex],
              url
            );
            downloadedVideos.set(_downloadedVideos);

            console.log(downloadedVideos.get());
            activeVideoRef.src = url;

            const onLoadedData = () => {
              activeVideoRef.currentTime = activeInfo.videoTime;
              if (isPlaying.get()) {
                activeVideoRef.play().catch(console.error);
              }
              activeVideoRef.removeEventListener("loadeddata", onLoadedData);
            };
            activeVideoRef.addEventListener("loadeddata", onLoadedData);

            // Start preloading next video if available
            if (activeInfo.nextRecording && !buffer.nextRecordingPreloaded) {
              console.log("start preloading next video if available");
              //   setTimeout(
              //     () => preloadNextVideo(cameraName, activeInfo.nextRecording),
              //     1000
              //   );
            }
          } else {
            // Video already loaded, just sync time and play state
            if (
              Math.abs(activeVideoRef.currentTime - activeInfo.videoTime) > 0.5
            ) {
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
        console.log("preloadNextVideo");
        // preloadNextVideo(cameraName, activeInfo.nextRecording);
      }
    } else {
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
    console.log({ newCurrentVideos, newVideoStates });
    console.log(cameraName.get(), { activeInfo });
  };

  useObserve(() => {
    if (CurrentVideo.get()) {
      setTimeout(() => {
        updateVideoPlayback();
      }, 100);
    }
  });

  useEffect(() => {
    updateVideoPlayback();
  }, []);

  useObserve(() => {
    console.log(cameraName.get());
    console.log(RecordingsData.get());
    console.log(CurrentTime.get());
    console.log(CurrentVideo.get());
    console.log(videoRefs.current);
  });

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
                  //   const videoRef = videoRefs.current[`${cameraName}_0`];
                  //   if (
                  //     videoRef &&
                  //     currentVideos[cameraName] &&
                  //     buffer?.activeVideoIndex === 0
                  //   ) {
                  //     videoRef.currentTime =
                  //       currentVideos[cameraName].currentTime;
                  //     if (isPlaying && videoRef.paused) {
                  //       console.log(
                  //         `🎬 Auto-playing ${cameraName}_0 on loadedData`
                  //       );
                  //       videoRef.play().catch(console.error);
                  //     }
                  //   }
                }}
                onEnded={() => {
                  console.log(`🏁 ${cameraName}_0 video ended`);
                  //   const buffer = videoBufferRef.current[cameraName];
                  //   if (
                  //     buffer &&
                  //     buffer.activeVideoIndex === 0 &&
                  //     buffer.nextRecordingPreloaded
                  //   ) {
                  //     switchToNextVideo(cameraName);
                  //   }
                }}
                onError={(e) => {
                  console.error(
                    `❌ ${cameraName}_0 video error:`,
                    e.target.error
                  );
                }}
              />
              A
              <Reactive.video
                ref={(el) => (videoRefs.current[`${cameraName.get()}_1`] = el)}
                className={"video_item"}
                controls={false}
                muted
                preload="metadata"
                style={{
                  display: "none",
                  zIndex: 1,
                }}
                onLoadedData={() => {
                  const buffer = videoBufferRef.current;
                  console.log({ buffer });
                  //   const videoRef = videoRefs.current[`${cameraName}_0`];
                  //   if (
                  //     videoRef &&
                  //     currentVideos[cameraName] &&
                  //     buffer?.activeVideoIndex === 0
                  //   ) {
                  //     videoRef.currentTime =
                  //       currentVideos[cameraName].currentTime;
                  //     if (isPlaying && videoRef.paused) {
                  //       console.log(
                  //         `🎬 Auto-playing ${cameraName}_0 on loadedData`
                  //       );
                  //       videoRef.play().catch(console.error);
                  //     }
                  //   }
                }}
                onEnded={() => {
                  console.log(`🏁 ${cameraName}_1 video ended`);
                  //   const buffer = videoBufferRef.current[cameraName];
                  //   if (
                  //     buffer &&
                  //     buffer.activeVideoIndex === 0 &&
                  //     buffer.nextRecordingPreloaded
                  //   ) {
                  //     switchToNextVideo(cameraName);
                  //   }
                }}
                onError={(e) => {
                  console.error(
                    `❌ ${cameraName}_1 video error:`,
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
      console.log(videoTime, recording.Duration);
      return {
        recording,
        videoTime,
        recordingStart,
        recordingEnd,
        recordingIndex: i,
        nextRecording,
        isNearEnd: videoTime > recording.Duration - 3,
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
    delete obj[firstKey];
  }
  return obj;
}
