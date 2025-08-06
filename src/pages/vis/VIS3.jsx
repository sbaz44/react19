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

  const { isPlaying, CurrentTime, RecordingsData, PlaybackSpeed } =
    useObservable({
      isPlaying: false,
      CurrentTime: null,
      RecordingsData: recordingsData,
      PlaybackSpeed: 1,
    });

  const cameraNames = useComputed(Object.keys(RecordingsData.get()));

  const handlePlayPause = () => {};

  const findActiveRecordings = (time) => {
    const active = {};
    cameraNames.get().forEach((camera) => {
      active[camera] = null;
    });

    timelineData.current.items.forEach((recording) => {
      if (time >= recording.startTime && time <= recording.endTime) {
        active[recording.cameraName] = recording;
      }
    });

    return active;
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
    // console.log({ timelineProperties });
    console.log("🖱️ Timeline clicked during playback:", isPlaying.get());
    let _time = timelineProperties.time;
    // console.log({ _time });
    if (typeof _time !== "number") {
      _time = timelineProperties.time.getTime();
    }
    // console.log({ _time });
    // const clickedTime = new Date(timelineProperties.time.valueOf());

    //rounding off time,
    const snappedTime = new Date(Math.round(_time / 500) * 500);
    // console.log("📍 Setting time to:", snappedTime.toISOString());
    // console.log("📍 Current animation frame ID:", animationRef.current);

    // Invalidate any running animation immediately
    animationId.current = null;
    // console.log("🛑 Invalidated animation ID");

    timeline.current.setCustomTime(snappedTime, "playback");
    // timelineRef.current.currentTime.options.showCurrentTime = true;
    CurrentTime.set(snappedTime);
    console.log(
      "📍 After setting - CurrentTime is:",
      CurrentTime.get().toISOString()
    );
    // If playing, restart animation from new time
    if (isPlaying.get()) {
      console.log("🔄 Restarting animation from clicked time");
      startAnimation();
    }

    // Create a custom event with optional data
    const myEvent = new CustomEvent("timelineClicked", {
      detail: snappedTime,
    });

    document.dispatchEvent(myEvent);
  };

  useEffect(() => {
    if (!timelineRef.current) return;

    const { groups, items, globalStartTime, globalEndTime } =
      transformDataForTimeline(RecordingsData.get());
    console.log({ groups, items });

    const options = {
      stack: false,
      height: "200px",
      editable: false,
      selectable: false,
      orientation: "top",
      showCurrentTime: false,
      //  zoomMin: 1000 * 60,
      zoomMax: 1000 * 60 * 60 * 24,
      groupOrder: "id",
      // showMajorLabels: false,
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
    // console.log("✅ Starting fresh animation loop");

    // Cancel any existing animation first
    if (animationRef.current) {
      // console.log("🚫 Canceling existing animation");
      cancelAnimationFrame(animationRef.current);
    }

    const currentAnimationId = Date.now();
    animationId.current = currentAnimationId;
    // console.log("🆔 New animation ID:", currentAnimationId);

    const startRealTime = Date.now();
    const startPlaybackTime = CurrentTime.peek().getTime(); // Use peek to avoid subscription

    const animate = () => {
      // Check if this animation is still valid
      if (animationId.current !== currentAnimationId) {
        console.log("❌ Stale animation frame - ignoring");
        return;
      }

      // Check if still playing without creating subscription
      if (!isPlaying.peek()) {
        //"🛑 Animation stopped - not playing"
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
        //"🛑 End of timeline reached"
        isPlaying.set(false);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }).current;

  // This useObserve only handles play/pause state changes
  useObserve(() => {
    // console.log(
    //   "🔄 useObserve triggered - isPlaying:",
    //   isPlaying.get(),
    //   CurrentTime.get()?.getTime()
    // );

    if (
      isPlaying.get() &&
      CurrentTime.get() &&
      timelineData.current.startTime &&
      timelineData.current.endTime
    ) {
      // console.log("▶️ Play button pressed - starting animation");
      startAnimation();
    } else {
      // console.log(
      //   "⏸️ Pause button pressed or conditions not met - stopping animation"
      // );
      if (animationRef.current) {
        // console.log("🚫 Canceling animation frame");
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
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
                console.log(RecordingData$.get());
                return (
                  <VISVideo2
                    key={item.peek()}
                    cameraName={item}
                    RecordingsData={RecordingData$}
                    CurrentTime={CurrentTime}
                    isPlaying={isPlaying}
                    timelineData={timelineData}
                  />
                );
              }}
            </For>
          )}
        </Show>
      </div>

      <Reactive.button
        onClick={() => {
          isPlaying.set((prev) => !prev);
          if (!isPlaying.get()) {
            console.log("first");
            // Reset current time to start when paused
            // CurrentTime.set(timelineData.current.startTime);
            // cancelAnimationFrame(animationRef.current);
            // animationRef.current = null;
            // CurrentTime.set(null);
          }
        }}
        $className={() =>
          `px-10 py-10 ${
            isPlaying.get()
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } text-white rounded transition-colors flex items-center gap-2`
        }
      >
        <Memo>
          {() => {
            return isPlaying.get() ? <>⏸ Pause</> : <>▶ Play</>;
          }}
        </Memo>
      </Reactive.button>
      <div ref={timelineRef} style={{ height: "200px", width: "100%" }} />
    </div>
  );
}

const recordingsData = {
  "camera 1": [
    {
      Path: "/static_server/recorder/assets/splits/1.mp4",
      Duration: 29.895,
      StartTime: "2025-07-31T12:17:18+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/2.mp4",
      Duration: 31.835,
      StartTime: "2025-07-31T12:18:20+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/3.mp4",
      Duration: 30.348,
      StartTime: "2025-07-28T12:23:05+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/4.mp4",
      Duration: 39.915,
      StartTime: "2025-07-28T12:24:05+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/5.mp4",
      Duration: 24.79,
      StartTime: "2025-07-28T12:25:07+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/6.mp4",
      Duration: 30.47,
      StartTime: "2025-07-28T12:26:09+05:30",
    },
  ],
  "camera 2": [
    {
      Path: "/static_server/recorder/assets/splits/7.mp4",
      Duration: 33.88,
      StartTime: "2025-07-28T12:21:23+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/8.mp4",
      Duration: 21.85,
      StartTime: "2025-07-28T12:22:27+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/9.mp4",
      Duration: 21.618,
      StartTime: "2025-07-28T12:23:31+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/10.mp4",
      Duration: 25.101,
      StartTime: "2025-07-28T12:24:35+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/11.mp4",
      Duration: 15.743,
      StartTime: "2025-07-28T12:25:39+05:30",
    },
    {
      Path: "/static_server/recorder/assets/splits/12.mp4",
      Duration: 10.844,
      StartTime: "2025-07-28T12:26:43+05:30",
    },
  ],
};
