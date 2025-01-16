import { Grid, Typography, Stack, Button } from "@mui/material";
import { Item } from './Item';
import { InputCode } from './InputCode'; 
import { debounce } from 'lodash';

import React, { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const AUTH_URL = `${window.env.domain}/login?response_type=code&client_id=${window.env.clientId}&redirect_uri=https://${window.env.domain}/signedIn`

const buttonStyle = {
    backgroundColor: '#ffd78f',
    color: 'black',
    '&:hover': {
      backgroundColor: '#F8C567',
      color: 'black',
  }
};

export default function SecondScreenInstructions() {
  const [ searchParams ] = useSearchParams();
  const [ inputCode, setInputCode ] = useState([]);
  const [ validCode, setValidCode ] = useState(false);
  const [ showInvalidCodeError, setShowInvalidCodeError ] = useState(false);
  const inputRefs = useRef([useRef(), useRef(), useRef(), useRef()]);

  const sendLoginCode = (inputCodeParam) => { 
    window.location.href = `${AUTH_URL}&state=${btoa(JSON.stringify({inputCode: inputCodeParam}))}`;
  };

  const validateCode = debounce((value) => { 
    setShowInvalidCodeError(false);
    return fetch(`${window.env.apiEndpoint}/validate/${value}`, { method: "GET" })
      .then((res) => { 
        if (res.status === 200) { 
          setValidCode(true);
          return; 
        }

        setShowInvalidCodeError(true);
        setValidCode(false);
      })

  }, 250);

  React.useEffect(() => {
    const inputCodeParam = searchParams.get("code");
    if (inputCodeParam != null) { 
      setInputCode(inputCodeParam)
      sendLoginCode(inputCodeParam);
      return;
    }

    const timeout = setTimeout(() => {
      inputRefs.current[0].current.focus();
    }, 100);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchParams]);

  const addedInputCode = (index) => (evt) => { 
    const inputCodes = [...inputCode]; 

    if (evt.keyCode === 8) { 
      if (inputCodes[index] == null) { 
        setTimeout(() => inputRefs.current[Math.max(index - 1, 0)].current.focus(), 50);
      }

      inputCodes[index] = null;
      setInputCode(inputCodes);
      return;
    }

    if (evt.key.length === 1 && evt.key.match((/[A-Za-z]/))) { 
      inputCodes[index] = evt.key.toUpperCase();
    }
    
    setTimeout(() => inputRefs.current[Math.min(index + 1, 3)].current.focus(), 50);
    if (inputCodes.length === 4) { 
      validateCode(inputCodes.join(''));
    }
    setInputCode(inputCodes)
  }

  const renderInputCode = () => { 
    return ( 
      <Stack spacing={2} textAlign={"center"} direction="row" justifyContent="center">
          <Item><InputCode inputRef={inputRefs.current[0]} onKeyDown={addedInputCode(0)} inputProps={{maxLength: 1}} value={inputCode[0]}></InputCode></Item>
          <Item><InputCode inputRef={inputRefs.current[1]} onKeyDown={addedInputCode(1)} inputProps={{maxLength: 1}} value={inputCode[1]}></InputCode></Item>
          <Item><InputCode inputRef={inputRefs.current[2]} onKeyDown={addedInputCode(2)} inputProps={{maxLength: 1}} value={inputCode[2]}></InputCode></Item>
          <Item><InputCode inputRef={inputRefs.current[3]} onKeyDown={addedInputCode(3)} inputProps={{maxLength: 1}} value={inputCode[3]}></InputCode></Item>
      </Stack>
    );
  };

  const renderErrorIfNeeded = () => { 
    if (showInvalidCodeError) { 
      return ( 
        <Grid display={false} item md={12} textAlign={"center"}>
          { `Invalid code ${inputCode.join('')} - Not found` }
        </Grid>
      )
    }

    return null;
  }

  return (
    <div>
      <Grid container spacing={2}>
        <Grid item md={12}>
          <Typography
            component="h1"
            variant="h3"
            fontWeight={500}
            color="#ffd78f"
            gutterBottom
            textAlign={"center"}
          >
            Enter Code
          </Typography>

        </Grid>
        <Grid item md={12} textAlign={"center"}>
          {renderInputCode()}
        </Grid>
        <Grid item md={12} textAlign={"center"}>
          <Button onClick={(evt) => sendLoginCode(inputCode.join(""))} disabled={!validCode} sx={buttonStyle}>Login</Button>
        </Grid>
        {renderErrorIfNeeded()}
      </Grid>
    </div>
  );
}
