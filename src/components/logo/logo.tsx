import React from "react";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const StyledLogo = styled("img")({
  height: "auto",
  maxHeight: "120px",
  maxWidth: "100%"
});

export const Logo = () => {
  const navigate = useNavigate();
  return (
    <StyledLogo
      src="/images/lock-logo.png"
      alt="logo"
      onClick={() => navigate("/")}
      sx={{ cursor: "pointer", width: { xs: "min(65vw, 250px)", sm: "auto" } }}
    />
  );
};
