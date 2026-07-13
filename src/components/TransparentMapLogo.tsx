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
  const [processedSrc, setProcessedSrc] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      if (!isMounted) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Use a standard size for sharp rendering and fast processing
      const size = 256;
      canvas.width = size;
      canvas.height = size;

      // Draw loaded image to canvas scaled
      ctx.drawImage(img, 0, 0, size, size);

      try {
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Parse optional target map color
        let targetR = 0, targetG = 0, targetB = 0, hasTargetColor = false;
        if (mapColor) {
          // Simple hex parser
          const cleanHex = mapColor.replace("#", "");
          if (cleanHex.length === 6) {
            targetR = parseInt(cleanHex.substring(0, 2), 16);
            targetG = parseInt(cleanHex.substring(2, 4), 16);
            targetB = parseInt(cleanHex.substring(4, 6), 16);
            hasTargetColor = true;
          }
        }

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          const intensity = (r + g + b) / 3;

          if (removeColor === "black") {
            // Smooth threshold to remove black background and keep white map
            if (intensity <= 30) {
              data[i + 3] = 0; // Completely transparent
            } else if (intensity >= 65) {
              // Keep original or apply custom color
              if (hasTargetColor) {
                data[i] = targetR;
                data[i + 1] = targetG;
                data[i + 2] = targetB;
              }
            } else {
              // Smooth transition for anti-aliasing
              const factor = (intensity - 30) / (65 - 30);
              data[i + 3] = Math.round(factor * 255);
              if (hasTargetColor) {
                data[i] = targetR;
                data[i + 1] = targetG;
                data[i + 2] = targetB;
              }
            }
          } else {
            // Smooth threshold to remove white background and keep black map
            if (intensity >= 225) {
              data[i + 3] = 0; // Completely transparent
            } else if (intensity <= 180) {
              // Keep original or apply custom color
              if (hasTargetColor) {
                data[i] = targetR;
                data[i + 1] = targetG;
                data[i + 2] = targetB;
              }
            } else {
              // Smooth transition for anti-aliasing
              const factor = (225 - intensity) / (225 - 180);
              data[i + 3] = Math.round(factor * 255);
              if (hasTargetColor) {
                data[i] = targetR;
                data[i + 1] = targetG;
                data[i + 2] = targetB;
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setProcessedSrc(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("Canvas background removal failed:", e);
        // Fallback to original image
        setProcessedSrc(src);
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setProcessedSrc(src);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src, removeColor, mapColor]);

  // Apply CSS drop-shadow filter for perfect shape outline glowing effect
  const filterStyle = {
    filter: `drop-shadow(0 0 ${glowRadius} ${glowColor})`,
  };

  if (!processedSrc) {
    return <div className={`${className} bg-emerald-500/10 animate-pulse rounded-lg`} />;
  }

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={`${className} object-contain`}
      style={filterStyle}
      referrerPolicy="no-referrer"
    />
  );
}
