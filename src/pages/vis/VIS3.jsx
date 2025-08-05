import React, { useEffect, useRef, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import "vis-timeline/styles/vis-timeline-graph2d.css";

const VIS3 = () => {
  const timelineRef = useRef(null);
  const timeline = useRef(null);
  const videoRefs = useRef({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(null);
  const [activeRecordings, setActiveRecordings] = useState({});
  const [videoErrors, setVideoErrors] = useState({});

  const animationRef = useRef(null);
  const timelineData = useRef({
    items: [],
    startTime: null,
    endTime: null,
  });

  const HOST_URL = "http://192.168.1.121:8000";

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

  // Get camera names dynamically
  const cameraNames = Object.keys(recordingsData);

  // Initialize timeline and process recordings
  useEffect(() => {
    if (!timelineRef.current) return;

    console.log("Initializing timeline...");

    // Process recordings data
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
    cameraNames.forEach((cameraName, cameraIndex) => {
      const color = colors[cameraIndex % colors.length];

      // Add group
      groups.add({
        id: cameraIndex,
        content: cameraName,
        style: `background-color: ${color}; color: white;`,
      });

      // Sort recordings by start time
      const recordings = recordingsData[cameraName].sort(
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

    // Create timeline
    const options = {
      groupOrder: "id",
      editable: false,
      stack: false,
      zoomable: true,
      moveable: true,
      showCurrentTime: false,
      orientation: "top",
      margin: { item: 10, axis: 20 },
    };

    timeline.current = new Timeline(timelineRef.current, items, options);
    timeline.current.setGroups(groups);

    // Set initial position and add custom time indicator
    if (globalStartTime) {
      timeline.current.addCustomTime(globalStartTime, "playback");
      setCurrentTime(globalStartTime);
    }

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .vis-timeline { border: 1px solid #ddd; border-radius: 8px; }
      .vis-custom-time { background-color: #FF5722; width: 3px; }
      .vis-custom-time > .vis-custom-time-marker { 
        background-color: #FF5722; color: white; font-weight: bold;
        border-radius: 4px; padding: 2px 6px; font-size: 11px;
      }
    `;
    document.head.appendChild(style);

    console.log(
      "Timeline initialized with",
      processedRecordings.length,
      "recordings"
    );

    return () => {
      if (timeline.current) timeline.current.destroy();
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, []);

  // Find active recordings based on current time
  const findActiveRecordings = (time) => {
    const active = {};
    cameraNames.forEach((camera) => {
      active[camera] = null;
    });

    timelineData.current.items.forEach((recording) => {
      if (time >= recording.startTime && time <= recording.endTime) {
        active[recording.cameraName] = recording;
      }
    });

    return active;
  };

  // Update active recordings when time changes
  useEffect(() => {
    if (currentTime) {
      const active = findActiveRecordings(currentTime);
      setActiveRecordings(active);

      // Update timeline indicator
      if (timeline.current) {
        timeline.current.setCustomTime(currentTime, "playback");
      }
    }
  }, [currentTime]);

  // Handle video playback
  useEffect(() => {
    cameraNames.forEach((cameraName) => {
      const recording = activeRecordings[cameraName];
      const videoElement = videoRefs.current[cameraName];

      if (recording && videoElement && currentTime) {
        const relativeTime =
          (currentTime.getTime() - recording.startTime.getTime()) / 1000;

        if (relativeTime >= 0 && relativeTime <= recording.duration) {
          // Sync video time
          if (Math.abs(videoElement.currentTime - relativeTime) > 0.5) {
            videoElement.currentTime = relativeTime;
          }

          // Play/pause based on timeline state
          if (isPlaying && videoElement.paused) {
            videoElement.play().catch((err) => {
              console.warn(`Video play error for ${cameraName}:`, err);
              setVideoErrors((prev) => ({ ...prev, [cameraName]: true }));
            });
          } else if (!isPlaying && !videoElement.paused) {
            videoElement.pause();
          }
        }
      } else if (videoElement && !isPlaying) {
        videoElement.pause();
      }
    });
  }, [activeRecordings, currentTime, isPlaying]);

  // Animation loop for playback
  useEffect(() => {
    if (
      isPlaying &&
      currentTime &&
      timelineData.current.startTime &&
      timelineData.current.endTime
    ) {
      const startRealTime = Date.now();
      const startPlaybackTime = currentTime.getTime();

      const animate = () => {
        const realTimeElapsed = Date.now() - startRealTime;
        const playbackTimeElapsed = realTimeElapsed * playbackSpeed;
        const newTime = new Date(startPlaybackTime + playbackTimeElapsed);

        if (newTime <= timelineData.current.endTime) {
          setCurrentTime(newTime);
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, playbackSpeed]);

  // Control functions
  const handlePlayPause = () => setIsPlaying(!isPlaying);

  const handleStop = () => {
    setIsPlaying(false);
    if (timelineData.current.startTime) {
      setCurrentTime(timelineData.current.startTime);
    }
  };

  const handleSpeedChange = (speed) => setPlaybackSpeed(speed);
  const handleFitToWindow = () => timeline.current?.fit();
  const handleZoomIn = () => timeline.current?.zoomIn(0.2);
  const handleZoomOut = () => timeline.current?.zoomOut(0.2);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Recording Timeline Viewer
        </h1>

        {/* Controls */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <div className="flex gap-2 items-center bg-gray-100 rounded-lg p-2">
            <button
              onClick={handlePlayPause}
              className={`px-4 py-2 ${
                isPlaying
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white rounded transition-colors flex items-center gap-2`}
            >
              {isPlaying ? <>⏸ Pause</> : <>▶ Play</>}
            </button>

            <button
              onClick={handleStop}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              ⏹ Stop
            </button>

            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-600">Speed:</span>
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 text-sm rounded ${
                    playbackSpeed === speed
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } transition-colors`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFitToWindow}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Fit to Window
            </button>
            <button
              onClick={handleZoomIn}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Zoom In
            </button>
            <button
              onClick={handleZoomOut}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              Zoom Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          {/* Status */}
          <div className="mb-4 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <strong>Position:</strong>{" "}
                {currentTime ? currentTime.toLocaleString() : "Not set"}
                {isPlaying && (
                  <span className="ml-2 text-green-600">
                    (Playing at {playbackSpeed}x)
                  </span>
                )}
              </div>
              <div className="text-right text-xs">
                {cameraNames.map((camera) => (
                  <div key={camera}>
                    {camera}:{" "}
                    {activeRecordings[camera]
                      ? activeRecordings[camera].fileName
                      : "No recording"}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Timeline */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-2">Timeline</h3>
              <div
                ref={timelineRef}
                style={{ height: "200px", width: "100%" }}
              />
            </div>

            {/* Video Players */}
            <div
              className="lg:col-span-2 grid gap-4"
              style={{
                gridTemplateColumns:
                  cameraNames.length === 1
                    ? "1fr"
                    : "repeat(auto-fit, minmax(300px, 1fr))",
              }}
            >
              {cameraNames.map((cameraName, index) => {
                const colors = [
                  "#4CAF50",
                  "#2196F3",
                  "#FF9800",
                  "#9C27B0",
                  "#F44336",
                  "#607D8B",
                ];
                const color = colors[index % colors.length];
                const recording = activeRecordings[cameraName];

                return (
                  <div
                    key={cameraName}
                    className="bg-black rounded-lg overflow-hidden"
                    style={{ height: "200px" }}
                  >
                    <div
                      className="text-white px-3 py-2 text-sm font-bold"
                      style={{ backgroundColor: color }}
                    >
                      {cameraName}
                    </div>

                    {recording ? (
                      <div
                        className="h-full flex flex-col"
                        style={{ height: "calc(100% - 36px)" }}
                      >
                        <div className="bg-gray-800 text-white px-3 py-1 text-xs">
                          {recording.fileName}
                        </div>

                        {videoErrors[cameraName] ? (
                          <div className="flex-1 flex items-center justify-center text-white">
                            <div className="text-center">
                              <div className="text-red-400 mb-2">
                                ⚠ Video Error
                              </div>
                              <div className="text-xs">
                                Failed to load video
                              </div>
                            </div>
                          </div>
                        ) : (
                          <video
                            ref={(el) => (videoRefs.current[cameraName] = el)}
                            className="flex-1 w-full object-contain"
                            src={recording.videoUrl}
                            onError={() =>
                              setVideoErrors((prev) => ({
                                ...prev,
                                [cameraName]: true,
                              }))
                            }
                            onLoadedData={() =>
                              setVideoErrors((prev) => ({
                                ...prev,
                                [cameraName]: false,
                              }))
                            }
                            muted
                            playsInline
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center text-white"
                        style={{ height: "calc(100% - 36px)" }}
                      >
                        <div className="text-center">
                          <div className="text-gray-400 text-lg mb-2">📹</div>
                          <div className="text-sm">No recording</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="mt-6 grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(
              cameraNames.length,
              3
            )}, 1fr)`,
          }}
        >
          {cameraNames.map((cameraName) => (
            <div key={cameraName} className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {cameraName} Recordings
              </h3>
              <p className="text-sm text-gray-600">
                {recordingsData[cameraName].length} recordings
              </p>
              <p className="text-sm text-gray-600">
                Total duration:{" "}
                {Math.round(
                  recordingsData[cameraName].reduce(
                    (sum, r) => sum + r.Duration,
                    0
                  )
                )}{" "}
                seconds
              </p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Features</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • <strong>Dynamic Camera Support:</strong> Automatically handles
              any number of cameras
            </li>
            <li>
              • <strong>Sequential Timeline:</strong> Recordings are adjacent
              with no gaps per camera
            </li>
            <li>
              • <strong>Synchronized Playback:</strong> Videos play in sync with
              timeline position
            </li>
            <li>
              • <strong>Speed Control:</strong> Adjust playback speed from 0.5x
              to 4x
            </li>
            <li>
              • <strong>Real-time Video Switching:</strong> Videos change as
              timeline moves
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VIS3;
