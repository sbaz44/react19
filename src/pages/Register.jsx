import React, { useState } from "react";
import "./scss/register.scss";
import axios from "axios";
import { encryptStorage } from "../helper/encryptStorage";
export default function Register() {
  const [UserData, setUserData] = useState({
    username: "sbaz444",
    full_name: "Shahbaz Shaikh",
    email: "shahbaz44@easemyai.com",
    phone: "7897897895",
    password: "abc123",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
  });

  const [RememberMe, setRememberMe] = useState(false);
  const [KEY, setKEY] = useState("");

  const [profilePic, setProfilePic] = useState("");

  function postData() {
    // const formData = new FormData();
    // const keys = Object.keys(UserData);
    // keys.forEach((element) => {
    //   formData.append(element, UserData[element]);
    // });
    // // Append file after text fields:
    // formData.append("profile_pic", profilePic);
    axios
      .post("http://192.168.1.33:8000/api/v1/user/register", {
        ...UserData,
        profile_pic: null,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function patchData() {
    const formData = new FormData();
    const keys = Object.keys(UserData);
    keys.forEach((element) => {
      formData.append(element, UserData[element]);
    });
    // Append file after text fields:
    formData.append("profile_pic", profilePic);
    formData.append("_id", "67c7f1db910dc79e9fe2d9cc");
    axios
      .patchForm("http://192.168.1.33:8000/api/v1/user/update", formData)
      .then((res) => {
        console.log(res.data);
      })
      .catch(() => {
        alert("failed");
      });
  }

  function setStorage() {
    if (!KEY) return;
    console.log({ KEY });
    encryptStorage().setItem(KEY, {
      name: "Shahbaz",
      age: 30,
    });
  }
  function getStorage(params) {
    let data = encryptStorage().getItem(KEY);
    console.log(data);
  }

  function handleCheckbox(params) {
    let _rememberMe = !RememberMe;
    setRememberMe(_rememberMe);
    if (_rememberMe) {
      localStorage.setItem("@PRO:UID", null);
    } else {
      localStorage.removeItem("@PRO:UID");
    }
  }
  function newKeyStorage(params) {
    encryptStorage().setItem("VID", 123);
  }
  return (
    <div className="register_wrapper">
      <div className="container">
        <h1>Welcome to the Hacker Website</h1>
        <h2>Hack Form</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <input
              type="checkbox"
              id="horns"
              name="horns"
              value={RememberMe}
              onChange={handleCheckbox}
            />
            <label for="horns">Remember ME</label>
          </div>

          <InputBox
            id={"myKey"}
            label={"STORAGE KEY NAME"}
            value={KEY}
            onChange={(e) => {
              const { value } = e.target;
              setKEY(value);
            }}
          />
          <input type="submit" value="GET Storage" onClick={getStorage} />
          <input type="submit" value="SET Storage" onClick={setStorage} />
          <input
            type="submit"
            value="NEW KEY Storage"
            onClick={newKeyStorage}
          />
        </div>
        <div id="hack-form">
          {Object.keys(UserData).map((item) => (
            <InputBox
              key={item}
              id={item}
              label={item}
              value={UserData[item]}
              onChange={(e) => {
                const { value } = e.target;
                setUserData((p) => ({
                  ...p,
                  [item]: value,
                }));
              }}
            />
          ))}
          <label for="username">Profile Pic:</label>
          <input
            type="file"
            className="hack-input"
            onChange={(e) => {
              setProfilePic(e.target.files[0]);
            }}
          />

          <input type="submit" value="Submit" onClick={postData} />
        </div>
      </div>
    </div>
  );
}

const InputBox = ({ label, id, onChange, value }) => {
  return (
    <>
      <label for="username">{label.replaceAll("_", " ")}:</label>
      <input
        type="text"
        id={id}
        name={id}
        className="hack-input"
        value={value}
        onChange={onChange}
      />
    </>
  );
};
