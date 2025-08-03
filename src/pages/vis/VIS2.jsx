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
    // console.log({ groups, items });
    const groupsDataSet = new DataSet(groups);
    const itemsDataSet = new DataSet(items);
    const { earliestTime, latestTime } = timeRange.get();
    // console.log({ earliestTime, latestTime });
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

  const stopPlayback = () => {};

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
        onClick={isPlaying.get() ? stopPlayback : startPlayback}
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
      Path: "/static_server/recorder/recordings/688376fae6f5c6a7b8d0757a/2025-07-31/2025-07-31-12-17-18-223.mp4",
      Duration: 62.23899841308594,
      StartTime: "2025-07-31T12:17:18+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/688376fae6f5c6a7b8d0757a/2025-07-31/2025-07-31-12-18-20-224.mp4",
      Duration: 60.35300064086914,
      StartTime: "2025-07-31T12:18:20+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/688376fae6f5c6a7b8d0757a/2025-07-31/2025-07-31-12-19-20-225.mp4",
      Duration: 62.29800033569336,
      StartTime: "2025-07-31T12:19:20+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/688376fae6f5c6a7b8d0757a/2025-07-31/2025-07-31-12-20-23-226.mp4",
      Duration: 62.236000061035156,
      StartTime: "2025-07-31T12:20:23+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/688376fae6f5c6a7b8d0757a/2025-07-31/2025-07-31-12-21-24-227.mp4",
      Duration: 60.340999603271484,
      StartTime: "2025-07-31T12:21:24+05:30",
    },
    {
      Path: "/static_server/recorder/recordings/688376fae6f5c6a7b8d0757a/2025-07-31/2025-07-31-12-22-25-228.mp4",
      Duration: 60.404998779296875,
      StartTime: "2025-07-31T12:22:25+05:30",
    },
  ],
  // "camera 2": [
  //   {
  //     // Path: "/static_server/recorder/assets/splits/1.mp4",
  //     Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-16-37-18.mp4",
  //     Duration: 64,
  //     StartTime: "2025-07-31T12:16:37+05:30",
  //   },
  //   {
  //     Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-17-41-19.mp4",
  //     Duration: 63.97800064086914,
  //     StartTime: "2025-07-31T12:17:41+05:30",
  //   },
  //   {
  //     Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-18-45-20.mp4",
  //     Duration: 64.11399841308594,
  //     StartTime: "2025-07-31T12:18:45+05:30",
  //   },
  //   {
  //     Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-19-49-21.mp4",
  //     Duration: 63.974998474121094,
  //     StartTime: "2025-07-31T12:19:49+05:30",
  //   },
  //   {
  //     Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-20-53-22.mp4",
  //     Duration: 64,
  //     StartTime: "2025-07-31T12:20:53+05:30",
  //   },
  //   {
  //     Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-21-57-23.mp4",
  //     Duration: 63.972999572753906,
  //     StartTime: "2025-07-31T12:21:57+05:30",
  //   },
  // ],
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
