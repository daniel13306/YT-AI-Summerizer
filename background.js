// https://deadeagle.nl
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === "summarize" && msg.prompt) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: msg.prompt }] }]
          })
        }
      );

      if (!res.ok) {
        // HTTP error, handle unauthorized or invalid key status codes
        if (res.status === 401 || res.status === 403) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "showSummary",
            summary: "❌ Invalid or missing Gemini API key. Please check your API key in your background.js file!"
          });
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      if (json.error) {
        // API returned an error object
        const message = json.error.message || "Unknown API error.";
        if (
          message.toLowerCase().includes("unauthorized") ||
          message.toLowerCase().includes("forbidden") ||
          message.toLowerCase().includes("invalid api key")
        ) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "showSummary",
            summary: "❌ Invalid or missing Gemini API key. Please check your API key."
          });
          return;
        }
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "showSummary",
          summary: `❌ API Error: ${message}`
        });
        return;
      }

      const summary = json.candidates?.[0]?.content?.parts?.[0]?.text || "No summary found.";

      chrome.tabs.sendMessage(sender.tab.id, {
        action: "showSummary",
        summary: summary
      });
    } catch (err) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "showSummary",
        summary: `❌ Error fetching summary: ${err.message}`
      });
    }
  }
});
