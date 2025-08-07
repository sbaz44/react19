import {
  Reactive,
  Show,
  useObservable,
  useObserve,
  useSelector,
} from "@legendapp/state/react";
import cloneDeep from "lodash.clonedeep";
import React, { useEffect, useRef } from "react";
const HOST_URL = "http://192.168.1.121:8000";

export default function VISVideo2({
  cameraName,
  RecordingsData,
  CurrentTime,
  isPlaying,
  timelineData,
  PlaybackSpeed,
}) {
  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);
  const renderCount = ++useRef(0).current;

  const sortedRecordings$ = useSelector(() => {
    return [...RecordingsData.get()].sort(
      (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
    );
  });

  const { CurrentVideo, downloadedVideos, videoBuffer, isLoading } =
    useObservable({
      CurrentVideo: null,
      downloadedVideos: {},
      videoBuffer: {
        activeVideoIndex: 0, // 0 = videoRef1, 1 = videoRef2
        currentRecordingIndex: -1,
        isPreloadingNext: false,
        nextRecordingPreloaded: false,
      },
      isLoading: false,
    });

  // Fetch video and save as blob, check if blob is present already
  const fetchVideo = async (url, key) => {
    let _downloadedVideos = cloneDeep(downloadedVideos.get());
    if (_downloadedVideos[key]) {
      console.log(`✅ Video already present for ${url} at index- ${key}`);
      return _downloadedVideos[key];
    }
    console.log(`❌ Fetching new video from ${url} ${key}:`);
    try {
      const response = await fetch(url);
      let blob = await response.blob();
      blob = URL.createObjectURL(blob);
      _downloadedVideos = addOrUpdateObject(_downloadedVideos, key, blob);
      downloadedVideos.set(_downloadedVideos);
      return blob;
    } catch (error) {
      console.error("Error fetching video:", error);
      throw error;
    }
  };

  // Function to limit blob saving
  const addOrUpdateObject = (obj, newKey, newValue) => {
    obj[newKey] = newValue;
    if (Object.keys(obj).length > 3) {
      const firstKey = Object.keys(obj)[0];
      URL.revokeObjectURL(obj[firstKey]);
      console.log("DELETED BLOB: ", obj[firstKey]);
      delete obj[firstKey];
    }
    return obj;
  };

  const findActiveRecording = (playbackTime = CurrentTime.get()) => {
    if (!RecordingsData.get() || RecordingsData.get().length === 0) return null;

    const sortedRecordings = sortedRecordings$;
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
          isNearEnd: videoTime > recording.Duration - 3,
          totalRecordings: sortedRecordings.length,
        };
      }
      continuousTime = recordingEnd;
    }
    return null;
  };

  const getVideoRef = (index) => {
    return index === 0 ? videoRef1.current : videoRef2.current;
  };

  const setVideoZIndex = (activeIndex) => {
    const activeVideo = getVideoRef(activeIndex);
    const inactiveVideo = getVideoRef(activeIndex === 0 ? 1 : 0);

    if (activeVideo) {
      activeVideo.playbackRate = PlaybackSpeed.get();
      activeVideo.style.zIndex = "2";
    }
    if (inactiveVideo) inactiveVideo.style.zIndex = "1";
  };

  const loadVideoToRef = async (recording, videoRef, recordingIndex) => {
    console.log("🔄 loadVideoToRef called");

    if (!videoRef) {
      console.error("❌ Video ref is null");
      return false;
    }

    try {
      const videoKey = `${cameraName.get()}_${recordingIndex}`;
      console.log(`📥 Fetching video: ${videoKey}`);

      const blobUrl = await fetchVideo(
        `${HOST_URL}${recording.Path}`,
        videoKey
      );

      if (!blobUrl) {
        console.error("❌ Failed to get blob URL");
        return false;
      }

      videoRef.src = blobUrl;

      // Return a promise that resolves when load() completes
      return new Promise((resolve) => {
        const handleLoadStart = () => {
          console.log("📼 Video load started");
          videoRef.removeEventListener("loadstart", handleLoadStart);
        };

        const handleLoadedData = () => {
          console.log("✅ Video loaded data");
          videoRef.removeEventListener("loadeddata", handleLoadedData);
          videoRef.removeEventListener("error", handleError);
          resolve(true);
        };

        const handleError = (e) => {
          console.error("❌ Video load error:", e);
          videoRef.removeEventListener("loadeddata", handleLoadedData);
          videoRef.removeEventListener("error", handleError);
          resolve(false);
        };

        videoRef.addEventListener("loadstart", handleLoadStart);
        videoRef.addEventListener("loadeddata", handleLoadedData);
        videoRef.addEventListener("error", handleError);

        // Trigger the load
        videoRef.load();
      });
    } catch (error) {
      console.error("❌ Failed to load video:", error);
      return false;
    }
  };

  const preloadNextVideo = async (currentIndex) => {
    const buffer = videoBuffer.get();
    if (buffer.isPreloadingNext || buffer.nextRecordingPreloaded) return;

    const nextIndex = currentIndex + 1;
    const sortedRecordings = sortedRecordings$;

    if (nextIndex >= sortedRecordings.length) return;

    videoBuffer.set({
      ...buffer,
      isPreloadingNext: true,
    });

    const nextRecording = sortedRecordings[nextIndex];
    const preloadingVideoIndex = buffer.activeVideoIndex === 0 ? 1 : 0;
    const preloadingVideoRef = getVideoRef(preloadingVideoIndex);

    const success = await loadVideoToRef(
      nextRecording,
      preloadingVideoRef,
      nextIndex
    );

    videoBuffer.set({
      ...videoBuffer.get(),
      isPreloadingNext: false,
      nextRecordingPreloaded: success,
    });
  };

  const switchToNextVideo = () => {
    const buffer = videoBuffer.get();
    const currentActiveIndex = buffer.activeVideoIndex;
    const newActiveIndex = currentActiveIndex === 0 ? 1 : 0;

    // Switch z-index
    setVideoZIndex(newActiveIndex);

    // Update buffer state
    videoBuffer.set({
      ...buffer,
      activeVideoIndex: newActiveIndex,
      currentRecordingIndex: buffer.currentRecordingIndex + 1,
      nextRecordingPreloaded: false,
    });

    // Play the newly active video
    const newActiveVideo = getVideoRef(newActiveIndex);
    if (newActiveVideo && isPlaying.get()) {
      newActiveVideo.currentTime = 0;
      newActiveVideo.play();
    }

    // Preload next video
    preloadNextVideo(buffer.currentRecordingIndex + 1);
  };

  const handleSeek = async (time, onload = "") => {
    const activeInfo = findActiveRecording(time);

    if (!activeInfo) {
      CurrentVideo.set(null);
      return;
    }

    console.log(
      `🎯 Seeking ${cameraName.get()} to:`,
      activeInfo.videoTime,
      "seconds"
    );

    // Dispatch loading started event for timeline coordination
    const loadingStartEvent = new CustomEvent("videoLoadingStart", {
      detail: { cameraName: cameraName.get() },
    });
    document.dispatchEvent(loadingStartEvent);

    isLoading.set(true);

    try {
      CurrentVideo.set(activeInfo);

      const currentVideoIndex = 0; // Always start with video1 for seeking
      const inactiveVideoIndex = 1; // video2 will be inactive

      // // Wait a bit to ensure refs are available
      onload && (await sleep(100));

      const currentVideoRef = getVideoRef(currentVideoIndex);
      const inactiveVideoRef = getVideoRef(inactiveVideoIndex);

      // Check if video ref is available
      if (!currentVideoRef) {
        throw new Error(`Video ref ${currentVideoIndex} not available`);
      }

      // Hide inactive video during loading
      if (inactiveVideoRef) {
        inactiveVideoRef.style.opacity = "0";
      }

      // // Small delay for initial load
      // if (onload) {
      //   await sleep(50);
      // }

      console.log(`📦 Loading video for ${cameraName.get()}...`);

      // Load current video with error handling
      const loadSuccess = await loadVideoToRef(
        activeInfo.recording,
        currentVideoRef,
        activeInfo.recordingIndex
      );

      if (!loadSuccess) {
        throw new Error("Failed to load video");
      }

      // Wait for video to be ready with a simpler approach
      let retries = 0;
      const maxRetries = 50; // 5 seconds max wait

      while (retries < maxRetries) {
        if (currentVideoRef.readyState >= 2) {
          // HAVE_CURRENT_DATA or higher
          break;
        }
        await sleep(100);
        retries++;
      }

      if (retries >= maxRetries) {
        throw new Error("Video failed to load within timeout");
      }

      // Set video time
      currentVideoRef.currentTime = activeInfo.videoTime;
      console.log(`⏰ Set video time to ${activeInfo.videoTime} seconds`);

      // Wait for seek to complete
      let seekRetries = 0;
      while (
        seekRetries < 20 &&
        Math.abs(currentVideoRef.currentTime - activeInfo.videoTime) > 0.5
      ) {
        await sleep(50);
        seekRetries++;
      }

      // Update buffer state
      videoBuffer.set({
        activeVideoIndex: currentVideoIndex,
        currentRecordingIndex: activeInfo.recordingIndex,
        isPreloadingNext: false,
        nextRecordingPreloaded: false,
      });

      // Set z-index
      setVideoZIndex(currentVideoIndex);

      // Preload next video if available (don't wait for it)
      if (activeInfo.nextRecording) {
        setTimeout(() => {
          preloadNextVideo(activeInfo.recordingIndex);
        }, 500);
      }

      console.log(`✅ Video loaded successfully for ${cameraName.get()}`);
    } catch (error) {
      console.error(`❌ Error during seek for ${cameraName.get()}:`, error);
      // Set a fallback state
      CurrentVideo.set(null);
    } finally {
      isLoading.set(false);

      // Show inactive video again after seek is complete
      setTimeout(() => {
        const inactiveVideoRef = getVideoRef(1);
        if (inactiveVideoRef) {
          inactiveVideoRef.style.opacity = "1";
        }
      }, 300);

      // Dispatch loading finished event
      const loadingFinishedEvent = new CustomEvent("videoLoadingFinish", {
        detail: { cameraName: cameraName.get() },
      });
      document.dispatchEvent(loadingFinishedEvent);

      console.log(
        `📤 Loading finished event dispatched for ${cameraName.get()}`
      );
    }
  };

  // Initialize video system
  useEffect(() => {
    if (CurrentTime.get()) {
      const activeInfo = findActiveRecording(CurrentTime.get());
      if (activeInfo) {
        handleSeek(CurrentTime.get(), "onload");
      }
    }
  }, []);

  // Listen to timeline clicks
  useEffect(() => {
    const handleTimelineClick = (e) => {
      handleSeek(e.detail);
    };

    document.addEventListener("timelineClicked", handleTimelineClick);
    return () => {
      document.removeEventListener("timelineClicked", handleTimelineClick);
    };
  }, []);

  // Handle play/pause state changes
  useObserve(() => {
    const playing = isPlaying.get();
    const buffer = videoBuffer.get();
    const activeVideoRef = getVideoRef(buffer.activeVideoIndex);
    console.log({ activeVideoRef });
    if (!activeVideoRef || isLoading.get()) return;

    if (playing) {
      activeVideoRef.play();
    } else {
      activeVideoRef.pause();
    }
  });

  // Video event handlers
  const handleLoadedData = (videoIndex) => {
    console.log(`Video ${videoIndex + 1} loaded data for ${cameraName.get()}`);
  };

  const handleEnded = (videoIndex) => {
    console.log(`Video ${videoIndex + 1} ended for ${cameraName.get()}`);
    const buffer = videoBuffer.get();

    // Only handle if this is the currently active video
    if (
      buffer.activeVideoIndex === videoIndex &&
      buffer.nextRecordingPreloaded
    ) {
      switchToNextVideo();
    }
  };

  const handleCanPlay = (videoIndex) => {
    const buffer = videoBuffer.get();
    if (
      buffer.activeVideoIndex === videoIndex &&
      isPlaying.get() &&
      !isLoading.get()
    ) {
      const videoRef = getVideoRef(videoIndex);
      videoRef.play();
    }
  };

  // Cleanup blobs on unmount
  useEffect(() => {
    return () => {
      const videos = downloadedVideos.get();
      Object.values(videos).forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
    };
  }, []);

  useObserve(() => {
    if (!isPlaying.get()) return;

    const intervalId = setInterval(() => {
      const currentTime = CurrentTime.get();

      // Check if this camera should be playing something but isn't
      const shouldBeActive = findActiveRecording(currentTime);
      const isCurrentlyActive = CurrentVideo.get();
      // console.log({ shouldBeActive, isCurrentlyActive });
      if (shouldBeActive && !isCurrentlyActive) {
        // Camera should start playing - initialize video system
        handleSeek(currentTime, "onload");
      } else if (!shouldBeActive && isCurrentlyActive) {
        // Camera should stop playing
        CurrentVideo.set(null);
      }
    }, 1000 / PlaybackSpeed.get()); // Runs at playback speed intervals

    return () => clearInterval(intervalId);
  });

  // speed changes
  useObserve(() => {
    const speed = PlaybackSpeed.get();
    const buffer = videoBuffer.peek();
    const activeVideoRef = getVideoRef(buffer.activeVideoIndex);
    if (activeVideoRef) {
      activeVideoRef.playbackRate = speed;
    }
  });

  return (
    <div className="vis_video_item">
      <h4 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
        {cameraName.peek().charAt(0).toUpperCase() + cameraName.peek().slice(1)}
        ({renderCount}) {isLoading.get() && "(Loading...)"}
      </h4>
      <div className="video_item_wrapper" style={{ position: "relative" }}>
        <Show if={CurrentVideo} else={() => <div>No recording</div>}>
          {() => (
            <>
              <Reactive.video
                preload="metadata"
                ref={videoRef1}
                className="video_item"
                controls={true}
                muted
                onLoadedData={() => handleLoadedData(0)}
                onEnded={() => handleEnded(0)}
                onCanPlay={() => handleCanPlay(0)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 2,
                }}
              />
              <Reactive.video
                preload="metadata"
                ref={videoRef2}
                className="video_item"
                controls={true}
                muted
                onLoadedData={() => handleLoadedData(1)}
                onEnded={() => handleEnded(1)}
                onCanPlay={() => handleCanPlay(1)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                }}
              />
            </>
          )}
        </Show>
      </div>
    </div>
  );
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
