import React, { useState, useEffect } from "react";

interface TransparentMapLogoProps {
  src: string;
  removeColor: "black" | "white";
  alt?: string;
  className?: string;
  glowColor?: string; // e.g. "rgba(16, 185, 129, 0.8)"
  glowRadius?: string; // e.g. "6px"
  mapColor?: string; // Optional: Force a specific color for the silhouette (e.g. "#10b981" or "#000000")
}

export default function TransparentMapLogo({
  src,
  removeColor,
  alt = "Bangladesh Map Logo",
  className = "w-12 h-12",
  glowColor = "rgba(16, 185, 129, 0.6)",
  glowRadius = "4px",
  mapColor,
}: TransparentMapLogoProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      console.error("TransparentMapLogo: 'src' prop is missing or empty.");
      setError(true);
    }
  }, [src]);

  // Apply CSS drop-shadow filter for perfect shape outline glowing effect
  // Note: if the image has a solid background, the shadow will be a square.
  // Using mix-blend-mode makes the background transparent against the parent.
  const filterStyle = {
    filter: `drop-shadow(0 0 ${glowRadius} ${glowColor})`,
    mixBlendMode: removeColor === "black" ? "screen" : "multiply" as any,
  };

  if (error) {
    return <div className={`${className} bg-emerald-500/10 animate-pulse rounded-lg`} />;
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`TransparentMapLogo: Failed to load image from src "${src}". This may be due to an invalid URL, a missing file, or a CORS restriction.`);
    setError(true);
  };

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-contain`}
      style={filterStyle}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
