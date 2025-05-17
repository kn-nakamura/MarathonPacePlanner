import React from "react";

export function BMCButton() {
  return (
    <div style={{ textAlign: "center", margin: "2rem 0" }}>
      <a 
        href="https://www.buymeacoffee.com/kenta.frun" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        <img 
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" 
          alt="Buy Me A Coffee" 
          style={{
            height: '50px',
            width: 'auto',
          }}
        />
      </a>
    </div>
  );
}