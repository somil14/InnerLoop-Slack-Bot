export function classifyIntent(text) {
    const t = text.toLowerCase();
  
    if (t.includes("hello") || t.includes("hi")) {
      return "smalltalk";
    }
  
    if (t.includes("revenue") || t.includes("sales")) {
      return "revenue";
    }
  
    return "unknown";
  }
  