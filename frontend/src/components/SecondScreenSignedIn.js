import { Typography, Stack } from "@mui/material";
import React from "react";
import { ReactComponent as Tick } from "../tick.svg";
import { useAuth } from "../context/AuthContext";

// Largely a copy of the SignedIn Screen, but just used as a demo t
// to show the JWT has been transfered nad contains the correct information
export default function SecondScreenSignedIn() {
  const { state: { fullName, user }} = useAuth();
  
  const renderName = () => {
    return (
      <Typography component="h1" variant="h4" fontWeight={500} mt="20px">
        Signed in as <span style={{ color: "#ffd78f" }}>{fullName}</span>
      </Typography>
    );
  };

  const renderJwtOutput = () => {
    if (!user) {
      return (
        <Typography component="h1" variant="h4" fontWeight={500} mt="20px">
          Not currently authenticated! Try logging in first.
        </Typography>
      );
    }
    
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
  };

  return <div>{renderJwtOutput()}</div>;
}
