import React, { useEffect, useRef, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import "vis-timeline/styles/vis-timeline-graph2d.css";

const CameraRecordingsTimeline = () => {
  const timelineRef = useRef(null);
  const timeline = useRef(null);
  const renderCount = ++useRef(0).current;
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackIntervalRef = useRef(null);
  const [currentVideos, setCurrentVideos] = useState({});
  const videoRefs = useRef({});
  const [videoStates, setVideoStates] = useState({});
  const videoBufferRef = useRef({}); // Buffer for managing alternating videos

  const HOST_URL = "http://192.168.1.121:8000";

  // Sample data - replace this with your actual API response
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
    "camera 2": [
      {
        Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-16-37-18.mp4",
        Duration: 64,
        StartTime: "2025-07-31T12:16:37+05:30",
      },
      {
        Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-17-41-19.mp4",
        Duration: 63.97800064086914,
        StartTime: "2025-07-31T12:17:41+05:30",
      },
      {
        Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-18-45-20.mp4",
        Duration: 64.11399841308594,
        StartTime: "2025-07-31T12:18:45+05:30",
      },
      {
        Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-19-49-21.mp4",
        Duration: 63.974998474121094,
        StartTime: "2025-07-31T12:19:49+05:30",
      },
      {
        Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-20-53-22.mp4",
        Duration: 64,
        StartTime: "2025-07-31T12:20:53+05:30",
      },
      {
        Path: "/static_server/recorder/recordings/688376fde6f5c6a7b8d0757d/2025-07-31/2025-07-31-12-21-57-23.mp4",
        Duration: 63.972999572753906,
        StartTime: "2025-07-31T12:21:57+05:30",
      },
    ],
  };

  // Initialize currentTime when component mounts
  useEffect(() => {
    const { earliestTime } = getTimeRange();
    if (earliestTime) {
      setCurrentTime(earliestTime);
      setTimeout(() => {
        updateVideoPlayback(earliestTime);
      }, 100);
    }
  }, []);

  // Effect to update the custom time indicator when currentTime changes
  useEffect(() => {
    if (timeline.current && currentTime) {
      try {
        console.log("here", currentTime);
        timeline.current.setCustomTime(currentTime, "playback");
      } catch (error) {
        timeline.current.addCustomTime(currentTime, "playback");
        timeline.current.setCustomTimeTitle("Playback Position", "playback");
      }

      updateVideoPlayback(currentTime);
    }
  }, [currentTime]);

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

  // Create alternating video management system
  const initializeVideoSystem = (cameraName, recordings) => {
    const sortedRecordings = [...recordings].sort(
      (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
    );

    videoBufferRef.current[cameraName] = {
      recordings: sortedRecordings,
      currentIndex: 0,
      activeVideoIndex: 0, // 0 or 1 - which video is currently active
      preloadingVideoIndex: 1, // 0 or 1 - which video is preloading
      isPreloading: false,
      nextRecordingPreloaded: false,
    };
  };

  // Preload next video in the inactive video element
  const preloadNextVideo = (cameraName, nextRecording) => {
    console.log("preloadNextVideo");
    if (!nextRecording) return;

    const buffer = videoBufferRef.current[cameraName];
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

      // Clear any existing video content first
      preloadVideoRef.src = "";
      preloadVideoRef.load();

      // Set the new source
      preloadVideoRef.src = nextVideoUrl;
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

  // Switch to the preloaded video and start preloading the next one
  const switchToNextVideo = (cameraName) => {
    const buffer = videoBufferRef.current[cameraName];
    if (!buffer) return;
    console.log(videoRefs.current);
    const currentVideoRef =
      videoRefs.current[`${cameraName}_${buffer.activeVideoIndex}`];
    const nextVideoRef =
      videoRefs.current[`${cameraName}_${buffer.preloadingVideoIndex}`];

    if (!currentVideoRef || !nextVideoRef) return;

    // Ensure the next video is at the correct time (0 seconds) before showing it
    nextVideoRef.currentTime = 0;

    // Wait for the video to actually seek to the correct frame
    const switchWhenReady = () => {
      // Make sure we're at time 0 and video is ready
      if (nextVideoRef.currentTime === 0 && nextVideoRef.readyState >= 2) {
        // Now perform the instant switch
        currentVideoRef.style.display = "none";
        nextVideoRef.style.display = "block";

        // Start playing the preloaded video immediately
        if (isPlaying) {
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
  };

  // Function to update video playback based on timeline position
  const updateVideoPlayback = (playbackTime) => {
    const newCurrentVideos = {};
    const newVideoStates = {};

    Object.keys(recordingsData).forEach((cameraName, index) => {
      console.log(recordingsData);
      const activeInfo = findActiveRecording(
        recordingsData[cameraName],
        playbackTime
      );
      console.log({ activeInfo });
      if (activeInfo) {
        const videoUrl = `${HOST_URL}${activeInfo.recording.Path}`;
        console.log({ videoStates });
        const currentState = videoStates[cameraName] || {};

        newCurrentVideos[cameraName] = {
          url: videoUrl,
          currentTime: activeInfo.videoTime,
          recording: activeInfo.recording,
          isNearEnd: activeInfo.isNearEnd,
          recordingIndex: activeInfo.recordingIndex,
        };

        newVideoStates[cameraName] = {
          currentVideoUrl: videoUrl,
          currentRecording: activeInfo.recording,
          recordingIndex: activeInfo.recordingIndex,
        };
        console.log(videoBufferRef.current);
        // Initialize video system if not exists
        if (!videoBufferRef.current[cameraName]) {
          initializeVideoSystem(cameraName, recordingsData[cameraName]);
        }

        const buffer = videoBufferRef.current[cameraName];

        // Check if we need to switch to a different recording
        if (
          currentState.recordingIndex !== undefined &&
          currentState.recordingIndex !== activeInfo.recordingIndex
        ) {
          console.log(
            `📹 ${cameraName} switching from recording ${currentState.recordingIndex} to ${activeInfo.recordingIndex}`
          );

          // If the next video is already preloaded, switch to it
          if (
            buffer.nextRecordingPreloaded &&
            buffer.currentIndex + 1 === activeInfo.recordingIndex
          ) {
            console.log(cameraName);
            switchToNextVideo(cameraName);
          } else {
            console.log("Direct load if preloading didn't work-->", cameraName);
            // Direct load if preloading didn't work
            const activeVideoRef =
              videoRefs.current[`${cameraName}_${buffer.activeVideoIndex}`];
            console.log({ activeVideoRef });
            if (activeVideoRef) {
              activeVideoRef.src = videoUrl;
              const onLoadedData = () => {
                activeVideoRef.currentTime = activeInfo.videoTime;
                if (isPlaying) {
                  activeVideoRef.play().catch(console.error);
                }
                activeVideoRef.removeEventListener("loadeddata", onLoadedData);
              };
              activeVideoRef.addEventListener("loadeddata", onLoadedData);
              buffer.currentIndex = activeInfo.recordingIndex;
            }
          }
        } else {
          // Same recording, just sync time and play state
          const activeVideoRef =
            videoRefs.current[`${cameraName}_${buffer?.activeVideoIndex || 0}`];
          console.log({ activeVideoRef });
          if (activeVideoRef) {
            // If video doesn't have a source yet, set it
            if (!activeVideoRef.src || activeVideoRef.src !== videoUrl) {
              console.log(
                `📹 Loading initial video for ${cameraName}: ${videoUrl}`
              );
              activeVideoRef.src = videoUrl;

              const onLoadedData = () => {
                activeVideoRef.currentTime = activeInfo.videoTime;
                if (isPlaying) {
                  activeVideoRef.play().catch(console.error);
                }
                activeVideoRef.removeEventListener("loadeddata", onLoadedData);
              };
              activeVideoRef.addEventListener("loadeddata", onLoadedData);

              // Start preloading next video if available
              if (activeInfo.nextRecording && !buffer.nextRecordingPreloaded) {
                setTimeout(
                  () => preloadNextVideo(cameraName, activeInfo.nextRecording),
                  1000
                );
              }
            } else {
              // Video already loaded, just sync time and play state
              if (
                Math.abs(activeVideoRef.currentTime - activeInfo.videoTime) >
                0.5
              ) {
                activeVideoRef.currentTime = activeInfo.videoTime;
              }

              if (isPlaying && activeVideoRef.paused) {
                activeVideoRef.play().catch(console.error);
              } else if (!isPlaying && !activeVideoRef.paused) {
                activeVideoRef.pause();
              }
            }
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
          console.log("here");
          preloadNextVideo(cameraName, activeInfo.nextRecording);
        }
      } else {
        newCurrentVideos[cameraName] = null;
        newVideoStates[cameraName] = { currentVideoUrl: null };

        // Pause all videos if no active recording
        const video0 = videoRefs.current[`${cameraName}_0`];
        const video1 = videoRefs.current[`${cameraName}_1`];
        if (video0 && !video0.paused) video0.pause();
        if (video1 && !video1.paused) video1.pause();
      }
    });
    console.log({ newCurrentVideos, newVideoStates });
    setCurrentVideos(newCurrentVideos);
    setVideoStates(newVideoStates);
  };

  useEffect(() => {
    const findTimeRange = (data) => {
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
          const lastTime = new Date(
            firstStart.getTime() + totalDuration * 1000
          );
          if (!latestTime || lastTime > latestTime) {
            latestTime = lastTime;
          }
        }
      });

      return { earliestTime, latestTime };
    };

    const transformDataForTimeline = (data) => {
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
            content: `${fileName.substring(11, 19)}`,
            start: continuousStartTime,
            end: continuousEndTime,
            type: "range",
            className: `recording-item camera-${groupIndex + 1}`,
            title: `
              <div style="padding: 8px; max-width: 300px;">
                <strong>Recording Details</strong><br/>
                <strong>Camera:</strong> ${cameraName}<br/>
                <strong>Original Start:</strong> ${originalStartTime.toLocaleString()}<br/>
                <strong>Original End:</strong> ${originalEndTime.toLocaleString()}<br/>
                <strong>Continuous Start:</strong> ${continuousStartTime.toLocaleString()}<br/>
                <strong>Continuous End:</strong> ${continuousEndTime.toLocaleString()}<br/>
                <strong>Duration:</strong> ${Math.round(
                  recording.Duration
                )}s (${recording.Duration.toFixed(2)}s precise)<br/>
                <strong>File:</strong> ${fileName}<br/>
                <strong>Path:</strong> ${recording.Path}
              </div>
            `,
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

    const { groups, items } = transformDataForTimeline(recordingsData);
    const groupsDataSet = new DataSet(groups);
    const itemsDataSet = new DataSet(items);

    const { earliestTime, latestTime } = findTimeRange(recordingsData);

    if (!currentTime && earliestTime) {
      setCurrentTime(earliestTime);
    }

    const options = {
      stack: false,
      height: "400px",
      editable: false,
      selectable: false,
      orientation: "top",
      showCurrentTime: false,
      // zoomMin: 1000 * 60,
      zoomMax: 1000 * 60 * 60 * 24,
      tooltip: {
        followMouse: true,
        overflowMethod: "cap",
        delay: 300,
      },
      groupOrder: "content",
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
        if (timeline.current && currentTime) {
          try {
            timeline.current.addCustomTime(currentTime, "playback");
            timeline.current.setCustomTimeTitle(
              "Playback Position",
              "playback"
            );
          } catch (error) {
            console.log("Custom time already exists or timeline not ready");
          }
        }
      }, 100);

      timeline.current.on("select", (event) => {
        if (event.items.length > 0) {
          const selectedItem = itemsDataSet.get(event.items[0]);
          setSelectedRecording(selectedItem);
        } else {
          setSelectedRecording(null);
        }
      });

      timeline.current.on("timechange", (event) => {
        if (event.id === "playback") {
          console.log("Playback");
          setCurrentTime(event.time);
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

  const formatDuration = (seconds) => {
    const totalSecs = Math.round(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPreciseDuration = (seconds) => {
    return `${seconds.toFixed(2)}s`;
  };

  const getTotalDuration = (recordings) => {
    return recordings.reduce(
      (total, recording) => total + recording.Duration,
      0
    );
  };

  const getRecordingCount = () => {
    return Object.values(recordingsData).reduce(
      (total, recordings) => total + recordings.length,
      0
    );
  };

  const getTimeRange = () => {
    let earliestTime = null;
    let latestTime = null;

    Object.values(recordingsData).forEach((recordings) => {
      const sortedRecordings = [...recordings].sort(
        (a, b) => new Date(a.StartTime) - new Date(b.StartTime)
      );

      if (sortedRecordings.length > 0) {
        const firstStart = new Date(sortedRecordings[0].StartTime);
        if (!earliestTime || firstStart < earliestTime) {
          earliestTime = firstStart;
        }
        console.log({ sortedRecordings, earliestTime });
        const totalDuration = sortedRecordings.reduce(
          (sum, rec) => sum + rec.Duration,
          0
        );
        console.log({ totalDuration });
        const lastTime = new Date(firstStart.getTime() + totalDuration * 1000);
        if (!latestTime || lastTime > latestTime) {
          latestTime = lastTime;
        }
      }
    });

    return { earliestTime, latestTime };
  };

  const startPlayback = () => {
    if (isPlaying) return;

    setIsPlaying(true);

    Object.keys(recordingsData).forEach((cameraName) => {
      const buffer = videoBufferRef.current[cameraName];
      if (buffer) {
        const activeVideoRef =
          videoRefs.current[`${cameraName}_${buffer.activeVideoIndex}`];
        if (activeVideoRef && activeVideoRef.src) {
          console.log(
            `▶️ Starting playback for ${cameraName}, active video ${buffer.activeVideoIndex}`
          );
          activeVideoRef
            .play()
            .then(() => {
              console.log(`✅ Playing ${cameraName}`);
            })
            .catch((error) => {
              console.error(`❌ Failed to play ${cameraName}:`, error);
            });
        }
      }
    });

    const { earliestTime, latestTime } = getTimeRange();
    playbackIntervalRef.current = setInterval(() => {
      setCurrentTime((prevTime) => {
        const newTime = new Date(prevTime.getTime() + 1000);
        if (newTime >= latestTime) {
          return earliestTime;
        }
        return newTime;
      });
    }, 1000);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    Object.keys(recordingsData).forEach((cameraName) => {
      const video0 = videoRefs.current[`${cameraName}_0`];
      const video1 = videoRefs.current[`${cameraName}_1`];
      if (video0 && !video0.paused) video0.pause();
      if (video1 && !video1.paused) video1.pause();
    });
  };

  const resetPlayback = () => {
    stopPlayback();
    const { earliestTime } = getTimeRange();
    setCurrentTime(earliestTime);

    // Reset video system for all cameras
    Object.keys(videoBufferRef.current).forEach((cameraName) => {
      const buffer = videoBufferRef.current[cameraName];
      if (buffer) {
        // Reset to first video element as active
        const video0 = videoRefs.current[`${cameraName}_0`];
        const video1 = videoRefs.current[`${cameraName}_1`];

        if (video0) video0.style.display = "block";
        if (video1) video1.style.display = "none";

        buffer.activeVideoIndex = 0;
        buffer.preloadingVideoIndex = 1;
        buffer.currentIndex = 0;
        buffer.nextRecordingPreloaded = false;
        buffer.isPreloading = false;
      }
    });
  };

  const fitToWindow = () => {
    if (timeline.current) {
      timeline.current.fit();
    }
  };

  const goToDataStart = () => {
    if (timeline.current) {
      const { earliestTime, latestTime } = getTimeRange();
      timeline.current.setWindow(earliestTime, latestTime);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>Camera Recordings Timeline with Video Playback {renderCount}</h2>
      {console.log(currentVideos, videoRefs.current)}
      {/* Video Players */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
        }}
      >
        {Object.keys(recordingsData).map((cameraName, index) => (
          <div key={cameraName} style={{ flex: 1 }}>
            <h4 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
              {cameraName.charAt(0).toUpperCase() + cameraName.slice(1)}
            </h4>
            <div
              style={{
                position: "relative",
                backgroundColor: "#000",
                borderRadius: "4px",
                height: "200px",
              }}
            >
              {currentVideos[cameraName] ? (
                <>
                  {/* Video 0 - Alternates between active and preloading */}
                  <video
                    ref={(el) => (videoRefs.current[`${cameraName}_0`] = el)}
                    style={{
                      width: "100%",
                      height: "200px",
                      borderRadius: "4px",
                      display: "block",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      zIndex: 2,
                    }}
                    controls={false}
                    muted
                    preload="metadata"
                    onLoadedData={() => {
                      const buffer = videoBufferRef.current[cameraName];
                      const videoRef = videoRefs.current[`${cameraName}_0`];
                      if (
                        videoRef &&
                        currentVideos[cameraName] &&
                        buffer?.activeVideoIndex === 0
                      ) {
                        videoRef.currentTime =
                          currentVideos[cameraName].currentTime;
                        if (isPlaying && videoRef.paused) {
                          console.log(
                            `🎬 Auto-playing ${cameraName}_0 on loadedData`
                          );
                          videoRef.play().catch(console.error);
                        }
                      }
                    }}
                    onEnded={() => {
                      console.log(`🏁 ${cameraName}_0 video ended`);
                      const buffer = videoBufferRef.current[cameraName];
                      if (
                        buffer &&
                        buffer.activeVideoIndex === 0 &&
                        buffer.nextRecordingPreloaded
                      ) {
                        switchToNextVideo(cameraName);
                      }
                    }}
                    onError={(e) => {
                      console.error(
                        `❌ ${cameraName}_0 video error:`,
                        e.target.error
                      );
                    }}
                  />

                  {/* Video 1 - Alternates between active and preloading */}
                  <video
                    ref={(el) => (videoRefs.current[`${cameraName}_1`] = el)}
                    style={{
                      width: "100%",
                      height: "200px",
                      borderRadius: "4px",
                      display: "none",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      zIndex: 1,
                    }}
                    controls={false}
                    muted
                    preload="metadata"
                    onLoadedData={() => {
                      const buffer = videoBufferRef.current[cameraName];
                      const videoRef = videoRefs.current[`${cameraName}_1`];
                      if (
                        videoRef &&
                        currentVideos[cameraName] &&
                        buffer?.activeVideoIndex === 1
                      ) {
                        videoRef.currentTime =
                          currentVideos[cameraName].currentTime;
                        if (isPlaying && videoRef.paused) {
                          console.log(
                            `🎬 Auto-playing ${cameraName}_1 on loadedData`
                          );
                          videoRef.play().catch(console.error);
                        }
                      }
                    }}
                    onEnded={() => {
                      console.log(`🏁 ${cameraName}_1 video ended`);
                      const buffer = videoBufferRef.current[cameraName];
                      if (
                        buffer &&
                        buffer.activeVideoIndex === 1 &&
                        buffer.nextRecordingPreloaded
                      ) {
                        switchToNextVideo(cameraName);
                      }
                    }}
                    onError={(e) => {
                      console.error(
                        `❌ ${cameraName}_1 video error:`,
                        e.target.error
                      );
                    }}
                  />

                  {/* Video info overlay */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "5px",
                      left: "5px",
                      backgroundColor: "rgba(0,0,0,0.7)",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "12px",
                      zIndex: 10,
                    }}
                  >
                    {currentVideos[cameraName].recording.Path.split("/")
                      .pop()
                      .replace(".mp4", "")
                      .substring(11, 19)}
                    {currentVideos[cameraName].isNearEnd && (
                      <span style={{ marginLeft: "5px", color: "#4CAF50" }}>
                        ●
                      </span>
                    )}
                  </div>

                  {/* Active video indicator */}
                  <div
                    style={{
                      position: "absolute",
                      top: "5px",
                      left: "5px",
                      backgroundColor: "rgba(33, 150, 243, 0.8)",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "10px",
                      zIndex: 10,
                    }}
                  >
                    Active: V
                    {videoBufferRef.current[cameraName]?.activeVideoIndex || 0}
                  </div>

                  {/* Preloading indicator */}
                  {videoBufferRef.current[cameraName]?.isPreloading && (
                    <div
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        backgroundColor: "rgba(255, 152, 0, 0.8)",
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "10px",
                        zIndex: 10,
                      }}
                    >
                      Preloading V
                      {videoBufferRef.current[cameraName]?.preloadingVideoIndex}
                      ...
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "4px",
                  }}
                >
                  No recording at current time
                </div>
              )}
            </div>
            {currentVideos[cameraName] && (
              <div
                style={{
                  marginTop: "5px",
                  fontSize: "12px",
                  color: "#666",
                  textAlign: "center",
                }}
              >
                Video Time: {currentVideos[cameraName].currentTime.toFixed(1)}s
                / {currentVideos[cameraName].recording.Duration.toFixed(1)}s
                {videoBufferRef.current[cameraName]?.nextRecordingPreloaded && (
                  <span style={{ marginLeft: "10px", color: "#4CAF50" }}>
                    ● Next Ready
                  </span>
                )}
                {videoBufferRef.current[cameraName] && (
                  <span style={{ marginLeft: "10px", color: "#2196F3" }}>
                    (A:V{videoBufferRef.current[cameraName].activeVideoIndex},
                    P:V{videoBufferRef.current[cameraName].preloadingVideoIndex}
                    )
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Statistics */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <div>
          <strong>Total Recordings:</strong> {getRecordingCount()}
        </div>
        {Object.entries(recordingsData).map(([camera, recordings]) => (
          <div key={camera}>
            <strong>{camera}:</strong> {recordings.length} recordings (
            {formatDuration(getTotalDuration(recordings))})
            {currentVideos[camera] && (
              <span style={{ marginLeft: "10px", color: "#007bff" }}>
                ▶ Playing:{" "}
                {currentVideos[camera].recording.Path.split("/")
                  .pop()
                  .replace(".mp4", "")
                  .substring(11, 19)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={fitToWindow}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Fit All Recordings
        </button>
        <button
          onClick={goToDataStart}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          View All Data
        </button>
        <button
          onClick={isPlaying ? stopPlayback : startPlayback}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            backgroundColor: isPlaying ? "#dc3545" : "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {isPlaying ? "Stop Playback" : "Start Playback"}
        </button>
        <button
          onClick={resetPlayback}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Reset to Start
        </button>
        <button
          onClick={() => {
            if (currentTime) {
              updateVideoPlayback(currentTime);
            }
          }}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            backgroundColor: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Sync Videos
        </button>
        {currentTime && (
          <span
            style={{
              marginLeft: "20px",
              padding: "8px 12px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <strong>Playback Time:</strong> {currentTime.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        style={{ border: "1px solid #ddd", borderRadius: "4px" }}
      />

      {/* Selected Recording Details */}
      {selectedRecording && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#e8f4fd",
            borderRadius: "8px",
            border: "1px solid #bee5eb",
          }}
        >
          <h3>Selected Recording Details</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <strong>Camera:</strong>{" "}
              {Object.keys(recordingsData).find(
                (_, index) => index + 1 === selectedRecording.group
              )}
            </div>
            <div>
              <strong>Duration:</strong>{" "}
              {formatDuration(selectedRecording.originalData.Duration)} (
              {formatPreciseDuration(selectedRecording.originalData.Duration)})
            </div>
            <div>
              <strong>Original Start:</strong>{" "}
              {new Date(
                selectedRecording.originalData.originalStartTime
              ).toLocaleString()}
            </div>
            <div>
              <strong>Original End:</strong>{" "}
              {new Date(
                selectedRecording.originalData.originalEndTime
              ).toLocaleString()}
            </div>
            <div>
              <strong>Continuous Start:</strong>{" "}
              {new Date(selectedRecording.start).toLocaleString()}
            </div>
            <div>
              <strong>Continuous End:</strong>{" "}
              {new Date(selectedRecording.end).toLocaleString()}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <strong>File Path:</strong>
              <code
                style={{
                  backgroundColor: "#f8f9fa",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  marginLeft: "8px",
                  fontSize: "12px",
                }}
              >
                {selectedRecording.originalData.Path}
              </code>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        ${Object.keys(recordingsData)
          .map(
            (_, index) => `
          .vis-item.camera-${index + 1} {
            background-color: ${
              index === 0
                ? "#3498db"
                : index === 1
                ? "#e74c3c"
                : index === 2
                ? "#2ecc71"
                : index === 3
                ? "#f39c12"
                : "#9b59b6"
            };
            border-color: ${
              index === 0
                ? "#2980b9"
                : index === 1
                ? "#c0392b"
                : index === 2
                ? "#27ae60"
                : index === 3
                ? "#e67e22"
                : "#8e44ad"
            };
            color: white;
          }
          .vis-group.camera-group-${index + 1} {
            background-color: ${
              index === 0
                ? "#ebf3fd"
                : index === 1
                ? "#fdeaea"
                : index === 2
                ? "#eafaf1"
                : index === 3
                ? "#fef9e7"
                : "#f4ecf7"
            };
          }
        `
          )
          .join("")}
        .vis-item.vis-selected {
          border-width: 3px !important;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        }
        .vis-timeline {
          border: none;
        }
        .vis-panel.vis-center {
          border-left: 1px solid #bfbfbf;
          border-right: 1px solid #bfbfbf;
        }
        .vis-labelset .vis-label {
          border-bottom: 1px solid #bfbfbf;
        }
      `}</style>
    </div>
  );
};

export default CameraRecordingsTimeline;

const recordingsData2 = {
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
