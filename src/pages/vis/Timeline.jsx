import axios from "axios";
const URL = "http://192.168.1.121:8000/api/v1/recorder/fetch";
import React, { useEffect, useRef, useState } from "react";
import { DataSet, Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import TimelineVideo from "./TimelineVideo";
import "./index.css";
import { For, Show, useObservable, useObserve } from "@legendapp/state/react";
import { getObservableIndex } from "@legendapp/state";
import { currentTime } from "@legendapp/state/helpers/time";
let _downloadedVideos = {};
// let interval = null;

const groupBy = (input, key) => {
  return input.reduce((acc, currentValue) => {
    let groupKey = currentValue[key];
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(currentValue);
    return acc;
  }, {});
};
export default function Timelines() {
  return (
    <div>
      <VideoTimelinePlayer groups={groups} items={items} />
    </div>
  );
}

const VideoTimelinePlayer = ({ groups, items }) => {
  const {
    currentVideos,
    downloadedVideos,
    SelectedCameras,
    GroupByID,
    GroupByName,
    isLoading,
    seekTime,
    currentTime,
    loadingQueue,
    interval,
    syncTimeline,
  } = useObservable({
    currentVideos: {},
    downloadedVideos: {},
    // SelectedCameras: ["202-profile000", "216-mainstream"],
    SelectedCameras: ["202-profile000"],
    GroupByID: {},
    GroupByName: {},
    isLoading: true,
    seekTime: null,
    // currentTime: new Date("2024-07-16T11:22:51"),
    currentTime: new Date("2024-07-16T11:22:51"),
    loadingQueue: null,
    interval: true,
    syncTimeline: true,
  });

  // const [currentVideos, setCurrentVideos] = useState({});
  // const [isPlaying, setIsPlaying] = useState(false);
  // const [timeline, setTimeline] = useState(null);
  // const [downloadedVideos, setDownloadedVideos] = useState({});
  // const [SelectedCameras, setSelectedCameras] = useState();
  const videoRefs = useRef({});
  const timelineRef = useRef(null);
  const timeline = useRef(null);
  useObserve(() => {
    if (loadingQueue.get() !== null && loadingQueue.get().length > 0) {
      console.log("something is loading");
      console.log(loadingQueue.get());
    } else {
      console.log("queue is empty");
      console.log(loadingQueue.get());
    }
  });

  useInterval(handleInterval, interval.get() ? 1000 : null);

  function handleInterval() {
    // console.log("handleInterval");
    let currentTimeLine = timeline.current.getCurrentTime();
    // console.log(currentTimeLine);
    currentTime.set(currentTimeLine);
    timeline.current.setCurrentTime(currentTimeLine);

    const videosAtTime = findVideosAtTime(items, currentTimeLine);
    // console.log({ currentTimeLine, videosAtTime });
  }
  useEffect(() => {
    const options = {
      // start: new Date(items[0].start),
      // end: new Date(items[items.length - 1].end),
      showCurrentTime: true,
      zoomable: true,
      moveable: true,
      min: new Date("2024-07-16T11:22:51"), // lower limit of visible range
      max: new Date("2024-07-16T11:25:51"),
    };

    timeline.current = new Timeline(timelineRef.current, items, options);
    timeline.current.setGroups(groups);
    let groupByName = {};
    groups.forEach((item) => {
      groupByName = {
        ...groupByName,
        [item.content]: item.id,
      };
    });
    // console.log({ groupByName });
    // setTimeline(newTimeline);
    // console.log(groupBy(groups, "id"));
    GroupByID.set(groupBy(items, "group"));
    GroupByName.set(groupByName);
    // console.log(GroupByID.get());
    timeline.current.on("click", onTimelineClick);
    isLoading.set(false);
    // interval = setInterval(() => {
    //   let currentTimeLine = timeline.current.getCurrentTime();
    //   console.log(currentTimeLine);
    //   currentTime.set(currentTimeLine);
    //   // const videosAtTime = findVideosAtTime(items, currentTimeLine);
    //   // console.log({ videosAtTime });
    // }, 1000);
    // console.log(timeline.current);
    // setTimeout(() => {
    //   timeline.current.currentTime.options.showCurrentTime = false;
    // }, 2000);
    // setTimeout(() => {
    //   timeline.current.currentTime.options.showCurrentTime = true;
    // }, 8000);
    // new Date('2024-07-16T05:52:49.000Z')
    // timeline.current.setCurrentTime(new Date("2024-07-16T05:52:45.000Z"));
    timeline.current.setCurrentTime(new Date("2024-07-16T11:22:51"));
    // Download and set initial videos
    // const initialVideos = findVideosAtTime(new Date(items[0].start));
    // initialVideos.forEach((video) => downloadVideo(video));

    return () => {
      if (timeline.current) {
        timeline.current.off("click", onTimelineClick);
        timeline.current.destroy();
      }
    };
  }, []);

  // useEffect(() => {
  //   Object.values(currentVideos).forEach((video) => {
  //     const videoElement = videoRefs.current[video.id];
  //     if (videoElement) {
  //       if (isPlaying) {
  //         videoElement.play();
  //       } else {
  //         videoElement.pause();
  //       }
  //     }
  //   });
  // }, [isPlaying, currentVideos]);

  const downloadVideo = async (video) => {
    if (downloadedVideos[video.id].get()) return;

    try {
      const response = await fetch(video.link);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      downloadedVideos.set((prev) => ({
        ...prev,
        [video.id]: url,
      }));
    } catch (error) {
      console.error("Error downloading video:", error);
    }
  };

  // const findVideosAtTime = (time) => {
  //   return items.filter(
  //     (item) => new Date(item.start) <= time && new Date(item.end) > time
  //   );
  // };

  const updateTimelineCurrentTime = () => {
    if (timeline && Object.keys(currentVideos).length > 0) {
      console.log("first");
      const firstVideoId = Object.keys(currentVideos)[0];
      const videoElement = videoRefs.current[firstVideoId];
      const video = currentVideos[firstVideoId];
      if (videoElement && video) {
        const currentTime = new Date(video.start);
        currentTime.setSeconds(
          currentTime.getSeconds() + videoElement.currentTime
        );
        timeline.setCurrentTime(currentTime);
      }
    }
  };

  const seekToTime = (videos, clickedTime) => {
    const newCurrentVideos = {};
    videos.forEach((video) => {
      const videoStartTime = new Date(video.start);
      const seekTime = (clickedTime - videoStartTime) / 1000; // in seconds
      newCurrentVideos[video.id] = { ...video, seekTime };
    });
    // setCurrentVideos(newCurrentVideos);
    currentVideos.set(newCurrentVideos);
  };

  const onTimelineClick = (properties) => {
    const clickedTime = properties.time;
    seekTime.set(clickedTime);
    const videosAtTime = findVideosAtTime(items, clickedTime);
    console.log({ clickedTime, videosAtTime });
    timeline.current.setCurrentTime(clickedTime);

    // if (videosAtTime.length > 0) {
    //   const notDownloadedVideos = videosAtTime.filter(
    //     (video) => !downloadedVideos[video.id]
    //   );
    //   console.log({ notDownloadedVideos });
    //   if (notDownloadedVideos.length > 0) {
    //     Promise.all(notDownloadedVideos.map(downloadVideo)).then(() =>
    //       seekToTime(videosAtTime, clickedTime)
    //     );
    //   } else {
    //     seekToTime(videosAtTime, clickedTime);
    //   }
    // }
  };

  const renderCount = ++useRef(0).current;

  return (
    <div>
      <div ref={timelineRef} style={{ height: "200px" }}></div>
      RC:{renderCount}
      <button
        style={{
          marginTop: "32px",
        }}
        onClick={() => {
          interval.set(true);
          timeline.current.setCurrentTime(new Date("2024-07-16T11:22:40"));
          console.log(interval.get());
        }}
      >
        Change timeline
      </button>
      <div className="timeline_video">
        <Show if={() => !isLoading.get()}>
          {() => (
            <For each={SelectedCameras}>
              {(item$) => {
                const idx = getObservableIndex(item$);
                return (
                  <TimelineVideo
                    data={GroupByID[GroupByName[item$.get()].get()]}
                    idx={idx}
                    groupName={item$}
                    seekTime={seekTime}
                    currentTime={currentTime}
                    timeline={timeline}
                    loadingQueue={loadingQueue}
                    handleSyncTime={({ start }) => {
                      if (syncTimeline.get()) {
                        let currentTimeLine = timeline.current.getCurrentTime();
                        console.log(currentTimeLine);
                        syncTimeline.set(false);
                        console.log(timeline.current.getCurrentTime());
                        timeline.current.setCurrentTime(new Date(start));
                        console.log();
                        currentTime.set(timeline.current.getCurrentTime());
                      }
                    }}
                  />
                );
              }}
            </For>
          )}
        </Show>
      </div>
      {/* {Object.values(currentVideos).map(
        (video) =>
          downloadedVideos[video.id] && (
            <video
              key={video.id}
              ref={(el) => (videoRefs.current[video.id] = el)}
              src={downloadedVideos[video.id]}
              onEnded={() => {
              }}
              // onTimeUpdate={updateTimelineCurrentTime}
              // autoPlay={isPlaying}
              autoPlay
              muted
              style={{ width: "300px", margin: "10px" }}
            />
          )
      )} */}
      {/* <button onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? "Pause" : "Play"}
      </button> */}
    </div>
  );
};

export const findVideosAtTime = (items, time) => {
  if (!items) return [];
  return items.filter(
    (item) => new Date(item.start) <= time && new Date(item.end) > time
  );
};

export const useInterval = (callback, delay) => {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

const items = [
  {
    group: 1,
    id: 1,
    start: "2024-07-16T11:22:51",
    end: "2024-07-16T11:23:02",
    link: "http://192.168.1.121:8000/static_server/assets/nature/output_time_0.mp4",
    path: null,
    content: "",
    className: "node1_10",
  },
  {
    group: 1,
    id: 2,
    start: "2024-07-16T11:23:02",
    end: "2024-07-16T11:23:12",
    link: "http://192.168.1.121:8000/static_server/assets/nature/output_time_1.mp4",
    path: null,
    content: "",
    className: "node2_10",
  },
  {
    group: 1,
    id: 3,
    start: "2024-07-16T11:23:12",
    end: "2024-07-16T11:23:22",
    link: "http://192.168.1.121:8000/static_server/assets/nature/output_time_2.mp4",
    path: null,
    content: "",
    className: "node3_10",
  },
  {
    group: 1,
    id: 4,
    start: "2024-07-16T11:23:22",
    end: "2024-07-16T11:23:32",
    link: "http://192.168.1.121:8000/static_server/assets/nature/output_time_3.mp4",
    path: null,
    content: "",
    className: "node4_10",
  },
  {
    group: 1,
    id: 5,
    start: "2024-07-16T11:23:32",
    end: "2024-07-16T11:23:42",
    link: "http://192.168.1.121:8000/static_server/assets/nature/output_time_4.mp4",
    path: null,
    content: "",
    className: "node5_10",
  },
  {
    group: 1,
    id: 6,
    start: "2024-07-16T11:23:42",
    end: "2024-07-16T11:23:50",
    link: "http://192.168.1.121:8000/static_server/assets/nature/output_time_5.mp4",
    path: null,
    content: "",
    className: "node6_10",
  },

  // xxxx
  // {
  //   group: 2,
  //   id: 1,
  //   start: "2024-07-16T11:22:51",
  //   end: "2024-07-16T11:23:05",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-001.mkv",
  //   path: null,
  //   content: "",
  //   className: "node1_10",
  // },
  // {
  //   group: 2,
  //   id: 2,
  //   start: "2024-07-16T11:23:05",
  //   end: "2024-07-16T11:23:16",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-002.mkv",
  //   path: null,
  //   content: "",
  //   className: "node2_10",
  // },
  // {
  //   group: 2,
  //   id: 3,
  //   start: "2024-07-16T11:23:16",
  //   end: "2024-07-16T11:23:27",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-003.mkv",
  //   path: null,
  //   content: "",
  //   className: "node3_10",
  // },
  // {
  //   group: 2,
  //   id: 4,
  //   start: "2024-07-16T11:23:27",
  //   end: "2024-07-16T11:23:37",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-004.mkv",
  //   path: null,
  //   content: "",
  //   className: "node4_10",
  // },
  // {
  //   group: 2,
  //   id: 5,
  //   start: "2024-07-16T11:23:37",
  //   end: "2024-07-16T11:23:48",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-005.mkv",
  //   path: null,
  //   content: "",
  //   className: "node5_10",
  // },
  // {
  //   group: 2,
  //   id: 6,
  //   start: "2024-07-16T11:23:48",
  //   end: "2024-07-16T11:23:59",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-006.mkv",
  //   path: null,
  //   content: "",
  //   className: "node6_10",
  // },
  // xxxx
  // {
  //   group: 2,
  //   id: 7,
  //   start: "2024-07-16T11:22:56",
  //   end: "2024-07-16T11:23:08",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-007.mkv",
  //   path: null,
  //   content: "",
  //   className: "node7_10",
  // },
  // {
  //   group: 2,
  //   id: 8,
  //   start: "2024-07-16T11:23:08",
  //   end: "2024-07-16T11:23:20",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-008.mkv",
  //   path: null,
  //   content: "",
  //   className: "node8_10",
  // },
  // {
  //   group: 2,
  //   id: 9,
  //   start: "2024-07-16T11:23:20",
  //   end: "2024-07-16T11:23:32",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-009.mkv",
  //   path: null,
  //   content: "",
  //   className: "node9_10",
  // },
  // {
  //   group: 2,
  //   id: 10,
  //   start: "2024-07-16T11:23:32",
  //   end: "2024-07-16T11:23:44",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-010.mkv",
  //   path: null,
  //   content: "",
  //   className: "node10_10",
  // },
  // {
  //   group: 2,
  //   id: 11,
  //   start: "2024-07-16T11:23:44",
  //   end: "2024-07-16T11:23:56",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-011.mkv",
  //   path: null,
  //   content: "",
  //   className: "node11_10",
  // },
  // {
  //   group: 2,
  //   id: 12,
  //   start: "2024-07-16T11:23:56",
  //   end: "2024-07-16T11:24:08",
  //   link: "http://192.168.1.121:8000/static_server/assets/nature/nature-012.mkv",
  //   path: null,
  //   content: "",
  //   className: "node12_10",
  // },
];

const groups = [
  {
    id: 1,
    content: "202-profile000",
  },
  {
    id: 2,
    content: "216-mainstream",
  },
];

const items2 = [
  {
    group: 1,
    id: 1,
    start: "2024-07-15T15:30:04",
    end: "2024-07-15T15:30:14",
    link: "http://192.168.1.121:8000/static_server/assets/202-profile000/52.53.mp4",
    content: "",
    className: "node1_10",
  },
  {
    group: 1,
    id: 2,
    start: "2024-07-15T15:30:14",
    end: "2024-07-15T15:30:24",
    link: "http://192.168.1.121:8000/static_server/assets/202-profile000/53.04.mp4",
    content: "",
    className: "node2_10",
  },
  {
    group: 1,
    id: 3,
    start: "2024-07-15T15:30:24",
    end: "2024-07-15T15:30:35",
    link: "http://192.168.1.121:8000/static_server/assets/202-profile000/53.14.mp4",
    content: "",
    className: "node3_10",
  },
  {
    group: 1,
    id: 4,
    start: "2024-07-15T15:30:35",
    end: "2024-07-15T15:30:45",
    link: "http://192.168.1.121:8000/static_server/assets/202-profile000/53.25.mp4",
    content: "",
    className: "node4_10",
  },
  {
    group: 1,
    id: 5,
    start: "2024-07-15T15:30:45",
    end: "2024-07-15T15:30:55",
    link: "http://192.168.1.121:8000/static_server/assets/202-profile000/53.35.mp4",
    content: "",
    className: "node5_10",
  },
];

// http://192.168.1.121:8000/static_server/assets/202-profile000/52.53.mp4
