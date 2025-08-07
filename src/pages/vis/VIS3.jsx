import {
  For,
  Memo,
  Reactive,
  Show,
  useComputed,
  useObservable,
  useObserve,
  useUnmount,
} from "@legendapp/state/react";
import React, { useEffect, useRef } from "react";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import "vis-timeline/styles/vis-timeline-graph2d.css";
import VISVideo2 from "./VISVideo2";
const HOST_URL = "http://192.168.1.121:8000";
import "./vis.scss";

export default function VIS3() {
  const animationRef = useRef(null);
  const timelineRef = useRef(null);
  const timeline = useRef(null);
  const animationId = useRef(null);

  const timelineData = useRef({
    items: [],
    startTime: null,
    endTime: null,
  });

  const {
    isPlaying,
    CurrentTime,
    RecordingsData,
    PlaybackSpeed,
    loadingCameras,
    isSystemLoading,
  } = useObservable({
    isPlaying: false,
    CurrentTime: null,
    RecordingsData: recordingsData,
    PlaybackSpeed: 1,
    loadingCameras: new Set(),
    isSystemLoading: false,
  });

  const cameraNames = useComputed(Object.keys(RecordingsData.get()));
  const handleSpeedChange = (speed) => PlaybackSpeed.set(speed);

  const handlePlayPause = () => {
    // Don't allow play/pause during loading
    console.log(isSystemLoading.get());
    if (isSystemLoading.get()) return;

    isPlaying.set((prev) => !prev);
  };

  const transformDataForTimeline = (data) => {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#9C27B0",
      "#F44336",
      "#607D8B",
    ];
    const groups = new DataSet();
    const items = new DataSet();
    const processedRecordings = [];
    let globalStartTime = null;
    let globalEndTime = null;

    // Create groups and process recordings for each camera
    cameraNames.get().forEach((cameraName, cameraIndex) => {
      const color = colors[cameraIndex % colors.length];

      // Add group
      groups.add({
        id: cameraIndex,
        content: cameraName,
        style: `background-color: ${color}; color: white;`,
      });

      // Sort recordings by start time
      const recordings = RecordingsData.get()[cameraName].sort(
        (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
      );

      // Create sequential timeline for this camera
      let sequentialTime = new Date(recordings[0].StartTime);

      if (!globalStartTime || sequentialTime < globalStartTime) {
        globalStartTime = sequentialTime;
      }

      recordings.forEach((recording, recordingIndex) => {
        const startTime = new Date(sequentialTime);
        const endTime = new Date(
          startTime.getTime() + recording.Duration * 1000
        );
        const fileName = recording.Path.split("/").pop();

        if (!globalEndTime || endTime > globalEndTime) {
          globalEndTime = endTime;
        }

        // Add to timeline items
        items.add({
          id: `${cameraIndex}_${recordingIndex}`,
          group: cameraIndex,
          content: `${fileName} (${Math.round(recording.Duration)}s)`,
          start: startTime,
          end: endTime,
          title: `Camera: ${cameraName}\nFile: ${fileName}\nDuration: ${recording.Duration.toFixed(
            2
          )}s`,
        });

        // Store for video playback
        processedRecordings.push({
          cameraName,
          fileName,
          startTime,
          endTime,
          videoUrl: HOST_URL + recording.Path,
          duration: recording.Duration,
          recording: recording, // Store original recording data
        });

        // Move to next position
        sequentialTime = endTime;
      });
    });

    // Store processed data
    timelineData.current = {
      items: processedRecordings,
      startTime: globalStartTime,
      endTime: globalEndTime,
    };

    return {
      groups,
      items,
      globalStartTime,
      globalEndTime,
    };
  };

  const onTimelineClick = (timelineProperties) => {
    console.log("🖱️ Timeline clicked during playback:", isPlaying.get());

    // Don't allow timeline interaction during loading
    if (isSystemLoading.get()) {
      console.log("🚫 Timeline interaction blocked - system is loading");
      return;
    }

    let _time = timelineProperties.time;
    if (typeof _time !== "number") {
      _time = timelineProperties.time.getTime();
    }

    // Rounding off time
    const snappedTime = new Date(Math.round(_time / 500) * 500);
    console.log("📍 Setting time to:", snappedTime.toISOString());

    // Invalidate any running animation immediately
    animationId.current = null;
    console.log("🛑 Invalidated animation ID");

    // Pause playback immediately to prevent time updates during loading
    const wasPlaying = isPlaying.get();
    if (wasPlaying) {
      isPlaying.set(false);
    }

    timeline.current.setCustomTime(snappedTime, "playback");
    CurrentTime.set(snappedTime);

    // Create a custom event with optional data
    const myEvent = new CustomEvent("timelineClicked", {
      detail: snappedTime,
    });
    document.dispatchEvent(myEvent);

    // Store the playing state to resume after loading if needed
    if (wasPlaying) {
      // Will be resumed by loading finish handler
      setTimeout(() => {
        if (!isSystemLoading.get()) {
          isPlaying.set(true);
        }
      }, 100);
    }
  };

  useEffect(() => {
    if (!timelineRef.current) return;

    const { groups, items, globalStartTime, globalEndTime } =
      transformDataForTimeline(RecordingsData.get());

    const options = {
      stack: false,
      height: "200px",
      editable: false,
      selectable: false,
      orientation: "top",
      showCurrentTime: false,
      zoomMax: 1000 * 60 * 60 * 24,
      groupOrder: "id",
      margin: { item: 10, axis: 20 },
      format: {
        minorLabels: {
          minute: "HH:mm",
          hour: "HH:mm",
        },
        majorLabels: {
          minute: "ddd DD MMM",
          hour: "ddd DD MMM",
        },
      },
    };

    timeline.current = new Timeline(
      timelineRef.current,
      items,
      groups,
      options
    );

    // Set initial position and add custom time indicator
    if (globalStartTime) {
      timeline.current.addCustomTime(globalStartTime, "playback");
      CurrentTime.set(globalStartTime);
    }

    timeline.current.on("click", onTimelineClick);

    return () => {
      if (timeline.current) timeline.current.destroy();
    };
  }, []);

  const startAnimation = useRef(() => {
    // Don't start animation if system is loading
    if (isSystemLoading.get()) {
      console.log("🚫 Animation blocked - system is loading");
      return;
    }

    // console.log("✅ Starting fresh animation loop");

    // Cancel any existing animation first
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const currentAnimationId = Date.now();
    animationId.current = currentAnimationId;

    const startRealTime = Date.now();
    const startPlaybackTime = CurrentTime.peek().getTime();

    const animate = () => {
      // Check if this animation is still valid
      if (animationId.current !== currentAnimationId) {
        console.log("❌ Stale animation frame - ignoring");
        return;
      }

      // Check if system is loading - pause if so
      if (isSystemLoading.peek()) {
        console.log("⏸️ Animation paused - system loading");
        animationRef.current = null;
        return;
      }

      // Check if still playing without creating subscription
      if (!isPlaying.peek()) {
        console.log("🛑 Animation stopped - not playing");
        animationRef.current = null;
        const snappedTime = new Date(
          Math.round(CurrentTime.get().getTime() / 500) * 500
        );
        CurrentTime.set(snappedTime);
        timeline.current.setCustomTime(snappedTime, "playback");
        return;
      }

      const realTimeElapsed = Date.now() - startRealTime;
      const playbackTimeElapsed = realTimeElapsed * PlaybackSpeed.peek();
      const newTime = new Date(startPlaybackTime + playbackTimeElapsed);

      if (newTime <= timelineData.current.endTime) {
        CurrentTime.set(newTime);
        timeline.current.setCustomTime(newTime, "playback");
        animationRef.current = requestAnimationFrame(animate);
      } else {
        console.log("🛑 End of timeline reached");
        isPlaying.set(false);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }).current;

  // Handle play/pause state changes
  useObserve(() => {
    if (
      isPlaying.get() &&
      CurrentTime.get() &&
      timelineData.current.startTime &&
      timelineData.current.endTime &&
      !isSystemLoading.get() // Don't start if loading
    ) {
      // console.log("▶️ Play button pressed - starting animation");
      startAnimation();
    } else {
      if (animationRef.current) {
        console.log("⏸️ Stopping animation");
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  });

  // Listen for video loading events
  useEffect(() => {
    const handleVideoLoadingStart = (e) => {
      const { cameraName } = e.detail;
      console.log(`📥 Video loading started for ${cameraName}`);

      loadingCameras.set((prev) => {
        const newSet = new Set(prev);
        newSet.add(cameraName);
        return newSet;
      });

      isSystemLoading.set(true);
    };

    const handleVideoLoadingFinish = (e) => {
      const { cameraName } = e.detail;
      console.log(`📤 Video loading finished for ${cameraName}`);

      loadingCameras.set((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cameraName);
        return newSet;
      });

      // Check if all cameras finished loading
      if (loadingCameras.get().size === 0) {
        console.log("✅ All cameras finished loading");
        isSystemLoading.set(false);
      }
    };

    document.addEventListener("videoLoadingStart", handleVideoLoadingStart);
    document.addEventListener("videoLoadingFinish", handleVideoLoadingFinish);

    return () => {
      document.removeEventListener(
        "videoLoadingStart",
        handleVideoLoadingStart
      );
      document.removeEventListener(
        "videoLoadingFinish",
        handleVideoLoadingFinish
      );
    };
  }, []);

  // Resume playback when loading finishes (if was playing before)
  useObserve(() => {
    const loading = isSystemLoading.get();
    const playing = isPlaying.get();

    if (!loading && playing) {
      // Small delay to ensure videos are ready
      setTimeout(() => {
        if (isPlaying.get() && !isSystemLoading.get()) {
          startAnimation();
        }
      }, 100);
    }
  });

  return (
    <div className="vis_container">
      <div className="vis_videos_wrapper">
        <Show if={CurrentTime}>
          {() => (
            <For each={cameraNames}>
              {(item) => {
                const RecordingData$ = useComputed(
                  () => RecordingsData.get()[item.get()]
                );
                return (
                  <VISVideo2
                    key={item.peek()}
                    cameraName={item}
                    RecordingsData={RecordingData$}
                    CurrentTime={CurrentTime}
                    isPlaying={isPlaying}
                    timelineData={timelineData}
                    PlaybackSpeed={PlaybackSpeed}
                  />
                );
              }}
            </For>
          )}
        </Show>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <Reactive.button
          onClick={handlePlayPause}
          $disabled={() => isSystemLoading.get()}
          $className={() =>
            `px-10 py-10 ${
              isSystemLoading.get()
                ? "bg-gray-400 cursor-not-allowed"
                : isPlaying.get()
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white rounded transition-colors flex items-center gap-2`
          }
        >
          <Memo>
            {() => {
              if (isSystemLoading.get()) {
                return <>⏳ Loading...</>;
              }
              return isPlaying.get() ? <>⏸ Pause</> : <>▶ Play</>;
            }}
          </Memo>
        </Reactive.button>

        {[0.5, 1, 2, 4].map((speed) => (
          <Reactive.button
            key={speed}
            onClick={() => handleSpeedChange(speed)}
            $className={() =>
              `px-2 py-1 text-sm rounded ${
                PlaybackSpeed.get() === speed
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } transition-colors`
            }
          >
            {speed}x
          </Reactive.button>
        ))}

        <Show if={() => isSystemLoading.get()}>
          {() => (
            <div style={{ fontSize: "14px", color: "#666" }}>
              Loading cameras: {Array.from(loadingCameras.get()).join(", ")}
            </div>
          )}
        </Show>
      </div>

      <div ref={timelineRef} style={{ height: "200px", width: "100%" }} />
    </div>
  );
}

const recordingsData = {
  "camera 1": [
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-06/2025-08-06-15-59-36-24.mp4",
      Duration: 60.17900085449219,
      StartTime: "2025-08-06T15:59:36+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-06/2025-08-06-16-00-37-25.mp4",
      Duration: 60.875,
      StartTime: "2025-08-06T16:00:37+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-06/2025-08-06-16-01-37-26.mp4",
      Duration: 60.459999084472656,
      StartTime: "2025-08-06T16:01:37+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-06/2025-08-06-16-02-38-27.mp4",
      Duration: 60.11000061035156,
      StartTime: "2025-08-06T16:02:38+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-06/2025-08-06-16-03-38-28.mp4",
      Duration: 60.49599838256836,
      StartTime: "2025-08-06T16:03:38+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-06/2025-08-06-16-04-38-29.mp4",
      Duration: 60.4640007019043,
      StartTime: "2025-08-06T16:04:38+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-06/2025-08-06-16-05-39-30.mp4",
      Duration: 60.19300079345703,
      StartTime: "2025-08-06T16:05:39+05:30",
    },
  ],
  "camera 2": [
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-15-58-48-23.mp4",
      Duration: 60.13600158691406,
      StartTime: "2025-08-06T15:58:48+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-15-59-48-24.mp4",
      Duration: 60.17300033569336,
      StartTime: "2025-08-06T15:59:48+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-16-00-48-25.mp4",
      Duration: 60.13100051879883,
      StartTime: "2025-08-06T16:00:48+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-16-01-48-26.mp4",
      Duration: 62.07099914550781,
      StartTime: "2025-08-06T16:01:48+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-16-02-50-27.mp4",
      Duration: 62.055999755859375,
      StartTime: "2025-08-06T16:02:50+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-16-03-52-28.mp4",
      Duration: 62.07400131225586,
      StartTime: "2025-08-06T16:03:52+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-16-04-54-29.mp4",
      Duration: 60.19300079345703,
      StartTime: "2025-08-06T16:04:54+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-16-05-54-30.mp4",
      Duration: 62.04999923706055,
      StartTime: "2025-08-06T16:05:54+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-06/2025-08-06-16-06-56-31.mp4",
      Duration: 62.020999908447266,
      StartTime: "2025-08-06T16:06:56+05:30",
    },
  ],
  "camera 3": [
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-17-59-40-26.mp4",
      Duration: 61,
      StartTime: "2025-08-06T17:59:40+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-00-41-27.mp4",
      Duration: 64.14900207519531,
      StartTime: "2025-08-06T18:00:41+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-01-45-28.mp4",
      Duration: 68.58999633789062,
      StartTime: "2025-08-06T18:01:45+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-02-53-29.mp4",
      Duration: 60.33399963378906,
      StartTime: "2025-08-06T18:02:53+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-03-54-30.mp4",
      Duration: 68.9000015258789,
      StartTime: "2025-08-06T18:03:54+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-05-03-31.mp4",
      Duration: 66.80000305175781,
      StartTime: "2025-08-06T18:05:03+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-06-10-32.mp4",
      Duration: 60.20000076293945,
      StartTime: "2025-08-06T18:06:10+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-07-10-33.mp4",
      Duration: 63.96699905395508,
      StartTime: "2025-08-06T18:07:10+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-08-14-34.mp4",
      Duration: 61.30099868774414,
      StartTime: "2025-08-06T18:08:14+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-09-15-35.mp4",
      Duration: 60.33300018310547,
      StartTime: "2025-08-06T18:09:15+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/689343ff4bf53fcbc23e1c62/2025-08-06/2025-08-06-18-10-16-36.mp4",
      Duration: 69.93399810791016,
      StartTime: "2025-08-06T18:10:16+05:30",
    },
  ],
};
