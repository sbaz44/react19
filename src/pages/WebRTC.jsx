import React, { useCallback, useEffect, useRef } from "react";
import "./webrtc.scss";
import {
  Memo,
  Reactive,
  useObservable,
  useObserve,
} from "@legendapp/state/react";
// import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import { createLocalTracks, Room, RoomEvent } from "livekit-client";
let token =
  "eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6InF1aWNrc3RhcnQtcm9vbSJ9LCJpc3MiOiJkZXZrZXkiLCJleHAiOjE3Mzk3NzgzNTEsIm5iZiI6MCwic3ViIjoicXVpY2tzdGFydC11c2VybmFtZSJ9.nCVN7oRgVj_KXVj85jJfPzNNRsY1M8doY4NQ6l-V-vc";
let ws = "ws://202.179.93.154:7880";
export default function WebRTC() {
  const videoRef = useRef(null);
  // const socket = useSocket();
  const { username, room, room2, isConnected } = useObservable({
    username: "sbaz44",
    room: "",
    room2: "",
    isConnected: false,
  });

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("handleSubmit");
    // socket.emit("room:join", {
    //   username: username.get(),
    //   room: room.get(),
    // });
  };

  const handleJoinRoom = useCallback((data) => {}, []);

  useEffect(() => {
    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    room.set(newRoom);
    console.log({ newRoom });
    return () => {
      newRoom.disconnect();
    };
  }, []);

  useObserve(() => {
    console.log("useObserve", room.get());
    if (!room.get()) return;
    const handleConnectionStateChanged = (state) => {
      console.log("handle");
      isConnected.set(state === "connected");
    };

    const handleParticipantDisconnected = (participant) => {
      console.log("Participant disconnected:", participant.identity);
      //  participants.delete(participant.sid);
      //  setParticipants(new Map(participants));
    };

    room
      .get()
      ?.on(RoomEvent.ParticipantConnected, handleParticipantDisconnected);

    room
      .get()
      ?.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);

    return () => {
      room
        .get()
        ?.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);

      room
        .get()
        ?.off(RoomEvent.ParticipantConnected, handleParticipantDisconnected);
    };
  });

  const connectToRoom = useCallback(
    async (e) => {
      e.preventDefault();
      if (!room.get()) return;
      try {
        console.log(room.get());
        // pre-warm connection, this can be called as early as your page is loaded
        room.get().prepareConnection(ws, token);
        console.log(room.get().prepareConnection);
        // set up event listeners
        room
          .get()
          .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
          .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
          .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange)
          .on(RoomEvent.Disconnected, handleDisconnect)
          .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

        // Create local tracks (camera and microphone)
        const tracks = await createLocalTracks({
          audio: false,
          video: true,
        });

        await room.get().connect(ws, token);

        // Publish tracks
        await Promise.all(
          tracks.map((track) => room.get().localParticipant.publishTrack(track))
        );

        // Attach all tracks to the video element
        if (videoRef.current) {
          tracks.forEach((track) => track.attach(videoRef.current));
        }
      } catch (error) {
        console.error("Failed to connect to room:", error);
      }
    },
    [room.get()]
  );

  const handleTrackSubscribed = useCallback(() => {}, []);
  const handleTrackUnsubscribed = useCallback(() => {}, []);
  const handleActiveSpeakerChange = useCallback(() => {}, []);
  const handleDisconnect = useCallback(() => {}, []);
  const handleLocalTrackUnpublished = useCallback(() => {}, []);

  const disconnectFromRoom = () => {
    if (room.get()) {
      room.get().disconnect();
    }
  };

  return (
    <div>
      <form className="login">
        <h2>Please Create a room</h2>
        <Reactive.input $value={username} type="text" placeholder="Username" />
        <Reactive.input $value={room2} type="text" placeholder="Room Name" />
        <input type="submit" value="Create Room" onClick={connectToRoom} />
        <div className="links">
          <a href="#">Forgot password</a>
          <a href="#">Register</a>
        </div>
        <Memo>
          {() => (
            <input
              type="submit"
              value={isConnected.get() ? "Connected" : "No Connection"}
              onClick={connectToRoom}
            />
          )}
        </Memo>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
          }}
          className="w-full h-full object-cover"
        />
      </form>
    </div>
  );
}

//   const handleJoinRoom = useCallback(() => {}, []);
//   const handleJoinRoom = useCallback(() => {}, []);
//   const handleJoinRoom = useCallback(() => {}, []);
//   const handleJoinRoom = useCallback(() => {}, []);
//   const handleJoinRoom = useCallback(() => {}, []);
