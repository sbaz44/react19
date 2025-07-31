import React, { useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import "./webrtc.scss";
import { useSocket } from "../context/SocketContext";
import { Show, useObservable, useObserve } from "@legendapp/state/react";
import Peer from "../Peer";

export default function WebRTCRoom() {
  const socket = useSocket();
  const state = useObservable({
    peers: new Map(),
    remoteStreams: new Map(),
    myStream: null,
    users: [], // Array to store connected users info
    room: window.location.pathname.split("/").pop(), // Get room from URL
  });

  console.log(state.users.get());
  console.log(state.peers.get());

  useObserve(() => {
    console.log("useObserve");
    console.log(state.remoteStreams.get());
  });

  // Update the renderMyStream function
  const renderMyStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      state.myStream.set(stream);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }, []);

  const createPeerConnection = useCallback(
    (userID) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
        ],
      });

      // Add local tracks to the peer connection
      if (state.myStream.get()) {
        state.myStream
          .get()
          .getTracks()
          .forEach((track) => {
            peerConnection.addTrack(track, state.myStream.get());
          });
      }

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log("Got remote track:", event.streams[0]);
        state.remoteStreams.set((prev) =>
          new Map(prev).set(userID, event.streams[0])
        );
        console.log(state.remoteStreams.get());
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: userID,
          });
        }
      };

      return peerConnection;
    },
    [socket, state.myStream.get()]
  );

  const handleUserJoined = useCallback(
    ({ username, id }) => {
      if (id === socket.id) return; // Don't create connection to self

      console.log("New user joined:", username, id);
      state.users.set((prev) => [...prev, { id, username }]);

      // Create new peer connection for the joined user
      const peerConnection = createPeerConnection(id);
      state.peers.set((prev) => new Map(prev).set(id, peerConnection));

      // If we have our stream, create and send an offer
      if (state.myStream.get()) {
        (async () => {
          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit("user:call", { to: id, offer });
          } catch (err) {
            console.error("Error creating offer:", err);
          }
        })();
      }
    },
    [createPeerConnection, socket]
  );

  // Add this useEffect for room joining
  useEffect(() => {
    if (state.myStream.get()) {
      // Join room once we have our stream
      socket.emit("room:join", {
        username: "User_" + socket.id.slice(0, 5), // Generate a username
        room: state.room.get(),
      });
    }
  }, [state.myStream.get()]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      console.log("Incoming call from:", from);
      let peerConnection = state.peers.get().get(from);

      if (!peerConnection) {
        peerConnection = createPeerConnection(from);
        state.peers.set((prev) => new Map(prev).set(from, peerConnection));
      }
      console.log("here");
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("call:accepted", { to: from, answer });
      } catch (error) {
        console.error("Error handling incoming call:", error);
      }
    },
    [createPeerConnection, socket]
  );

  const handleCallAccepted = useCallback(({ from, answer }) => {
    const peerConnection = state.peers.get().get(from);
    if (peerConnection) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(({ from, candidate }) => {
    const peerConnection = state.peers.get().get(from);
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const handleUserLeft = useCallback((userID) => {
    // Clean up peer connection
    const peerConnection = state.peers.get().get(userID);
    if (peerConnection) {
      peerConnection.close();
    }

    // Remove user from state
    state.peers.set((prev) => {
      const newPeers = new Map(prev);
      newPeers.delete(userID);
      return newPeers;
    });

    state.remoteStreams.set((prev) => {
      const newStreams = new Map(prev);
      newStreams.delete(userID);
      return newStreams;
    });

    state.users.set((prev) => prev.filter((user) => user.id !== userID));
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user:left", handleUserLeft);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user:left", handleUserLeft);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleIceCandidate,
    handleUserLeft,
  ]);

  useEffect(() => {
    renderMyStream();

    return () => {
      // Cleanup when component unmounts
      state.myStream
        .get()
        ?.getTracks()
        .forEach((track) => track.stop());
      state.peers.get().forEach((peer) => peer.close());
    };
  }, []);

  return (
    <div className="webrtc_room">
      <h2>Video Call Room</h2>
      <div className="grid-container">
        {/* Local video */}
        <div className="grid-item">
          <Show if={state.myStream} else={() => <p>Loading local stream...</p>}>
            {() => (
              <div className="video-container">
                <ReactPlayer
                  playing
                  muted
                  url={state.myStream.get()}
                  width="100%"
                  height="100%"
                />
                <div className="video-label">You</div>
              </div>
            )}
          </Show>
        </div>

        {/* Remote videos */}
        {Array.from(state.remoteStreams.get().entries()).map(
          ([userID, stream]) => (
            <div key={userID} className="grid-item">
              <div className="video-container">
                <ReactPlayer
                  playing
                  muted
                  url={stream}
                  width="100%"
                  height="100%"
                />
                <div className="video-label">
                  {state.users.get().find((user) => user.id === userID)
                    ?.username || "User"}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
