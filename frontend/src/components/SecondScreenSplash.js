import { Grid, Typography, Stack } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Item } from "./Item";
import { Box } from "@mui/system";
import bwipjs from "bwip-js";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HighlightText = styled(Link)(({ theme }) => ({
  ...theme.typography.body1,
  color: "#ffd78f",
  height: 60,
  textDecoration: "none",
}));

const showLoginCode = (code) => {
  return (
    <Stack spacing={2} direction="row" justifyContent="center">
      {code.split("").map((letter) => (
        <Item>{letter}</Item>
      ))}
    </Stack>
  );
};

export default function SecondScreenInstructions() {
  const navigate = useNavigate();
  const { setUserFromToken } = useAuth();
  const [loginCode, setLoginCode] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const ws = useRef(null);

  const createQrCodeElement = (code) => {
    let canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, {
      bcid: "qrcode", // Barcode type
      text: `https://${window.env.domain}/tv?code=${code}`, // Text to encode
      textxalign: "center", // Always good to set this,
      barcolor: "FFFFFF",
      width: 50,
      height: 50,
    });
    setImgUrl(canvas.toDataURL("image/png"));
  };

  useEffect(() => {
    const askForCodeAndPing = () => {
      const pingOnLoop = () => {
        ws.current.send("ping");
        setTimeout(pingOnLoop, 1000);
      };

      ws.current.send(JSON.stringify({ action: "loginCode" }));
      pingOnLoop();
    };

    const redirectOnAuthAndSetIdToken = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.idToken) {
        setUserFromToken(data).then(_ => navigate("/secondScreenSignedIn"));
        return;
      }

      if (data.loginCode) {
        createQrCodeElement(data.loginCode);
        setLoginCode(data.loginCode);
      }
    };

    ws.current = new WebSocket(window.env.websocketUrl);
    ws.current.onopen = askForCodeAndPing
    ws.current.onmessage = redirectOnAuthAndSetIdToken

    return () => { ws.current.close() };
  }, [navigate, setUserFromToken]);

  if (!loginCode) {
    return (<div>
      <Typography
        component="p"
        variant="p"
        fontWeight={200}
        color="white"
        gutterBottom
        textAlign={"center"}
      >
        Loading...
      </Typography>
    </div>);
  }

  return (
    <div style={{ height: '700px', overflow: 'hidden' }}>
      <Grid container spacing={2}>
        <Grid item md={7} xs={12}>
          <div>
            <Typography
              component="p"
              variant="p"
              fontWeight={200}
              color="white"
              gutterBottom
              textAlign={"center"}
            >
              Sign in at <HighlightText>www.anycompany.com/tv</HighlightText>{" "}
              and enter code:
            </Typography>

            {showLoginCode(loginCode)}
            <Box sx={{ mt: 5 }} />

            <Typography
              component="p"
              variant="p"
              fontWeight={200}
              color="white"
              gutterBottom
              textAlign={"center"}
            >
              Or scan the following <HighlightText>QR Code</HighlightText>
            </Typography>
            <div style={{ textAlign: "center" }}>
              <img id="qrCode" alt="" src={imgUrl} />
            </div>
          </div>
        </Grid>

        <Grid item md={5} display={{ xs: "none", md: "block" }}>
          <img
            src="black-front.png"
            alt=""
            style={{ objectFit: "contain", width: "100%", height: "100%" }}
          />
        </Grid>
      </Grid>
    </div>
  );
}
