import {
  Reactive,
  Show,
  useObservable,
  useObserve,
  useSelector,
} from "@legendapp/state/react";
import React, { useEffect, useRef } from "react";
const HOST_URL = "http://192.168.1.121:8000";

export default function VISVideo2({
  cameraName,
  RecordingsData,
  CurrentTime,
  isPlaying,
  timelineData,
}) {
  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);
  const videoBufferRef = useRef(null);
  const renderCount = ++useRef(0).current;

  const sortedRecordings$ = useSelector(() => {
    return [...RecordingsData.get()].sort(
      (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
    );
  });

  console.log(sortedRecordings$);
  const { CurrentVideo } = useObservable({
    CurrentVideo: null,
  });
  //   useObserve(() => {
  //     console.log(RecordingsData.get());
  //     console.log(cameraName.get());
  //     console.log(CurrentTime.get());
  //     console.log(isPlaying.get());
  //     console.log(timelineData.current);
  //   });
  const findActiveRecordings = (time = CurrentTime.get()) => {
    const active = {};
    // cameraNames.get().forEach((camera) => {
    active[cameraName.get()] = null;
    // });

    timelineData.current.items.forEach((recording) => {
      if (time >= recording.startTime && time <= recording.endTime) {
        active[recording.cameraName] = recording;
      }
    });

    return active;
  };

  const preloadNextVideo = (nextRecording) => {
    console.log({ nextRecording });
    console.log(videoBufferRef.current);
  };

  const initializeVideoSystem = (data) => {
    console.log(data);
    videoBufferRef.current = {
      info: data,
      currentIndex: 0,
      activeVideoIndex: 0, // 0 or 1 - which video is currently active
      preloadingVideoIndex: 1, // 0 or 1 - which video is preloading
      isPreloading: false,
      nextRecordingPreloaded: false,
    };
    CurrentVideo.set(data);

    setTimeout(() => {
      videoRef1.current.src = `${HOST_URL}${data.recording.Path}`;
      videoRef1.current.load();
    }, 0);

    preloadNextVideo();
  };

  useEffect(() => {
    if (CurrentTime.get()) {
      let activeInfo = findActiveRecording(
        RecordingsData.get(),
        CurrentTime.get(),
        sortedRecordings$
      );
      console.log({ activeInfo });
      initializeVideoSystem(activeInfo);
      //   const res = findActiveRecordings();
      //   console.log(res);
      //   if (res[cameraName.get()]) {
      //     initializeVideoSystem(res[cameraName.get()]);
      //   }
    }
  }, []);

  const handleSeek = (time) => {
    let activeInfo = findActiveRecording(
      RecordingsData.get(),
      time,
      sortedRecordings$
    );
    console.log({ activeInfo });

    if (activeInfo) {
      CurrentVideo.set(activeInfo);
      // console.log("Setting current video to:", activeInfo.recording.Path);

      const relativeTime =
        (time.getTime() - activeInfo.recordingStart.getTime()) / 1000;

      console.log({ relativeTime });
      console.log(videoRef1);
      videoRef1.current.src = `${HOST_URL}${activeInfo.recording.Path}`;
      videoRef1.current.load();
      videoRef1.current.currentTime = relativeTime;
      const { nextRecording } = activeInfo;
      if (nextRecording) {
        //next recording exists
        // TODO
        videoBufferRef.current = {
          info: activeInfo,
          currentIndex: activeInfo.recordingIndex,
          activeVideoIndex: 0, // 0 or 1 - which video is currently active
          preloadingVideoIndex: 1, // 0 or 1 - which video is preloading
          isPreloading: false,
          nextRecordingPreloaded: false,
        };
      } else {
        //no next recording
      }
      // videoRef1.current.play();
    } else {
      //null
      CurrentVideo.set(null);
    }
  };

  useEffect(() => {
    const newMessageHandler = (e) => {
      console.log(e.detail);
      handleSeek(e.detail);
    };

    document.addEventListener("timelineClicked", newMessageHandler, false);

    return () => {
      document.removeEventListener("timelineClicked", newMessageHandler);
    };
  }, []);

  useObserve(() => {
    if (isPlaying.get()) {
      console.log("playing");
      console.log(videoBufferRef.current);
      const { activeVideoIndex } = videoBufferRef.current;
      const currentVideoRef = activeVideoIndex
        ? videoRef2.current
        : videoRef1.current;
      console.log(currentVideoRef);
    }
  });

  return (
    <div className="vis_video_item">
      <h4 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
        {cameraName.peek().charAt(0).toUpperCase() + cameraName.peek().slice(1)}
        ({renderCount})
      </h4>
      <div className="video_item_wrapper">
        <Show if={CurrentVideo} else={() => <div>No recording</div>}>
          {() => (
            <>
              <Reactive.video
                preload="metadata"
                ref={videoRef1}
                className={"video_item"}
                controls={false}
                muted
              />
              <Reactive.video
                preload="metadata"
                ref={videoRef2}
                className={"video_item"}
                controls={false}
                muted
                style={{
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

// {
//     activeInfo: {
//       recording: {
//         Path: '/static_server/recorder/assets/splits/7.mp4',
//         Duration: 33.88,
//         StartTime: '2025-07-28T12:21:23+05:30'
//       },
//       videoTime: 0,
//       recordingStart: new Date('2025-07-28T06:51:23.000Z'),
//       recordingEnd: new Date('2025-07-28T06:51:56.000Z'),
//       recordingIndex: 0,
//       nextRecording: {
//         Path: '/static_server/recorder/assets/splits/8.mp4',
//         Duration: 21.85,
//         StartTime: '2025-07-28T12:22:27+05:30'
//       },
//       isNearEnd: false,
//       totalRecordings: 6
//     }
//   }

// Function to find which recording should be playing at a given time
const findActiveRecording = (
  cameraRecordings,
  playbackTime,
  sortedRecordings$
) => {
  if (!cameraRecordings || cameraRecordings.length === 0) return null;

  // const sortedRecordings = [...cameraRecordings].sort(
  //   (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
  // );

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
        // isNearEnd: videoTime > recording.Duration - 3,
        isNearEnd: videoTime > recording.Duration / 2,
        totalRecordings: sortedRecordings.length,
      };
    }

    continuousTime = recordingEnd;
  }

  return null;
};
