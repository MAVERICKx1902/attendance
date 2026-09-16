import React from 'react'

export function HelicalWaterBackground() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(40, 38, 127, 0.45) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(30, 27, 75, 0.5) 0%, transparent 70%),
          linear-gradient(135deg, #090d16 0%, #0f172a 100%)
        `
      }}
    />
  )
}

export default HelicalWaterBackground
