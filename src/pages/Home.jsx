import React, { useRef } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";

export default function Home() {
  return (
    <div>
      <JitsiMeetingComponent />
    </div>
  );
}

const JitsiMeetingComponent = () => {
  const apiRef = useRef();

  // Event handlers
  const handleReadyToClose = () => {
    console.log("Meeting closed");
    apiRef.current.dispose();
  };

  const handleParticipantJoined = (participant) => {
    console.log("Participant joined:", participant);
  };
  const handleApiReady = (api) => {
    // You can use the api to control the meeting
    console.log("Jitsi Meet API ready", api);
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <JitsiMeeting
        domain="meet.jit.si" // Use Jitsi's public server (or your self-hosted instance)
        roomName="my-unique-meeting-room-123" // Unique room name
        configOverwrite={{
          startWithAudioMuted: true,
          disableModeratorIndicator: true,
          startScreenSharing: true,
          enableEmailInStats: false,
        }}
        onApiReady={handleApiReady}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        userInfo={{
          displayName: "React User",
          email: "user@example.com",
        }}
        getIFrameRef={(iframe) => {
          iframe.style.height = "100%";
          iframe.style.width = "100%";
        }}
        onReadyToClose={handleReadyToClose}
        onParticipantJoined={handleParticipantJoined}
      />
    </div>
  );
};
