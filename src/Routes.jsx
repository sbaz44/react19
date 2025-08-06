import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import WebRTC from "./pages/WebRTC";
import WebRTCRoom from "./pages/WebRTCRoom";
import Grid from "./pages/Grid";
import GoogleLoginReact from "./pages/GoogleLogin";
import Register from "./pages/Register";
import VIS from "./pages/vis/VIS";
import VIS2 from "./pages/vis/VIS2";
import VIS3 from "./pages/vis/VIS3";
import VIS3Copy from "./pages/vis/VIS3 copy";
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/webrtc" element={<WebRTC />} />
      <Route path="/webrtc/room/:roomID" element={<WebRTCRoom />} />
      <Route path="/grid" element={<Grid />} />
      <Route path="/login" element={<GoogleLoginReact />} />
      <Route path="/register" element={<Register />} />
      <Route path="/vis" element={<VIS />} />
      <Route path="/vis2" element={<VIS2 />} />
      <Route path="/vis3" element={<VIS3 />} />
      <Route path="/viscopy" element={<VIS3Copy />} />

      {/* <Route path="/course" element={<Courses />} />
        <Route path="/live" element={<Live />} />
        <Route path="/contact" element={<Contact />} /> */}
    </Routes>
  );
}
