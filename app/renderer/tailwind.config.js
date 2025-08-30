/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#ebe6ff",
        bg:  "#0b0a10",
        card:"#13111a",
        accent:"#7b5cff",
        edge:"#2a2142"
      },
      fontFamily: {
        display: ['"Medieval Sharp"', '"Press Start 2P"', "ui-sans-serif","system-ui"]
      },
      borderRadius: {
        xl: "16px",
        lg: "12px",
        md: "10px"
      }
    }
  },
  plugins: [require("daisyui")],
  daisyui: { themes: ["dark"] }
}
