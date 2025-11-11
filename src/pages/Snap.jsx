import React, { useState, useRef, useEffect } from "react";

export default function Snap() {
  return (
    <div>
      <VideoThumbnail
        videoUrl="
http://192.168.1.121:8000/static_server/recorder/recordings/68a6b98637974f03e3186d83/2025-09-09/2025-09-09-17-47-20-321.mp4"
      />
      {/* <VideoThumbnail2
        videoURL="
http://192.168.1.121:8000/static_server/recorder/recordings/68a6b98637974f03e3186d83/2025-09-09/2025-09-09-17-47-20-321.mp4"
      /> */}
    </div>
  );
}

const VideoThumbnail = ({ videoUrl }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || thumbnail) return;
    const tryTimes = [1, 5, 10];
    let currentTry = 0;
    const captureFrame = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      if (
        dataUrl.includes("data:image/jpeg;base64,/9j/") &&
        currentTry < tryTimes.length - 1
      ) {
        setThumbnail(dataUrl);
        video.removeEventListener("seeked", captureFrame);
        video.src = "";
      } else {
        console.warn("Captured frame is empty, trying next time...");
        currentTry++;
        if (currentTry < tryTimes.length) {
          video.currentTime = tryTimes[currentTry];
        } else {
          console.error("No valid frame found");
          setThumbnail(null); // Fallback to a placeholder
        }
      }
    };

    const handleError = () => {
      console.error("Video failed to load:", video.error);
      setThumbnail(null); // Optionally set a fallback image
    };

    video.addEventListener("seeked", captureFrame);
    video.addEventListener("error", handleError);

    // Set crossOrigin to handle CORS
    video.crossOrigin = "anonymous";

    // Seek to a later time to avoid black frames at the start
    video.currentTime = 1; // Try 2 seconds to ensure a valid frame

    return () => {
      video.removeEventListener("seeked", captureFrame);
      video.removeEventListener("error", handleError);
    };
  }, [thumbnail, videoUrl]);

  const handleThumbnailClick = () => {
    setIsVideoPlaying(true);
  };

  return (
    <div>
      {isVideoPlaying ? (
        <video
          controls
          autoPlay
          src={videoUrl}
          crossOrigin="anonymous"
          style={{ maxWidth: "100%" }}
        />
      ) : (
        <>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt="Video thumbnail"
              style={{ maxWidth: "100%", cursor: "pointer" }}
              onClick={handleThumbnailClick}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                preload="metadata"
                crossOrigin="anonymous"
                style={{ display: "none" }}
              />
              <div
                style={{
                  width: "320px",
                  height: "240px",
                  background: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                Loading thumbnail...
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

function VideoThumbnail2({ videoURL }) {
  //   const videoURL =
  //     "http://192.168.1.121:8000/static_server/recorder/recordings/68a31466345c90289969f7c7/2025-09-08/2025-09-08-16-43-36-1157.mp4";

  const [playVideo, setPlayVideo] = useState(false);
  const videoRef = useRef(null);

  return (
    <div>
      {!playVideo ? (
        <video
          ref={videoRef}
          src={videoURL}
          preload="metadata"
          width="400"
          controls={false}
          onClick={() => setPlayVideo(true)}
          poster={`${videoURL}#t=5`} // fetch a snapshot from 1s mark
        />
      ) : (
        <video src={videoURL} width="400" controls autoPlay />
      )}
    </div>
  );
}
