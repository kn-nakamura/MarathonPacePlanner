import { useEffect } from "react";

export function BMCButton() {
  useEffect(() => {
    // Buy Me a Coffee のスクリプトを動的に読み込む
    const script = document.createElement("script");
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script) }
  }, []);

  return (
    <div style={{ textAlign: "center", margin: "2rem 0" }}>
      <div
        className="bmc-button"
        data-name="bmc-button"
        data-slug="kenta.frun"
        data-color="#FFDD00"
        data-emoji="☕️"
        data-font="Cookie"
        data-text="Buy me a coffee"
        data-outline-color="#000000"
        data-font-color="#000000"
        data-coffee-color="#ffffff"
      />
    </div>
  );
}