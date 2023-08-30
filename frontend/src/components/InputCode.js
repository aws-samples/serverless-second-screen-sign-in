import { InputBase } from "@mui/material";
import { styled } from "@mui/material/styles";

export const InputCode = styled(InputBase)(({ theme }) => ({
  ...theme.typography.h3,
  textAlign: "center",
  color: "#ffd78f",
  fontSize: "1.75rem",
  lineHeight: "60px",
  width: "20px",
  WebkitTextStroke: "0.5px",
  WebkitTextStrokeColor: "black",
}));
