import React, { useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import "./webrtc.scss";
import { useSocket } from "../context/SocketContext";
import { Show, useObservable } from "@legendapp/state/react";
import Peer from "../Peer";
export default function WebRTCRoom2() {
  const socket = useSocket();
  const { remoteSocketID, myStream, remoteStream } = useObservable({
    remoteSocketID: "",
    myStream: null,
    remoteStream: null,
  });

  const renderMyStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log(stream);
    myStream.set(stream);
  }, [myStream.get()]);

  const sendStreams = useCallback(() => {
    for (const track of myStream.get().getTracks()) {
      Peer.peer.addTrack(track, myStream.get());
    }
  }, [myStream]);

  const handleUserJoined = useCallback((data) => {
    console.log("handleJoinedRoom");
    console.warn(data);
    remoteSocketID.set(data.id);
  }, []);

  const handleIncomingCall = useCallback(async (data) => {
    console.log("handleIncomingCall");
    console.warn(data);
    remoteSocketID.set(data.from);
    const answer = await Peer.getAnswer(data.offer);
    console.log({ data, answer });
    socket.emit("call:accepted", { to: data.from, answer });
    // remoteSocketID.set(data.id);
  }, []);
  const handleCallAccepted = useCallback(
    ({ from, answer }) => {
      console.log("call accepted:", { from, answer });
      Peer.setLocalDescription(answer);
      sendStreams();
    },
    [sendStreams]
  );
  const handleTracks = useCallback((e) => {
    const stream = e.streams;
    console.log("GOT TRACKS");
    remoteStream.set(stream[0]);
  }, []);

  const handleNegotiation = useCallback(
    async (e) => {
      const offer = await Peer.getOffer();
      socket.emit("peer:nego:needed", { to: remoteSocketID.get(), offer });
    },
    [socket, remoteSocketID.get()]
  );

  useEffect(() => {
    Peer.peer.addEventListener("track", handleTracks);
    Peer.peer.addEventListener("negotiationneeded", handleNegotiation);

    return () => {
      Peer.peer.removeEventListener("track", handleTracks);
      Peer.peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [handleNegotiation, handleTracks]);

  const handleNegotiationIncoming = useCallback(
    async ({ from, offer }) => {
      const answer = await Peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, answer });
    },
    [socket]
  );

  const handleNegotiationFinal = useCallback(async ({ to, answer }) => {
    await Peer.setLocalDescription(answer);
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegotiationIncoming);
    socket.on("peer:nego:final", handleNegotiationFinal);
    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegotiationIncoming);
      socket.off("peer:nego:final", handleNegotiationFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegotiationIncoming,
    handleNegotiationFinal,
  ]);

  const calluser = useCallback(async () => {
    //creating a offer
    const offer = await Peer.getOffer();
    socket.emit("user:call", { to: remoteSocketID.get(), offer });
  }, []);

  useEffect(() => {
    renderMyStream();
  }, [myStream.get()]);

  return (
    <div className="webrtc_room">
      <h2>Room</h2>
      <Show
        if={() => remoteSocketID.get()}
        else={() => <p>No User Present at this moment. Please wait....</p>}
      >
        {() => <p>You are now connected to {remoteSocketID.get()}</p>}
      </Show>
      <button onClick={calluser}>Call User</button>
      <Show if={myStream}>
        {() => <button onClick={sendStreams}>Send Stream</button>}
      </Show>
      <div className="grid-container">
        <div className="grid-item">
          <Show if={myStream} else={() => <p>Loading....</p>}>
            {() => (
              <ReactPlayer
                style={{
                  width: "100%",
                  //   height: "100%",
                }}
                playing
                muted
                url={myStream.get()}
              />
            )}
          </Show>
        </div>
        <div className="grid-item">
          <Show if={remoteStream} else={() => <p>Loading....</p>}>
            {() => (
              <ReactPlayer
                style={{
                  width: "100%",
                }}
                playing
                muted
                url={remoteStream.get()}
              />
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}
