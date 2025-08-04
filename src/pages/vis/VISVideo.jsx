import {
  Reactive,
  Show,
  useComputed,
  useObservable,
  useObserve,
} from "@legendapp/state/react";
import cloneDeep from "lodash.clonedeep";
import React, { useRef, useEffect } from "react";
const HOST_URL = "http://192.168.1.121:8000";

export default function VISVideo({
  cameraName,
  RecordingsData,
  CurrentTime,
  isPlaying,
}) {
  const renderCount = ++useRef(0).current;
  const videoBufferRef = useRef(null);
  const activeRecordingCache = useRef(new Map());
  const videoRefs = useRef({});
  const switchingStateRef = useRef({
    isSwitching: false,
    pendingUpdate: null,
  });

  const { VideoState, CurrentVideo, downloadedVideos, isSwitching } =
    useObservable({
      VideoState: {},
      downloadedVideos: {},
      CurrentVideo: null,
      isSwitching: false,
    });

  const sortedRecordings$ = useComputed(() => {
    return [...RecordingsData.get()].sort(
      (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
    );
  });

  //Fetch video and save as blob, check if blob is present already
  const fetchVideo = async (url, key) => {
    let _downloadedVideos = cloneDeep(downloadedVideos.get());
    if (_downloadedVideos[key]) {
      console.log(`✅ Video already present for ${url} at index- ${key}`);
      console.log({ _downloadedVideos });
      return _downloadedVideos[key];
    }
    console.log(`❌ Fetching new video from ${url} ${key} }:`);
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
    console.log("preloadNextVideo", nextRecording?.Path);
    if (!nextRecording) return;

    const buffer = videoBufferRef.current;
    console.log({ buffer });
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

      // Clear any existing video content {buffer}
      preloadVideoRef.src = "";
      preloadVideoRef.load();
      preloadVideoRef.style.zIndex = 1;

      //fetch video
      console.log("currentIndex---->", buffer.currentIndex);
      const nextRecordingIndex = buffer.currentIndex + 1;
      console.log({ nextRecordingIndex });
      let blobURL = await fetchVideo(nextVideoUrl, nextRecordingIndex);
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
    console.log(
      "1. updateVideoPlayback",
      switchingStateRef.current.isSwitching
    );

    if (switchingStateRef.current.isSwitching) {
      console.log("🔄 Video switching in progress, queuing update");
      switchingStateRef.current.pendingUpdate = playbackTime;
      return;
    }

    let newCurrentVideos = {};
    let newVideoStates = {};
    let _downloadedVideos = cloneDeep(downloadedVideos.get());
    let activeInfo = findActiveRecording(RecordingsData.get(), playbackTime);
    // Create cache key
    // const cacheKey = `${playbackTime.getTime()}_${RecordingsData.get().length}`;
    // let activeInfo;
    // if (activeRecordingCache.current.has(cacheKey)) {
    //   console.log("has");
    //   activeInfo = activeRecordingCache.current.get(cacheKey);
    // } else {
    //   console.log("not has");

    //   activeInfo = findActiveRecording(RecordingsData.get(), playbackTime);

    //   // Cache the result (limit cache size)
    //   if (activeRecordingCache.current.size > 50) {
    //     const firstKey = activeRecordingCache.current.keys().next().value;
    //     activeRecordingCache.current.delete(firstKey);
    //   }
    //   activeRecordingCache.current.set(cacheKey, activeInfo);
    // }
    // console.log({ cacheKey }, activeRecordingCache.current);
    // const activeInfo = findActiveRecording(RecordingsData.get(), playbackTime);
    console.log(activeInfo && { activeInfo });
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
      console.log({ buffer });

      // Check if we need to switch to a different recording
      if (
        currentState.recordingIndex !== undefined &&
        currentState.recordingIndex !== activeInfo.recordingIndex
      ) {
        console.log(
          `1.1 📹 ${cameraName.peek()} switching from recording ${
            currentState.recordingIndex
          } to ${activeInfo.recordingIndex}`
        );
        buffer.nextRecordingPreloaded = false;
        buffer.currentIndex = activeInfo.recordingIndex;

        // 🆕 Reset switching state on manual jumps
        if (switchingStateRef.current.isSwitching) {
          console.log(`🔄 Manual jump detected, resetting switching state`);
          switchingStateRef.current.isSwitching = false;
          switchingStateRef.current.pendingUpdate = null;

          // Update buffer indices to match the new recording
          buffer.activeVideoIndex = 0; // Reset to primary video
          buffer.preloadingVideoIndex = 1;
        }
      } else {
        // console.log(`1.2 Same recording, just sync time and play state`);
        // Same recording, just sync time and play state
        const activeVideoRef =
          videoRefs.current[
            `${cameraName.get()}_${buffer?.activeVideoIndex || 0}`
          ];

        console.log(`${cameraName.get()}_${buffer?.activeVideoIndex || 0}`);

        console.log(videoRefs.current);
        // console.log({ activeVideoRef });
        if (activeVideoRef) {
          console.log(activeVideoRef.src, currentblobURL);
          // console.log("1.3 If video doesn't have a source yet, set it");
          // If video doesn't have a source yet, set it
          if (!activeVideoRef.src || activeVideoRef.src !== currentblobURL) {
            console.log({ activeVideoRef, currentblobURL });
            console.log(
              `1.4 📹 Loading initial video for ${cameraName.get()}: ${videoUrl}`
            );
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

              preloadNextVideo(cameraName.get(), activeInfo.nextRecording);
            }
          } else {
            // Video already loaded, just sync time and play state
            // console.log(activeVideoRef.currentTime, activeInfo.videoTime);
            console.log(videoBufferRef.current);
            if (
              Math.abs(activeVideoRef.currentTime - activeInfo.videoTime) > 0.5
            ) {
              console.log(
                `1.9 Video already loaded, just sync time and play state`
              );
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
      // Start preloading next video when near end
      if (activeInfo.isNearEnd) {
        console.log({ activeInfo, buffer });
      }

      if (
        activeInfo.isNearEnd &&
        activeInfo.nextRecording &&
        buffer &&
        !buffer.nextRecordingPreloaded &&
        !buffer.isPreloading
      ) {
        console.log(
          `1.10 Start preloading next video when near end `,
          activeInfo
        );
        // console.log("preloadNextVideo");
        console.log(activeInfo);
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
  const switchToNextVideo = async (cameraName) => {
    console.log("🔄 switchToNextVideo called");

    // GUARD: Prevent concurrent switching
    if (switchingStateRef.current.isSwitching) {
      console.log("⚠️ Already switching, ignoring duplicate call");
      return;
    }

    // SET SWITCHING STATE
    switchingStateRef.current.isSwitching = true;

    const buffer = videoBufferRef.current;
    if (!buffer) {
      switchingStateRef.current.isSwitching = false;
      return;
    }

    const currentVideoRef =
      videoRefs.current[`${cameraName}_${buffer.activeVideoIndex}`];
    const nextVideoRef =
      videoRefs.current[`${cameraName}_${buffer.preloadingVideoIndex}`];

    if (!currentVideoRef || !nextVideoRef) {
      switchingStateRef.current.isSwitching = false;
      return;
    }

    // Ensure the next video is at the correct time (0 seconds) before showing it
    nextVideoRef.currentTime = 0;

    // Wait for the video to actually seek to the correct frame
    const switchWhenReady = () => {
      if (nextVideoRef.currentTime === 0 && nextVideoRef.readyState >= 2) {
        // CORRECTED Z-INDEX: Higher z-index = more visible
        currentVideoRef.style.zIndex = 1; // Hide current video
        nextVideoRef.style.zIndex = 2; // Show next video (bring to front)

        console.log("ZINDEX SWAPPED", switchingStateRef.current.isSwitching);
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
          `✅ Switched ${cameraName}: Now active video ${buffer.activeVideoIndex}, preloading video ${buffer.preloadingVideoIndex}`
        );

        // Start preloading the next recording
        const nextRecordingIndex = buffer.currentIndex + 1;
        console.log({ nextRecordingIndex, buffer });
        if (nextRecordingIndex < buffer.recordings.length) {
          const nextRecording = buffer.recordings[nextRecordingIndex];
          console.log({ nextRecording });
          // setTimeout(() => preloadNextVideo(cameraName, nextRecording), 1000);
          preloadNextVideo(cameraName, nextRecording);
        }

        // Add a safety timeout to prevent permanent stuck state
        const switchTimeout = setTimeout(() => {
          if (switchingStateRef.current.isSwitching) {
            console.log(
              `⚠️ Switching timeout for ${cameraName}, forcing reset`
            );
            switchingStateRef.current.isSwitching = false;
            switchingStateRef.current.pendingUpdate = null;
          }
        }, 5000);

        // CLEAR SWITCHING STATE
        switchingStateRef.current.isSwitching = false;
        clearTimeout(switchTimeout);
        console.log("switchingStateRef.current.isSwitching");
        console.log(downloadedVideos.get());
        console.log({ buffer });

        // PROCESS PENDING UPDATES
        if (switchingStateRef.current.pendingUpdate) {
          const pendingTime = switchingStateRef.current.pendingUpdate;
          switchingStateRef.current.pendingUpdate = null;
          console.log("🔄 Processing queued update after switch");
          setTimeout(() => updateVideoPlayback(pendingTime), 100);
        }
      } else {
        // Video not ready yet, wait a bit more
        setTimeout(switchWhenReady, 16); // ~60fps check
      }
    };

    // Start the switching process
    switchWhenReady();
  };

  const switchToNextVideo2 = (cameraName) => {
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

  // Function to find which recording should be playing at a given time
  const findActiveRecording = (cameraRecordings, playbackTime) => {
    if (!cameraRecordings || cameraRecordings.length === 0) return null;

    // const sortedRecordings = [...cameraRecordings].sort(
    //   (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
    // );

    const sortedRecordings = sortedRecordings$.get();

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
        console.log(
          videoTime,
          recording.Duration,
          videoTime > recording.Duration / 2
        );
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

  const debouncedUpdateVideoPlayback = useRef(
    debounce(updateVideoPlayback, 50) // 50ms debounce
  ).current;

  useObserve(() => {
    if (CurrentVideo.get()) {
      setTimeout(() => {
        updateVideoPlayback();
      }, 0);
    }
  });

  const startVideoPlayback = () => {
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
  };

  // useObserve(() => {
  //   const currentTime = CurrentTime.get();
  //   const playing = isPlaying.get();
  //   const currentVideo = CurrentVideo.get();

  //   if (currentTime && currentVideo) {
  //     updateVideoPlayback();
  //   }

  //   if (playing) {
  //     startVideoPlayback();
  //   }
  // });

  //  useObserve(() => {
  //    if (CurrentTime.get()) {
  //      debouncedUpdateVideoPlayback();
  //    }
  //  });

  useObserve(() => {
    if (CurrentTime.get()) {
      updateVideoPlayback();
      // debouncedUpdateVideoPlayback(CurrentTime.get());
    }
  });

  useObserve(() => {
    if (isPlaying.get()) {
      startVideoPlayback();
      // console.log("playing......");
      // const buffer = videoBufferRef.current;
      // if (buffer) {
      //   const activeVideoRef =
      //     videoRefs.current[`${cameraName.get()}_${buffer.activeVideoIndex}`];
      //   if (activeVideoRef && activeVideoRef.src) {
      //     console.log(
      //       `▶️ Starting playback for ${cameraName.get()}, active video ${
      //         buffer.activeVideoIndex
      //       }`
      //     );
      //     activeVideoRef
      //       .play()
      //       .then(() => {
      //         console.log(`✅ Playing ${cameraName.get()}`);
      //       })
      //       .catch((error) => {
      //         console.error(`❌ Failed to play ${cameraName.get()}:`, error);
      //       });
      //   }
      // }
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
                  console.log({ buffer });
                  console.log(switchingStateRef.current.isSwitching);
                  console.log("VIDEO 1 ENDED");
                  if (
                    buffer &&
                    buffer.activeVideoIndex === 0 &&
                    buffer.nextRecordingPreloaded &&
                    !switchingStateRef.current.isSwitching
                  ) {
                    // isSwitching.set(true);
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
                  const buffer = videoBufferRef.current;
                  console.log("VIDEO 2 ENDED");
                  console.log({ buffer });
                  console.log(switchingStateRef.current.isSwitching);
                  if (
                    buffer &&
                    buffer.activeVideoIndex === 1 &&
                    buffer.nextRecordingPreloaded &&
                    !switchingStateRef.current.isSwitching
                  ) {
                    // isSwitching.set(true);
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

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
