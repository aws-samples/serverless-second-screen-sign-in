import { Typography, Stack } from "@mui/material";
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ReactComponent as Tick } from "../tick.svg";
import { useAuth } from "../context/AuthContext";

export default function SignedIn() {
  const searchParams = useLocation();
  const { state: { user, refreshToken, accessToken, idToken, fullName, loginCode }, setUserFromCode } = useAuth();

  const sendInformationToSecondScreen = (params) => {
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify(params),
    };

    return fetch(`${window.env.apiEndpoint}/send`, requestOptions);
  };

  useEffect(() => {
    const { search } = searchParams;
    if (search) {
      const qryParam = new URLSearchParams(search.slice(1));

      const authCode = qryParam.get('code');
      const userCode = JSON.parse(atob(qryParam.get("state")));

      setUserFromCode(authCode, userCode.inputCode);
    }
  }, [searchParams, setUserFromCode]);

  useEffect(() => {
    if (user) {
      sendInformationToSecondScreen({
        refreshToken,
        idToken,
        accessToken,
        loginCode
      });

      if (window.location.search) {
        window.history.replaceState("", document.title, window.location.pathname);
      }
    }

  }, [loginCode, user, refreshToken, idToken, accessToken]);

  const renderSelection = () => {
    const renderName = () => {
      return (
        <Typography component="h1" variant="h4" fontWeight={500} mt="20px">
          Signed in as <span style={{ color: "#ffd78f" }}>{fullName}</span>
        </Typography>
      );
    };
    if (user) {
      return (
        <div>
          <Stack
            spacing={2}
            textAlign={"center"}
            direction="row"
            justifyContent="center"
          >
            <Tick
              style={{ height: "50%", width: "50%" }}
              textAlign="center"
            ></Tick>
          </Stack>
          <Stack
            spacing={2}
            textAlign={"center"}
            direction="row"
            justifyContent="center"
          >
            <div>{renderName()}</div>
          </Stack>
        </div>
      );
    }

    return null;
  };

  return <div>{renderSelection()}</div>;
}
