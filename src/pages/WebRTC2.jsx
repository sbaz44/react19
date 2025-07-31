import React, { useCallback, useEffect } from "react";
import "./webrtc.scss";
import { Reactive, useObservable } from "@legendapp/state/react";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";

export default function WebRTC2() {
  const socket = useSocket();
  const { username, room } = useObservable({
    username: "sbaz44",
    room: "demo",
  });

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("handleSubmit");
    socket.emit("room:join", {
      username: username.get(),
      room: room.get(),
    });
  };

  //   const handleJoinRoom = useCallback(() => {}, []);
  //   const handleJoinRoom = useCallback(() => {}, []);
  //   const handleJoinRoom = useCallback(() => {}, []);
  //   const handleJoinRoom = useCallback(() => {}, []);
  //   const handleJoinRoom = useCallback(() => {}, []);
  const handleJoinRoom = useCallback((data) => {
    console.log("handleJoinRoom");
    console.warn(data);
    navigate("/webrtc/room/" + data.room);
  }, []);

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, []);

  return (
    <div>
      <form className="login">
        <h2>Please Create a room</h2>
        <Reactive.input $value={username} type="text" placeholder="Username" />
        <Reactive.input $value={room} type="text" placeholder="Room Name" />
        <input type="submit" value="Create Room" onClick={handleSubmit} />
        <div className="links">
          <a href="#">Forgot password</a>
          <a href="#">Register</a>
        </div>
      </form>
    </div>
  );
}
