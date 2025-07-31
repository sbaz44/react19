import { EncryptStorage } from "encrypt-storage";

// export const encryptStorage = new EncryptStorage(
//   import.meta.env.VITE_GOOGLE_CLIENT_ID,
//   {
//     storageType: "sessionStorage",
//   }
// );

export const encryptStorage = () => {
  let rememberME = localStorage.getItem("@PRO:UID") ? true : false;
  console.log({ rememberME });
  let storageType = rememberME ? "localStorage" : "sessionStorage";
  console.log({ storageType });
  return new EncryptStorage(import.meta.env.VITE_GOOGLE_CLIENT_ID, {
    storageType,
    prefix: "@PRO",
  });
};
