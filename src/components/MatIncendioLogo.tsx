import React from 'react';

interface MatIncendioLogoProps {
  className?: string;
  height?: number;
}

export const MatIncendioLogo: React.FC<MatIncendioLogoProps> = ({ className = "h-14 w-auto", height = 56 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 540 160"
      fill="none"
      className={className}
      style={{ height }}
    >
      {/* Círculo Vermelho */}
      <circle cx="80" cy="80" r="70" stroke="#CD2027" strokeWidth="12" fill="none" />
      
      {/* Traço 'M' dentro do círculo */}
      <path
        d="M 26 100 L 58 62 L 84 110 L 122 48"
        stroke="#CD2027"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Detalhe superior direito do M */}
      <path
        d="M 124 46 L 138 41"
        stroke="#CD2027"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />

      {/* Texto MAT */}
      <text
        x="180"
        y="70"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="54"
        className="fill-slate-600 dark:fill-slate-200"
        letterSpacing="2"
      >
        MAT
      </text>

      {/* Texto INCÊNDIO */}
      <text
        x="180"
        y="132"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="54"
        className="fill-slate-600 dark:fill-slate-200"
        letterSpacing="2"
      >
        INCÊNDIO
      </text>
    </svg>
  );
};
