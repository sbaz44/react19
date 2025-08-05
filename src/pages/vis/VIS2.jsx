import "./vis.scss";
import {
  For,
  observer,
  Show,
  useComputed,
  useObservable,
  useObserve,
  Reactive,
  Memo,
} from "@legendapp/state/react";
import { useEffect } from "react";
import { useRef } from "react";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import VISVideo from "./VISVideo";
export default function VIS2() {
  const timelineRef = useRef(null);
  const timeline = useRef(null);
  const playbackIntervalRef = useRef(null);
  const renderCount = ++useRef(0).current;

  const { RecordingsData, CurrentTime, isPlaying } = useObservable({
    RecordingsData: recordingsData,
    CurrentTime: null,
    isPlaying: false,
  });

  const timeRange = useComputed(() => getTimeRange(RecordingsData.get()));

  useEffect(() => {
    const transformDataForTimeline = (data) => {
      console.log("transformDataForTimeline");
      const groups = [];
      const items = [];
      let itemId = 1;

      Object.keys(data).forEach((cameraName, groupIndex) => {
        groups.push({
          id: groupIndex + 1,
          content: cameraName.charAt(0).toUpperCase() + cameraName.slice(1),
          className: `camera-group-${groupIndex + 1}`,
        });

        const sortedRecordings = [...data[cameraName]].sort(
          (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
        );

        const firstStartTime = new Date(sortedRecordings[0].StartTime);
        let continuousStartTime = firstStartTime;

        sortedRecordings.forEach((recording, recordingIndex) => {
          const originalStartTime = new Date(recording.StartTime);
          const durationMs = recording.Duration * 1000;
          const continuousEndTime = new Date(
            continuousStartTime.getTime() + durationMs
          );
          const fileName = recording.Path.split("/").pop().replace(".mp4", "");
          const originalEndTime = new Date(
            originalStartTime.getTime() + durationMs
          );

          items.push({
            id: itemId++,
            group: groupIndex + 1,
            //   content: `${fileName.substring(11, 19)}`,
            start: continuousStartTime,
            end: continuousEndTime,
            type: "range",
            className: `recording-item camera-${groupIndex + 1}`,
            originalData: {
              ...recording,
              originalStartTime: originalStartTime,
              originalEndTime: originalEndTime,
              continuousStartTime: continuousStartTime,
              continuousEndTime: continuousEndTime,
            },
          });

          continuousStartTime = continuousEndTime;
        });
      });

      return { groups, items };
    };
    const { groups, items } = transformDataForTimeline(RecordingsData.get());
    const groupsDataSet = new DataSet(groups);
    const itemsDataSet = new DataSet(items);
    const { earliestTime, latestTime } = timeRange.get();
    if (!CurrentTime.get() && earliestTime) {
      CurrentTime.set(earliestTime);
    }

    const options = {
      stack: false,
      height: "400px",
      editable: false,
      selectable: false,
      orientation: "top",
      showCurrentTime: false,
      //  zoomMin: 1000 * 60,
      zoomMax: 1000 * 60 * 60 * 24,
      groupOrder: "content",
      showMajorLabels: false,
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

    if (timelineRef.current) {
      timeline.current = new Timeline(
        timelineRef.current,
        itemsDataSet,
        groupsDataSet,
        options
      );

      setTimeout(() => {
        if (timeline.current && CurrentTime.get()) {
          try {
            timeline.current.addCustomTime(CurrentTime.get(), "playback");
            timeline.current.setCustomTimeTitle(
              "Playback Position",
              "playback"
            );
          } catch (error) {
            console.log(error);
            console.log("Custom time already exists or timeline not ready");
          }
        }
      }, 100);

      timeline.current.on("timechange", (event) => {
        if (event.id === "playback") {
          CurrentTime.set(event.time);
        }
      });
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      if (timeline.current) {
        timeline.current.destroy();
      }
    };
  }, []);

  // Initialize currentTime when component mounts
  useEffect(() => {
    // const { earliestTime, latestTime } = getTimeRange(RecordingsData.get());
    const { earliestTime, latestTime } = timeRange.get();
    if (earliestTime) {
      CurrentTime.set(earliestTime);
    }
  }, []);

  const RecordingKeys$ = useComputed(() => Object.keys(RecordingsData.get()));

  const startPlayback = () => {
    if (isPlaying.get()) return;

    isPlaying.set(true);

    // const { earliestTime, latestTime } = getTimeRange(RecordingsData.get());
    const { earliestTime, latestTime } = timeRange.get();
    playbackIntervalRef.current = setInterval(() => {
      CurrentTime.set((prevTime) => {
        const newTime = new Date(prevTime.getTime() + 1000);
        if (newTime >= latestTime) {
          return earliestTime;
        }
        return newTime;
      });

      if (timeline?.current) {
        try {
          timeline.current.setCustomTime(CurrentTime.get(), "playback");
          // timeline.current.moveTo(CurrentTime.get(), { animation: true });
        } catch (error) {
          // timeline.current.moveTo(CurrentTime.get(), { animation: true });

          timeline.current.addCustomTime(CurrentTime.get(), "playback");
          timeline.current.setCustomTimeTitle("Playback Position", "playback");
        }

        // updateVideoPlayback(currentTime);
      }
    }, 1000);
  };

  const stopPlayback = () => {
    console.log("stopPlayback");
    isPlaying.set(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    // Object.keys(RecordingsData.get()).forEach((cameraName) => {
    //   const video0 = videoRefs.current[`${cameraName}_0`];
    //   const video1 = videoRefs.current[`${cameraName}_1`];
    //   if (video0 && !video0.paused) video0.pause();
    //   if (video1 && !video1.paused) video1.pause();
    // });
  };

  return (
    <div className="vis_container">
      <p
        style={{
          position: "absolute",
          top: 4,
          left: 5,
          fontSize: "20px",
        }}
      >
        {renderCount}
      </p>
      <div className="vis_videos_wrapper">
        <Show if={CurrentTime}>
          {() => (
            <For each={RecordingKeys$}>
              {(item) => {
                const RecordingData$ = useComputed(
                  () => RecordingsData.get()[item.get()]
                );

                return (
                  <VISVideo
                    key={item.peek()}
                    cameraName={item}
                    RecordingsData={RecordingData$}
                    CurrentTime={CurrentTime}
                    isPlaying={isPlaying}
                  />
                );
              }}
            </For>
          )}
        </Show>
      </div>
      <Reactive.button
        onClick={() => (isPlaying.get() ? stopPlayback() : startPlayback())}
        $style={() => ({
          marginRight: "10px",
          padding: "8px 16px",
          backgroundColor: isPlaying.get() ? "#dc3545" : "#17a2b8",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        })}
      >
        <Memo>
          {() => <p>{isPlaying.get() ? "Stop Playback" : "Start Playback"}</p>}
        </Memo>
      </Reactive.button>
      {/* <button onClick={startPlayback}>Start</button> */}
      {/* Timeline */}
      <div
        ref={timelineRef}
        style={{ border: "1px solid #ddd", borderRadius: "4px" }}
      />
    </div>
  );
}

const recordingsData = {
  "camera 1": [
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-04/2025-08-04-21-12-16-155.mp4",
      Duration: 61.16699981689453,
      StartTime: "2025-08-04T21:12:16+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-04/2025-08-04-21-13-17-156.mp4",
      Duration: 61.388999938964844,
      StartTime: "2025-08-04T21:13:17+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-04/2025-08-04-21-14-18-157.mp4",
      Duration: 61.20500183105469,
      StartTime: "2025-08-04T21:14:18+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-04/2025-08-04-21-15-19-158.mp4",
      Duration: 61.27799987792969,
      StartTime: "2025-08-04T21:15:19+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-04/2025-08-04-21-16-20-159.mp4",
      Duration: 60.369998931884766,
      StartTime: "2025-08-04T21:16:20+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affd4bf53fcbc23e1c5f/2025-08-04/2025-08-04-21-17-20-160.mp4",
      Duration: 61.308998107910156,
      StartTime: "2025-08-04T21:17:20+05:30",
    },
  ],
  "camera 2": [
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-04/2025-08-04-21-11-52-155.mp4",
      Duration: 60.284000396728516,
      StartTime: "2025-08-04T21:11:52+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-04/2025-08-04-21-12-52-156.mp4",
      Duration: 60.31700134277344,
      StartTime: "2025-08-04T21:12:52+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-04/2025-08-04-21-13-52-157.mp4",
      Duration: 60.30799865722656,
      StartTime: "2025-08-04T21:13:52+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-04/2025-08-04-21-14-52-158.mp4",
      Duration: 60.4370002746582,
      StartTime: "2025-08-04T21:14:52+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-04/2025-08-04-21-15-53-159.mp4",
      Duration: 62.10100173950195,
      StartTime: "2025-08-04T21:15:53+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/6890affc4bf53fcbc23e1c5e/2025-08-04/2025-08-04-21-16-55-160.mp4",
      Duration: 60.48699951171875,
      StartTime: "2025-08-04T21:16:55+05:30",
    },
  ],
};

export const getTimeRange = (data) => {
  let earliestTime = null;
  let latestTime = null;

  Object.values(data).forEach((recordings) => {
    const sortedRecordings = [...recordings].sort(
      (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
    );

    if (sortedRecordings.length > 0) {
      const firstStart = new Date(sortedRecordings[0].StartTime);
      if (!earliestTime || firstStart < earliestTime) {
        earliestTime = firstStart;
      }
      const totalDuration = sortedRecordings.reduce(
        (sum, rec) => sum + rec.Duration,
        0
      );
      const lastTime = new Date(firstStart.getTime() + totalDuration * 1000);
      if (!latestTime || lastTime > latestTime) {
        latestTime = lastTime;
      }
    }
  });

  return { earliestTime, latestTime };
};
