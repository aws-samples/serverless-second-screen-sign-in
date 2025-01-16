import { Paper } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.h3,
  textAlign: "center",
  color: "#ffd78f",
  height: 60,
  fontSize: "1.75rem",
  lineHeight: "60px",
  minWidth: "40px",
  WebkitTextStroke: "0.5px",
  WebkitTextStrokeColor: "black",
}));
