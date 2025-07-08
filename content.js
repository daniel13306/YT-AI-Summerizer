// https://deadeagle.nl
async function extractTranscriptPrompt() {
  const title =
    document.querySelector('h1.title')?.innerText ||
    document.querySelector('h1.ytd-watch-metadata')?.innerText ||
    document.title;

  const creator =
    document.querySelector('#text-container.ytd-channel-name')?.innerText ||
    document.querySelector('ytd-channel-name a')?.innerText ||
    'Unknown Creator';

  const description =
    document.querySelector('#description.ytd-video-secondary-info-renderer')?.innerText ||
    document.querySelector('yt-formatted-string.content')?.innerText ||
    'No description available.';

  const tryClickTranscriptButton = () => {
    const buttons = [...document.querySelectorAll('button')];
    const transcriptBtn = buttons.find(b => b.innerText.toLowerCase().includes("transcript"));
    if (transcriptBtn) transcriptBtn.click();
  };

  tryClickTranscriptButton();

  const waitForSegments = async () => {
    const maxTries = 30;
    let tries = 0;
    while (tries < maxTries) {
      const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
      if (segments.length > 0) return [...segments];
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    return [];
  };

  const segments = await waitForSegments();
  if (segments.length === 0) return null;

  const groups = {};
  for (const seg of segments) {
    const key = seg.parentElement;
    if (!groups[key]) groups[key] = [];
    groups[key].push(seg);
  }

  const largest = Object.values(groups).sort((a, b) => b.length - a.length)[0] || [];
  const transcript = largest.map(el => el.innerText.trim()).filter(Boolean).join('\n');
  const trimmed = transcript.length > 20000 ? transcript.slice(0, 20000) : transcript;

  return `You are a professional video content analyst and summarizer. Based on the channel, title, description, and transcript below, provide a detailed analysis with the following sections:
If your unsure about certain presented facts, add a disclaimer on top, we are not providing title and desc because youtube can bug a bit with these, you DONT need to disclaim this.
Make sure everything is Clear and readable, add a \n per section below!!
	
1. Short Summary
- Quick Glance Summary: Provide a brief summary capturing the core content in 2-3 sentences.

2. Video Analysis & Ranking
- Channel: Describe the channel briefly and assess credibility. (If possible, SHORT!)
- Transcript Length: Note the transcript length and completeness. (SHORT!)
- Rankings:
  - Clickbait (0-10): Rate how clickbait-y the video is and justify your score.
  - Video Quality (0-10): Rate the video content quality, relevance, and informativeness.
  - On Topic (0-10): Rate how well the creator stays focused on the topic.

3. Long Summary
- In-Depth Summary: Provide a more detailed summary covering all key points in the video.

Ensure clarity, conciseness, and professionalism in your response.

Creator: ${creator}

Transcript:
${trimmed}`;
}

function markdownToHTML(md) {
  const escapeHTML = (str) =>
    str.replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;");

  let html = escapeHTML(md);

  html = html.replace(/^(\*\*\*|---)$/gm, '<hr>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/^\* (.*)$/gm, '<li>$1</li>');

  if (html.includes('<li>')) {
    html = html.replace(/(?:<\/li>\n?<li>)+/g, '</li><li>');
    html = '<ul>' + html + '</ul>';
  }

  html = html.replace(/\n\s*\n/g, '</p><p>');

  html = html.split('\n').map(line => {
    if (
      line.startsWith('<h3>') ||
      line.startsWith('<ul>') ||
      line.startsWith('<li>') ||
      line.startsWith('</ul>') ||
      line.startsWith('</li>') ||
      line.startsWith('<strong>') ||
      line.startsWith('<em>') ||
      line.startsWith('<hr>') ||
      line.trim() === ''
    ) {
      return line;
    }
    return `<p>${line}</p>`;
  }).join('\n');

  html = html.replace(/(?<!<\/p>)\n(?!<p>)/g, '<br>');

  return html;
}


function createOrShowPopup(text) {
  let overlay = document.getElementById("ai-summary-overlay");
  let popup = document.getElementById("ai-summary-popup");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "ai-summary-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.zIndex = "100000";
    document.body.appendChild(overlay);
  }
  overlay.style.display = "block";

  if (!popup) {
    popup = document.createElement("div");
    popup.id = "ai-summary-popup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.background = "#202124";
    popup.style.color = "#fff";
    popup.style.padding = "20px 24px 20px 24px";
    popup.style.borderRadius = "12px";
    popup.style.border = "1.5px solid transparent";
    popup.style.width = "600px";
    popup.style.maxHeight = "70vh";
    popup.style.overflowY = "auto";
    popup.style.fontSize = "14px";
    popup.style.whiteSpace = "normal";
    popup.style.lineHeight = "1.4";
    popup.style.zIndex = "100001";
    popup.style.boxSizing = "border-box";
    popup.style.textShadow = "0 0 2px black";

    if (!document.getElementById("rgb-breathing-style")) {
      const style = document.createElement("style");
      style.id = "rgb-breathing-style";
      style.textContent = `
        @keyframes rgb-breath-move {
          0%, 100% {
            box-shadow:
              0 0 6px 2px rgba(255, 0, 0, 0.6),
              0 0 12px 4px rgba(0, 255, 0, 0.5),
              0 0 18px 6px rgba(0, 0, 255, 0.5);
            filter: drop-shadow(0 0 3px rgba(255,0,0,0.6));
          }
          25% {
            box-shadow:
              1px 1px 9px 4px rgba(0, 255, 0, 0.6),
              -1px -1px 15px 6px rgba(0, 0, 255, 0.5),
              2px -2px 21px 8px rgba(255, 0, 0, 0.5);
            filter: drop-shadow(1px 1px 4px rgba(0,255,0,0.6));
          }
          50% {
            box-shadow:
              0 0 12px 6px rgba(0, 0, 255, 0.6),
              2px 2px 18px 8px rgba(255, 0, 0, 0.5),
              -2px 2px 24px 10px rgba(0, 255, 0, 0.5);
            filter: drop-shadow(0 0 5px rgba(0,0,255,0.6));
          }
          75% {
            box-shadow:
              -1px -1px 9px 4px rgba(255, 0, 0, 0.6),
              1px 1px 15px 6px rgba(0, 255, 0, 0.5),
              -2px 2px 21px 8px rgba(0, 0, 255, 0.5);
            filter: drop-shadow(-1px -1px 4px rgba(255,0,0,0.6));
          }
        }
      `;
      document.head.appendChild(style);
    }

    popup.style.animation = "rgb-breath-move 12s ease-in-out infinite";

    const closeBtn = document.createElement("button");
    closeBtn.innerText = "×";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "8px";
    closeBtn.style.right = "12px";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = "#0ff";
    closeBtn.style.border = "none";
    closeBtn.style.fontSize = "28px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.textShadow = "0 0 8px #0ff";
    closeBtn.onmouseenter = () => closeBtn.style.color = "#00ccff";
    closeBtn.onmouseleave = () => closeBtn.style.color = "#0ff";
    closeBtn.onclick = () => {
      popup.style.display = "none";
      overlay.style.display = "none";
    };

    popup.appendChild(closeBtn);

    const header = document.createElement("div");
    header.innerText = "Plugin By DeadEagleNL";
    header.style.color = "#0ff";
    header.style.fontWeight = "700";
    header.style.fontSize = "18px";
    header.style.textAlign = "center";
    header.style.marginBottom = "12px";
    header.style.textShadow = "0 0 8px #0ff";
    popup.appendChild(header);

    const contentDiv = document.createElement("div");
    contentDiv.id = "ai-summary-content";
    contentDiv.style.marginTop = "0";
    popup.appendChild(contentDiv);

    document.body.appendChild(popup);
  }

  popup.style.display = "block";
  const contentDiv = popup.querySelector("#ai-summary-content");
  contentDiv.innerHTML = markdownToHTML(text);
}



function injectButton() {
  if (document.getElementById("yt-data-btn")) return;

  const tryAttach = setInterval(() => {
    const subBtnContainer = document.querySelector('#top-level-buttons-computed');
    if (subBtnContainer) {
      clearInterval(tryAttach);

      const btn = document.createElement("button");
      btn.id = "yt-data-btn";
      btn.innerText = "AI summary";

      btn.style.marginLeft = "8px";
      btn.style.padding = "10px 16px";
      btn.style.background = "#0f9d58";
      btn.style.color = "#fff";
      btn.style.border = "none";
      btn.style.borderRadius = "18px";
      btn.style.fontWeight = "500";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "14px";

      btn.onclick = async () => {
        createOrShowPopup("Loading...");

        const prompt = await extractTranscriptPrompt();
        if (!prompt) {
          createOrShowPopup("❌ Transcript not found. Make sure it's open.");
          return;
        }
        chrome.runtime.sendMessage({ action: "summarize", prompt });
      };

      subBtnContainer.appendChild(btn);
    }
  }, 300);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "showSummary") {
    createOrShowPopup("✅ AI Summary:\n\n" + msg.summary);
    console.log("AI Summary:\n", msg.summary);
  }
});

injectButton();
