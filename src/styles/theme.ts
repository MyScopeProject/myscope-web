// 🎨 MyScope Theme Configuration
// Purpose: Defines brand colors, gradients, font, and shadows for consistent styling across the app.

export const theme = {
  colors: {
    primary: "#10B981", // Emerald Green
    secondary: "#6366F1", // Indigo
    accent: "#F472B6", // Pink Accent
    background: "#0F172A", // Deep Slate Background
    surface: "#1E293B", // Surface panels
    textPrimary: "#F1F5F9", // Light text
    textSecondary: "#CBD5E1", // Muted text
  },
  gradient: {
    brand: "linear-gradient(90deg, #10B981, #6366F1)",
    hero: "linear-gradient(135deg, #10B98180, #6366F180)",
    accent: "linear-gradient(90deg, #F472B6, #6366F1)",
  },
  shadow: {
    soft: "0 4px 24px rgba(16,185,129,0.15)",
    glow: "0 0 15px rgba(99,102,241,0.4)",
  },
  font: {
    heading: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
};
