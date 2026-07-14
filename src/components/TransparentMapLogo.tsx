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
    return (
      <div className={`${className} relative flex items-center justify-center`} style={{ filter: `drop-shadow(0 0 ${glowRadius} ${glowColor})` }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Outer glowing dashed tech-ring */}
          <circle cx="50" cy="50" r="44" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" className="opacity-40" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="1" className="opacity-30" />
          
          {/* Red disc (symbol of Bangladesh's flag - slightly left-of-center) */}
          <circle cx="45" cy="50" r="22" fill="#ef4444" className="opacity-85" />
          
          {/* Connected Neural Nodes (AI/Mind) */}
          <circle cx="36" cy="42" r="3" fill="#ffffff" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
          <circle cx="56" cy="38" r="3" fill="#ffffff" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
          <circle cx="64" cy="56" r="3" fill="#ffffff" className="animate-pulse" style={{ animationDelay: "1s" }} />
          <circle cx="44" cy="66" r="3" fill="#ffffff" className="animate-pulse" style={{ animationDelay: "1.4s" }} />
          <circle cx="32" cy="58" r="3" fill="#ffffff" className="animate-pulse" style={{ animationDelay: "1.8s" }} />
          
          {/* Inter-node connection lines */}
          <line x1="36" y1="42" x2="56" y2="38" stroke="#ffffff" strokeWidth="1" className="opacity-60" />
          <line x1="56" y1="38" x2="64" y2="56" stroke="#ffffff" strokeWidth="1" className="opacity-60" />
          <line x1="64" y1="56" x2="44" y2="66" stroke="#ffffff" strokeWidth="1" className="opacity-60" />
          <line x1="44" y1="66" x2="32" y2="58" stroke="#ffffff" strokeWidth="1" className="opacity-60" />
          <line x1="32" y1="58" x2="36" y2="42" stroke="#ffffff" strokeWidth="1" className="opacity-60" />
          
          <line x1="36" y1="42" x2="44" y2="66" stroke="#ffffff" strokeWidth="0.5" className="opacity-40" strokeDasharray="1 1" />
          <line x1="56" y1="38" x2="32" y2="58" stroke="#ffffff" strokeWidth="0.5" className="opacity-40" strokeDasharray="1 1" />
          <line x1="56" y1="38" x2="44" y2="66" stroke="#ffffff" strokeWidth="0.7" className="opacity-50" />
          
          {/* central glowing node */}
          <circle cx="46" cy="51" r="5" fill="#34d399" className="animate-pulse" />
        </svg>
      </div>
    );
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
