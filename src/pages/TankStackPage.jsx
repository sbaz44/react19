import { useValue } from "@legendapp/state/react";
import { useObservableSyncedQuery } from "@legendapp/state/sync-plugins/tanstack-react-query";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { queryClient } from "../helper/encryptStorage";
const APAI_URL = "http://192.168.1.121:8000/api/v2/";

const postEmail = (email) => {
  return axios.post("http://192.168.1.33:5000/login", { email });
};

export default function TanStackPage() {
  const mutation = useMutation({
    mutationFn: (email) => postEmail(email),
    onSuccess: (data) => {
      console.log("Login Successful1:", data.data);
    },
    onSettled: (data, error, variables) => {
      if (data) {
        console.log("Login Successful2:", data.data);
      }
    },
  });

  //   const state$ = useObservableSyncedQuery({
  //     queryClient: queryClient,
  //     query: {
  //       //   initialData: { success: false, msg: "No data" },
  //       queryKey: ["user"],
  //     },
  //     //    queryFn: async () => {
  //     //      return fetch("https://reqres.in/api/users/1").then((v) =>
  //     //        v.json()
  //     //      );
  //     //    },
  //     //  },
  //     mutation: {
  //       mutationFn: (email) => postEmail(email),
  //       onSuccess: (data) => {
  //         console.log("Login Successful1:", data.data);
  //       },
  //     },
  //   });
  //   const state = useValue(state$);
  //   console.log({ state });
  return (
    <div>
      <button onClick={() => mutation.mutate("shahbaz@easemyai.com")}>
        {/* <button onClick={() => state$.mutate("shahbaz@easemyai.com")}> */}
        Login
      </button>
    </div>
  );
}
