import {
  Reactive,
  Show,
  useObservable,
  useObserve,
} from "@legendapp/state/react";
import React, { useEffect, useRef } from "react";
import { findVideosAtTime } from "./Timeline";
import { batch } from "@legendapp/state";

export default function TimelineVideo({
  idx,
  groupName,
  data,
  seekTime,
  currentTime,
  loadingQueue,
  handleSyncTime,
}) {
  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);

  const { downloadedVideos, isIdle, isDownloading, currentIndex, activeVideo } =
    useObservable({
      downloadedVideos: {},
      isDownloading: false,
      isIdle: true,
      currentIndex: -1,
      activeVideo: 1,
    });
  const renderCount = ++useRef(0).current;
  // console.log(currentIndex.get());
  useEffect(() => {
    // console.log(downloadedVideos.get());
    // console.log(data.get());
    //download first video when component mounts
    console.log("useEffect downloadVideo");
    downloadVideo(0);
    downloadVideo(1);
  }, []);

  function toggleVideo(index) {}

  async function downloadVideo(index, setCI = false) {
    console.log("downloadVideo");
    console.log(downloadedVideos.get());
    console.log({ index });

    // if (index >= Object.keys(data).length || downloadedVideos[index].get())
    //   return;

    if (downloadedVideos[index].get()) {
      console.log(index);
      const videoElement =
        index % 2 === 0 ? videoRef1.current : videoRef2.current;
      let videoData = downloadedVideos[index].get();
      videoElement.src = videoData;
      videoElement.load();
      videoElement.play();
      return;
    }
    if (loadingQueue.get() === null) loadingQueue.set([]);
    loadingQueue.push(groupName.get());
    const response = await fetch(data[index].link.get());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    //remove the groupName from loadingQueue
    const idx = loadingQueue.get().indexOf(groupName.get());
    loadingQueue.splice(idx, 1);
    const videoElement =
      index % 2 === 0 ? videoRef1.current : videoRef2.current;
    console.log(videoElement);
    videoElement.src = url;
    videoElement.load();

    videoElement.onloadeddata = () => {
      console.log("data");
      downloadedVideos.set((prev) => ({
        ...prev,
        [index]: url,
      }));
      if (index !== 0) {
        videoElement.pause();
      }
      // setLoadedVideos((prev) => ({ ...prev, [index]: true }));
      // if (index === 0) videoElement.pause();
      // downloadedVideos.set((prev) => ({
      //   ...prev,
      //   [index]: url,
      // }));
    };

    // downloadedVideos.set((prev) => ({
    //   ...prev,
    //   [index]: url,
    // }));

    // const videoElement =
    //   index % 2 === 0 ? videoRef1.current : videoRef2.current;
    // console.log(videoElement);
    // videoElement.src = url;
    // videoElement.load();
    // videoElement.onloadeddata = () => {
    //   // setLoadedVideos((prev) => ({ ...prev, [index]: true }));
    //   if (index === 0) videoElement.pause();
    //   downloadedVideos.set((prev) => ({
    //     ...prev,
    //     [index]: url,
    //   }));
    // };
  }

  // useObserve(() => {
  //   console.log(
  //     idx + 1,
  //     groupName.get(),
  //     data.get(),
  //     currentTime.get(),
  //     seekTime.get()
  //   );
  // });

  function seekVideoToTime(videoRef, runningVideoData, seekedTime) {}

  async function downloadVideo2(index) {
    //download the video when user seeks to new slot whose file is not available in the state
    console.log("downloadVideo2->" + index);
    loadingQueue.push(groupName.get());
    const response = await fetch(data[index].link.get());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    //remove the groupName from loadingQueue
    const idx = loadingQueue.get().indexOf(groupName.get());
    loadingQueue.splice(idx, 1);

    const videoElement =
      index % 2 === 0 ? videoRef1.current : videoRef2.current;
    videoElement.src = url;
    downloadedVideos.set((prev) => ({
      ...prev,
      [index]: url,
    }));
    videoElement.load();
    videoElement.onloadeddata = () => {
      console.log("data");
    };
  }

  useObserve(() => {
    if (seekTime.get()) {
      console.log("useObserve seekTime");
      const videosAtTime = findVideosAtTime(data.get(), seekTime.get());
      console.log(videosAtTime, new Date(seekTime.get()));
      if (videosAtTime.length === 0) {
        console.log("no src present. set idle to true");
      }
      const idx = data
        .peek()
        .findIndex((item) => item.id === videosAtTime[0].id);
      console.log({ idx });
      const nextIDX = idx + 1;
      //check if file is downloaded or not
      const isDownloadFilePresent = downloadedVideos.peek().hasOwnProperty(idx);
      console.log({ isDownloadFilePresent, nextIDX });
      const startDate = new Date(videosAtTime[0].start);
      const seekDate = new Date(seekTime.get());
      const differenceInSeconds = (seekDate - startDate) / 1000;
      const videoElement =
        idx % 2 === 0 ? videoRef1.current : videoRef2.current;
      if (isDownloadFilePresent) {
        // check if current IDX is same as slot slot clicked
        if (idx === currentIndex.peek()) {
          console.log("user clicked on the active slot");
          console.log(idx % 2);
          activeVideo.set(idx % 2 === 0 ? 1 : 2);
          videoElement.currentTime = differenceInSeconds;
          console.log({ startDate, seekDate, differenceInSeconds });
        } else if (idx === currentIndex.peek() + 1) {
          console.log("user clicked on next active slot");
          const nextIDX = idx + 1;
          // check if next idx is downloaded or not
          const isDownloaded = downloadedVideos.peek().hasOwnProperty(nextIDX);
          console.log({ isDownloaded });
          if (!isDownloaded) {
            console.log("download the video");
            downloadVideo2(nextIDX);
          }
          videoElement.src = downloadedVideos[idx].peek();
          videoElement.load();
          videoElement.onloadeddata = () => {
            console.log("video is loaded");
            videoElement.currentTime = differenceInSeconds;
            currentIndex.set(idx);
            activeVideo.set(idx % 2 === 0 ? 1 : 2);
          };
        } else {
          console.log("user clicked on different slot");
        }
      }
    }
  });

  useObserve(() => {
    if (
      isIdle.get() &&
      data.get() &&
      loadingQueue.get() !== null &&
      loadingQueue.get().length === 0
    ) {
      if (Object.keys(downloadedVideos.get()).length > 0) {
        //only the first element of the downloaded video is received in this section.
        const videosAtTime = findVideosAtTime(data.get(), currentTime.get());
        if (videosAtTime.length !== 0) {
          const idx = data
            .get()
            .findIndex((item) => item.id === videosAtTime[0].id);
          console.log({ idx });
          batch(() => {
            isIdle.set(false);
            currentIndex.set(idx);
          });
        }

        // console.log("not null", loadingQueue.get());
        // console.log(downloadedVideos.get());

        // const videosAtTime = findVideosAtTime(data.get(), currentTime.get());
        // console.log({ videosAtTime }, currentTime.get());
        // setTimeout(() => {
        //   const videoElement =
        //     0 % 2 === 0 ? videoRef1.current : videoRef2.current;
        //   console.log(videoElement, downloadedVideos.get());
        //   videoRef1.current.src = downloadedVideos[0].get();
        //   videoRef1.current.load();
        //   videoRef1.current.onloadeddata = () => {
        //     console.log("data loaded");
        //     currentIndex.set(0);
        //     setTimeout(() => {
        //       handleSecondVideo();
        //     }, 1000);
        //   };
        // }, 0);
      }
    } else {
      console.log("null");
    }
    // if (
    //   isIdle.get() &&
    //   data.get() &&
    //   loadingQueue.get() !== null &&
    //   loadingQueue.get().length === 0
    // ) {
    //   isIdle.set(false);
    //   const videosAtTime = findVideosAtTime(data.get(), currentTime.get());
    //   console.log({ videosAtTime }, currentTime.get());
    //   setTimeout(() => {
    //     const videoElement =
    //       0 % 2 === 0 ? videoRef1.current : videoRef2.current;
    //     console.log(videoElement, downloadedVideos.get());
    //     // videoElement.src = url;
    //     // videoElement.load();
    //   }, 0);
    // }
  });
  // useObserve(() => {
  //   if (isIdle.get() && data.get()) {
  //     // console.log(data.get());
  //     const videosAtTime = findVideosAtTime(data.get(), currentTime.get());
  //     // console.log(videosAtTime, data.get());
  //     if (videosAtTime.length > 0) {
  //       const idx = data
  //         .get()
  //         .findIndex((item) => item.id === videosAtTime[0].id);
  //       console.log({ idx });
  //       // console.log({ videosAtTime });
  //       isIdle.set(false);
  //       const videoElement =
  //         currentIndex.get() % 2 === 0 ? videoRef1.current : videoRef2.current;

  //       // videoElement.play();
  //       currentIndex.set(idx);

  //       console.log({ videoElement });
  //       let videoData = downloadedVideos[idx].get();
  //       console.log(videoData);
  //       videoElement.src = videoData;
  //       videoElement.load();
  //       videoElement.onloadeddata = () => {
  //         console.log("loaded");
  //         videoElement.play();
  //       };
  //       console.log(videoElement.readyState);
  //       // console.log("downloadVideo");
  //       // downloadVideo(videosAtTime[0], true, false);
  //     }
  //   } else {
  //     const videosAtTime = findVideosAtTime(data.get(), currentTime.get());
  //     console.log({ videosAtTime });
  //     if (videosAtTime.length === 0) {
  //       isIdle.set(true);
  //       // console.log("currentIndex.set-1");
  //       currentIndex.set(-1);
  //       // console.log(`${groupName.get()} is idle`);
  //     } else {
  //       // console.log("else");
  //     }
  //   }
  // });

  function handleEnded(params) {
    console.log("handleEnded");
    console.log(`${currentIndex.get()} video ended`);
    console.log("currentIndex.set", currentIndex.get());
    let nextIndex = currentIndex.get() + 1;
    console.log(nextIndex, Object.keys(data).length);
    if (nextIndex <= Object.keys(data).length - 1) {
      activeVideo.set((x) => (x === 1 ? 2 : 1));
      const nextVideoElement =
        nextIndex % 2 === 0 ? videoRef1.current : videoRef2.current;
      console.log({ nextVideoElement });
      nextVideoElement.play();

      // Load the video after the next one
      downloadVideo(nextIndex + 1);
      currentIndex.set((x) => x + 1);
    }
  }
  return (
    <>
      VC:{renderCount}
      {console.log(
        "cI:->",
        currentIndex.get(),
        "downloadedVideos:->",
        downloadedVideos.get(),
        "activeVideo:->",
        activeVideo.get()
      )}
      {/* <Show
        if={() => currentIndex.get() >= 0}
        else={() => <div>no video {groupName.get()}</div>}
      >
        {() => ( */}
      <div className="parent">
        <Show if={isIdle}>
          {() => <div className="no_data">no video {groupName.get()}</div>}
        </Show>
        <>
          <Reactive.video
            ref={videoRef1}
            onEnded={handleEnded}
            width="640"
            height="360"
            autoPlay
            muted
            $style={() => ({
              display: activeVideo.get() === 1 ? "block" : "none",
            })}
          >
            Your browser does not support the video tag1 .
          </Reactive.video>
          <Reactive.video
            ref={videoRef2}
            onEnded={handleEnded}
            width="640"
            height="360"
            autoPlay
            muted
            $style={() => ({
              display: activeVideo.get() === 2 ? "block" : "none",
            })}
          >
            Your browser does not support the video tag2.
          </Reactive.video>
        </>
      </div>
      {/* //   )}
      // </Show> */}
    </>
  );
}
