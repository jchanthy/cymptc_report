// YCPP Daily Report Helper Core JavaScript

// 26 Official Names parsed from FormKH schema
const MEMBER_NAMES = [
  "1-យ៉ិនទៀង ពុទ្ធិរ៉ា",
  "2-ទូច យ៉ារ៉ាន់ឌី",
  "3-ពត សែមតារារដ្ឋ",
  "4-សៅ សភារដ្ឋ",
  "5-ចន ចន្ធី",
  "6-រដ្ឋ ច័ន្ទសុវណ្ណ",
  "7-ជាតិ វណ្ណៈ",
  "8-នុត សមសត្យា",
  "9-សោភ័ណ សច្ចៈ",
  "10-តាន់ សុភ័ក្រ",
  "11-សែម វីរៈ",
  "12-អុឹម សុភ័ក្ត្រ",
  "13-ជរ លីធីត្រា",
  "14-វណ្ណា សុជាតា",
  "15-ថា ធារ៉ា",
  "16-ខៀវ ណាវីន",
  "17-សេង ស៊ីឆៀក",
  "18-ឡេង សុធន",
  "19-ឡេង ចំណាន",
  "20-ឃឹម ថៃ",
  "21-ឡុង គីមលាង",
  "22-រ័ត្ន សិរីលក្ខិណា",
  "23-សុខ​ ឆេងលាភ",
  "24-អុ៊ुक អង្គារតនៈ",
  "25-ឃន វិបុល",
  "26-អ៊ុន ស្រីពេជ្រ"
];

// App State & Data
let appConfig = {
  defaultName: "",
  botToken: "",
  chatId: ""
};

let reportHistory = [];
let analyticsChart = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initDropdowns();
  loadSettings();
  loadHistory();
  startDateTimeTicker();
  setupEventListeners();
  updateLivePreview();
  renderAnalyticsChart();
});

// Setup official dropdowns
function initDropdowns() {
  const reporterSelect = document.getElementById("reporter-name");
  const defaultSelect = document.getElementById("default-member-name");
  
  MEMBER_NAMES.forEach(name => {
    // Fill active form dropdown
    const option1 = document.createElement("option");
    option1.value = name;
    option1.textContent = name;
    reporterSelect.appendChild(option1);

    // Fill settings default dropdown
    const option2 = document.createElement("option");
    option2.value = name;
    option2.textContent = name;
    defaultSelect.appendChild(option2);
  });
}

// Start live clocks
function startDateTimeTicker() {
  const timeEl = document.getElementById("live-time");
  const dateEl = document.getElementById("live-date");
  
  function tick() {
    const now = new Date();
    
    // Format Time: HH:MM:SS AM/PM
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    timeEl.textContent = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    
    // Format Date: e.g. Friday, May 22, 2026
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
  }
  
  tick();
  setInterval(tick, 1000);
}

// Load Settings from LocalStorage
function loadSettings() {
  const saved = localStorage.getItem("ycpp_helper_config");
  if (saved) {
    appConfig = JSON.parse(saved);
    
    // Auto fill form and settings default values
    if (appConfig.defaultName) {
      document.getElementById("reporter-name").value = appConfig.defaultName;
      document.getElementById("default-member-name").value = appConfig.defaultName;
    } else {
      // Smart default: pre-select Chanthy John if not set in config
      const chanthyOption = MEMBER_NAMES.find(n => n.includes("ចន ចន្ធី"));
      if (chanthyOption) {
        document.getElementById("reporter-name").value = chanthyOption;
        document.getElementById("default-member-name").value = chanthyOption;
      }
    }
    
    document.getElementById("tg-bot-token").value = appConfig.botToken || "";
    document.getElementById("tg-chat-id").value = appConfig.chatId || "";
  } else {
    // Perfect personalization: default name highlight to "5-ចន ចន្ធី" (likely the user Chanthy)
    const chanthyOption = MEMBER_NAMES.find(n => n.includes("ចន ចន្ធី"));
    if (chanthyOption) {
      document.getElementById("reporter-name").value = chanthyOption;
      document.getElementById("default-member-name").value = chanthyOption;
    }
  }
}

// Save Settings to LocalStorage
function saveSettings(event) {
  event.preventDefault();
  
  appConfig.defaultName = document.getElementById("default-member-name").value;
  appConfig.botToken = document.getElementById("tg-bot-token").value.trim();
  appConfig.chatId = document.getElementById("tg-chat-id").value.trim();
  
  localStorage.setItem("ycpp_helper_config", JSON.stringify(appConfig));
  
  // Update form dropdown with new default if set
  if (appConfig.defaultName) {
    document.getElementById("reporter-name").value = appConfig.defaultName;
  }
  
  showToast("⚙️ រក្សាទុកការកំណត់បានជោគជ័យ!", "success");
  closeSettings();
  updateLivePreview();
}

// Setup Settings Modal Actions
const modal = document.getElementById("settings-modal");
document.getElementById("open-settings-btn").addEventListener("click", () => {
  modal.classList.add("open");
});

function closeSettings() {
  modal.classList.remove("open");
}

// Handle incremental counter controls
function adjustCount(inputId, amount) {
  const input = document.getElementById(inputId);
  let val = parseInt(input.value) || 0;
  val += amount;
  if (val < 0) val = 0;
  input.value = val;
  updateLivePreview();
}

// Event Listeners setup
function setupEventListeners() {
  const inputs = document.querySelectorAll('.counter-input, #reporter-name');
  inputs.forEach(input => {
    input.addEventListener('input', updateLivePreview);
    input.addEventListener('change', updateLivePreview);
  });
  
  // Close modal when clicking outside content
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeSettings();
  });
}

// Generate formatted Khmer telegram report text
function generateReportText() {
  const name = document.getElementById("reporter-name").value || "[មិនទាន់ជ្រើសរើសឈ្មោះ]";
  const dateStr = document.getElementById("live-date").textContent;
  
  // Collect inputs
  const post = parseInt(document.getElementById("post_count").value) || 0;
  const disLike = parseInt(document.getElementById("dissem_like").value) || 0;
  const disComment = parseInt(document.getElementById("dissem_comment").value) || 0;
  const disShare = parseInt(document.getElementById("dissem_share").value) || 0;
  
  const supLike = parseInt(document.getElementById("support_like").value) || 0;
  const supComment = parseInt(document.getElementById("support_comment").value) || 0;
  const supShare = parseInt(document.getElementById("support_share").value) || 0;
  
  const cntLike = parseInt(document.getElementById("counter_like").value) || 0;
  const cntComment = parseInt(document.getElementById("counter_comment").value) || 0;
  const cntReport = parseInt(document.getElementById("counter_report").value) || 0;
  
  const leadLike = parseInt(document.getElementById("leader_like").value) || 0;
  const leadComment = parseInt(document.getElementById("leader_comment").value) || 0;
  const leadShare = parseInt(document.getElementById("leader_share").value) || 0;

  return `🇰🇭 <b><u>របាយការណ៍បូកសរុបព័ត៌មានប្រចាំថ្ងៃ (ក.ស.ព.)</u></b> 🇰🇭
━━━━━━━━━━━━━━━━━━━━
👤 <b>សមាជិក៖</b> ${name}
📅 <b>កាលបរិច្ឆេទ៖</b> ${dateStr}
━━━━━━━━━━━━━━━━━━━━

📢 <b>១. ផ្សព្វផ្សាយ (តំណភ្ជាប់)៖</b>
• Post: <b>${post}</b> | Like: <b>${disLike}</b> | Comment: <b>${disComment}</b> | Share: <b>${disShare}</b>

❤️ <b>២. គាំទ្រ (តំណភ្ជាប់)៖</b>
• Like: <b>${supLike}</b> | Comment: <b>${supComment}</b> | Share: <b>${supShare}</b>

⚔️ <b>៣. វាយបក (តំណភ្ជាប់)៖</b>
• Like: <b>${cntLike}</b> | Comment: <b>${cntComment}</b> | Report: <b>${cntReport}</b>

👑 <b>៤. គាំទ្រថ្នាក់ដឹកនាំ៖</b>
• Like: <b>${leadLike}</b> | Comment: <b>${leadComment}</b> | Share: <b>${leadShare}</b>

━━━━━━━━━━━━━━━━━━━━
🔗 <i>បញ្ជូនដោយ៖ YCPP Report Helper Tool</i>`;
}

// Live preview updates
function updateLivePreview() {
  const previewDiv = document.getElementById("telegram-preview-text");
  previewDiv.innerHTML = generateReportText();
  updatePrefillLinks();
}

// Generate URL prefill parameters and prepare the clipboard bookmarklet
function updatePrefillLinks() {
  const name = document.getElementById("reporter-name").value || "";
  
  const post = parseInt(document.getElementById("post_count").value) || 0;
  const disLike = parseInt(document.getElementById("dissem_like").value) || 0;
  const disComment = parseInt(document.getElementById("dissem_comment").value) || 0;
  const disShare = parseInt(document.getElementById("dissem_share").value) || 0;
  
  const supLike = parseInt(document.getElementById("support_like").value) || 0;
  const supComment = parseInt(document.getElementById("support_comment").value) || 0;
  const supShare = parseInt(document.getElementById("support_share").value) || 0;
  
  const cntLike = parseInt(document.getElementById("counter_like").value) || 0;
  const cntComment = parseInt(document.getElementById("counter_comment").value) || 0;
  const cntReport = parseInt(document.getElementById("counter_report").value) || 0;
  
  const leadLike = parseInt(document.getElementById("leader_like").value) || 0;
  const leadComment = parseInt(document.getElementById("leader_comment").value) || 0;
  const leadShare = parseInt(document.getElementById("leader_share").value) || 0;

  // Build FormKH URL with prefill query params (just in case they are enabled)
  const baseUrl = "https://form.gov.kh/688c903ecfc1ef0012aac52b";
  const params = new URLSearchParams();
  
  if (name) params.append("68b2b98a9c4e92001225de19", name);
  params.append("688c90f74757030012366de6", post);
  params.append("688c90fe4757030012366e0a", disLike);
  params.append("688c911f4757030012366e4a", disComment);
  params.append("688c91294757030012366e72", disShare);
  params.append("688c9153cfc1ef0012aac821", supLike);
  params.append("688c9158cfc1ef0012aac84d", supComment);
  params.append("688c915e4757030012366efb", supShare);
  params.append("68c14e0750a0a500128ab31d", cntLike);
  params.append("688c9184cfc1ef0012aac8ab", cntComment);
  params.append("688c9187cfc1ef0012aac8dd", cntReport);
  params.append("688c91f9cfc1ef0012aac9c1", leadLike);
  params.append("688c91ff4757030012367082", leadComment);
  params.append("688c9203cfc1ef0012aac9f9", leadShare);

  const openBtn = document.getElementById("open-formkh-btn");
  if (openBtn) {
    openBtn.href = `${baseUrl}?${params.toString()}`;
  }

  // Build the intelligent Bookmarklet that prompts the user to paste their report and utilizes React's internal state setters
  const bookmarkletCode = `javascript:(function(){
    console.log("=== YCPP BOOKMARKLET DEBUG ===");
    const text=prompt("សូមបិទភ្ជាប់ (Paste) របាយការណ៍ដែលបានចម្លងពីកម្មវិធីជំនួយការនៅទីនេះ ដើម្បីបំពេញដោយស្វ័យប្រវត្ត៖");
    if(!text) { console.log("No text pasted."); return; }
    
    console.log("Pasted text length:", text.length);
    
    const nameMatch=text.match(/👤\\s*សមាជិក៖\\s*(.+)/);
    const name=nameMatch?nameMatch[1].trim():"";
    console.log("Parsed Name:", name);
    
    const p1=text.match(/📢\\s*១\\.\\s*ផ្សព្វផ្សាយ[\\s\\S]+?Post:\\s*(\\d+)\\s*\\|\\s*Like:\\s*(\\d+)\\s*\\|\\s*Comment:\\s*(\\d+)\\s*\\|\\s*Share:\\s*(\\d+)/);
    const p2=text.match(/❤️\\s*២\\.\\s*គាំទ្រ[\\s\\S]+?Like:\\s*(\\d+)\\s*\\|\\s*Comment:\\s*(\\d+)\\s*\\|\\s*Share:\\s*(\\d+)/);
    const p3=text.match(/⚔️\\s*៣\\.\\s*វាយបក[\\s\\S]+?Like:\\s*(\\d+)\\s*\\|\\s*Comment:\\s*(\\d+)\\s*\\|\\s*Report:\\s*(\\d+)/);
    const p4=text.match(/👑\\s*៤\\.\\s*គាំទ្រថ្នាក់ដឹកនាំ[\\s\\S]+?Like:\\s*(\\d+)\\s*\\|\\s*Comment:\\s*(\\d+)\\s*\\|\\s*Share:\\s*(\\d+)/);
    
    console.log("p1 match:", p1);
    console.log("p2 match:", p2);
    console.log("p3 match:", p3);
    console.log("p4 match:", p4);
    
    const values={
      "688c90f74757030012366de6":p1?p1[1]:"0",
      "688c90fe4757030012366e0a":p1?p1[2]:"0",
      "688c911f4757030012366e4a":p1?p1[3]:"0",
      "688c91294757030012366e72":p1?p1[4]:"0",
      "688c9153cfc1ef0012aac821":p2?p2[1]:"0",
      "688c9158cfc1ef0012aac84d":p2?p2[2]:"0",
      "688c915e4757030012366efb":p2?p2[3]:"0",
      "68c14e0750a0a500128ab31d":p3?p3[1]:"0",
      "688c9184cfc1ef0012aac8ab":p3?p3[2]:"0",
      "688c9187cfc1ef0012aac8dd":p3?p3[3]:"0",
      "688c91f9cfc1ef0012aac9c1":p4?p4[1]:"0",
      "688c91ff4757030012367082":p4?p4[2]:"0",
      "688c9203cfc1ef0012aac9f9":p4?p4[3]:"0"
    };
    
    let filledCount=0;
    for(const[id,val]of Object.entries(values)){
      const input=document.getElementById(id)
        || document.querySelector(\`input[name*="\${id}"]\`)
        || document.querySelector(\`[id*="\${id}"]\`);
        
      console.log("Checking ID:", id, "Found:", !!input);
      
      if(input){
        let prototype=window.HTMLInputElement.prototype;
        if(input.tagName==="TEXTAREA")prototype=window.HTMLTextAreaElement.prototype;
        if(input.tagName==="SELECT")prototype=window.HTMLSelectElement.prototype;
        
        const setter=Object.getOwnPropertyDescriptor(prototype,"value")?.set;
        if(setter){
          setter.call(input,val);
        }else{
          input.value=val;
        }
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
        filledCount++;
      }
    }
    
    const selectEl=document.getElementById("68b2b98a9c4e92001225de19")
      || document.querySelector(\`[name*="68b2b98a9c4e92001225de19"]\`)
      || document.querySelector(\`[id*="68b2b98a9c4e92001225de19"]\`);
      
    console.log("Name Element Found:", !!selectEl);
    
    let nameFilled = false;
    if(selectEl){
      let proto=window.HTMLSelectElement.prototype;
      if(selectEl.tagName==="INPUT")proto=window.HTMLInputElement.prototype;
      
      const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
      if(setter) setter.call(selectEl,name);
      else selectEl.value=name;
      selectEl.dispatchEvent(new Event("input",{bubbles:true}));
      selectEl.dispatchEvent(new Event("change",{bubbles:true}));
      filledCount++;
      nameFilled = true;
    }
    
    if(!nameFilled || (selectEl && selectEl.style.display === "none")){
      const control=document.querySelector('.choices, [class*="-control"], .react-select__control, .select__control, .formio-choices');
      console.log("Custom Dropdown Found:", !!control);
      if(control&&name){
        control.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));
        control.click();
        setTimeout(()=>{
          const option=Array.from(document.querySelectorAll('.choices__item--choice, .choices__item, [class*="-option"], [id*="-option"], .react-select__option, .formio-dropdown-option'))
            .find(el=>el.textContent.trim().includes(name)||name.includes(el.textContent.trim()));
          console.log("Custom Option Found:", !!option);
          if(option){
            option.click();
            option.dispatchEvent(new MouseEvent("click",{bubbles:true}));
            if(!nameFilled) filledCount++;
          }
        },150);
      }
    }
    
    setTimeout(()=>{
      alert("⚡ បានបំពេញទិន្នន័យរួចរាល់! ជោគជ័យចំនួន "+filledCount+" វាល។");
    },300);
  })();`;

  const bookmarkletBtn = document.getElementById("bookmarklet-btn");
  if (bookmarkletBtn) {
    // Minify on-the-fly: strip newlines and consecutive spaces so it's a valid single-line javascript: URL
    bookmarkletBtn.href = bookmarkletCode.replace(/\r?\n\s*/g, ' ');
  }
}

// Copy to Clipboard with confetti visual feedback
function copyReportToClipboard() {
  // Extract text and convert HTML tags to plain text for normal clipboard paste
  const name = document.getElementById("reporter-name").value || "[មិនទាន់ជ្រើសរើសឈ្មោះ]";
  const dateStr = document.getElementById("live-date").textContent;
  
  const post = parseInt(document.getElementById("post_count").value) || 0;
  const disLike = parseInt(document.getElementById("dissem_like").value) || 0;
  const disComment = parseInt(document.getElementById("dissem_comment").value) || 0;
  const disShare = parseInt(document.getElementById("dissem_share").value) || 0;
  
  const supLike = parseInt(document.getElementById("support_like").value) || 0;
  const supComment = parseInt(document.getElementById("support_comment").value) || 0;
  const supShare = parseInt(document.getElementById("support_share").value) || 0;
  
  const cntLike = parseInt(document.getElementById("counter_like").value) || 0;
  const cntComment = parseInt(document.getElementById("counter_comment").value) || 0;
  const cntReport = parseInt(document.getElementById("counter_report").value) || 0;
  
  const leadLike = parseInt(document.getElementById("leader_like").value) || 0;
  const leadComment = parseInt(document.getElementById("leader_comment").value) || 0;
  const leadShare = parseInt(document.getElementById("leader_share").value) || 0;

  const plainText = `🇰🇭 របាយការណ៍បូកសរុបព័ត៌មានប្រចាំថ្ងៃ (ក.ស.ព.) 🇰🇭
━━━━━━━━━━━━━━━━━━━━
👤 សមាជិក៖ ${name}
📅 កាលបរិច្ឆេទ៖ ${dateStr}
━━━━━━━━━━━━━━━━━━━━

📢 ១. ផ្សព្វផ្សាយ (តំណភ្ជាប់)៖
• Post: ${post} | Like: ${disLike} | Comment: ${disComment} | Share: ${disShare}

❤️ ២. គាំទ្រ (តំណភ្ជាប់)៖
• Like: ${supLike} | Comment: ${supComment} | Share: ${supShare}

⚔️ ៣. វាយបក (តំណភ្ជាប់)៖
• Like: ${cntLike} | Comment: ${cntComment} | Report: ${cntReport}

👑 ៤. គាំទ្រថ្នាក់ដឹកនាំ៖
• Like: ${leadLike} | Comment: ${leadComment} | Share: ${leadShare}

━━━━━━━━━━━━━━━━━━━━
🔗 បញ្ជូនដោយ៖ YCPP Report Helper Tool`;

  // Old-school fallback for non-secure contexts (like double-clicking index.html local files)
  function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        onCopySuccess();
      } else {
        showToast("❌ មិនអាចចម្លងសារបានឡើយ", "error");
      }
    } catch (err) {
      showToast("❌ មិនអាចចម្លងសារបាន៖ " + err, "error");
    }
    document.body.removeChild(textArea);
  }

  function onCopySuccess() {
    // Show toast success
    showToast("📋 ចម្លងរបាយការណ៍ទៅ Clipboard រួចរាល់!", "success");
    
    // Confetti effect!
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(plainText).then(onCopySuccess).catch(err => {
      // If modern API fails, run fallback
      fallbackCopyText(plainText);
    });
  } else {
    // If no modern API, run fallback
    fallbackCopyText(plainText);
  }
}

// Reset form values
function resetForm() {
  const inputs = document.querySelectorAll('.counter-input');
  inputs.forEach(input => input.value = 0);
  
  // Re-fill default name if any, fallback to Chanthy John
  if (appConfig.defaultName) {
    document.getElementById("reporter-name").value = appConfig.defaultName;
  } else {
    const chanthyOption = MEMBER_NAMES.find(n => n.includes("ចន ចន្ធី"));
    if (chanthyOption) {
      document.getElementById("reporter-name").value = chanthyOption;
    } else {
      document.getElementById("reporter-name").selectedIndex = 0;
    }
  }
  
  updateLivePreview();
  showToast("🔄 សម្អាតទម្រង់ប្រចាំថ្ងៃរួចរាល់!", "info");
}

// Submit via Telegram Bot or fallback link
function submitTelegram() {
  const name = document.getElementById("reporter-name").value;
  if (!name) {
    showToast("⚠️ សូមជ្រើសរើសឈ្មោះសមាជិកជាមុនសិន!", "error");
    document.getElementById("reporter-name").focus();
    return;
  }

  // Check if Bot details exist
  if (appConfig.botToken && appConfig.chatId) {
    const text = generateReportText();
    const url = `https://api.telegram.org/bot${appConfig.botToken}/sendMessage`;
    
    showToast("📤 កំពុងបញ្ជូនទៅកាន់ Telegram Group...", "info");
    
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: appConfig.chatId,
        text: text,
        parse_mode: "HTML"
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        showToast("🚀 បានផ្ញើរបាយការណ៍ទៅតេឡេក្រាមរួចរាល់!", "success");
        saveReportToHistory();
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.7 }
        });
      } else {
        throw new Error(data.description || "Unknown error");
      }
    })
    .catch(err => {
      showToast("❌ ការផ្ញើបរាជ័យ៖ " + err.message, "error");
    });
  } else {
    // Fallback: copy to clipboard AND open custom Telegram share link so user can select group
    copyReportToClipboard();
    
    showToast("📋 បានចម្លងសារ! បើក Telegram ដើម្បីបញ្ជូនបន្ត...", "success");
    
    // Delay slightly to let the user read the toast
    setTimeout(() => {
      const plainText = document.getElementById("telegram-preview-text").innerText;
      const tgUrl = `https://t.me/share/url?url=https://form.gov.kh/688c903ecfc1ef0012aac52b&text=${encodeURIComponent(plainText)}`;
      window.open(tgUrl, "_blank");
      
      // Also log to history manually since it was shared
      saveReportToHistory();
    }, 800);
  }
}

// Save logged report to local history
function saveReportToHistory() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('km-KH', { year: 'numeric', month: 'numeric', day: 'numeric' });
  
  const newReport = {
    date: dateStr,
    timestamp: today.getTime(),
    dissem: {
      post: parseInt(document.getElementById("post_count").value) || 0,
      like: parseInt(document.getElementById("dissem_like").value) || 0,
      comment: parseInt(document.getElementById("dissem_comment").value) || 0,
      share: parseInt(document.getElementById("dissem_share").value) || 0
    },
    support: {
      like: parseInt(document.getElementById("support_like").value) || 0,
      comment: parseInt(document.getElementById("support_comment").value) || 0,
      share: parseInt(document.getElementById("support_share").value) || 0
    },
    counter: {
      like: parseInt(document.getElementById("counter_like").value) || 0,
      comment: parseInt(document.getElementById("counter_comment").value) || 0,
      report: parseInt(document.getElementById("counter_report").value) || 0
    },
    leader: {
      like: parseInt(document.getElementById("leader_like").value) || 0,
      comment: parseInt(document.getElementById("leader_comment").value) || 0,
      share: parseInt(document.getElementById("leader_share").value) || 0
    }
  };
  
  // Prepend to history log
  reportHistory.unshift(newReport);
  // Keep last 30 reports
  if (reportHistory.length > 30) reportHistory.pop();
  
  localStorage.setItem("ycpp_report_history", JSON.stringify(reportHistory));
  
  renderHistoryTable();
  renderAnalyticsChart();
}

// Load history log
function loadHistory() {
  const saved = localStorage.getItem("ycpp_report_history");
  if (saved) {
    reportHistory = JSON.parse(saved);
  } else {
    // Load some awesome prefilled realistic sample data for 5 days so analytics chart looks beautiful instantly!
    const sampleData = [];
    const today = new Date();
    for (let i = 5; i > 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toLocaleDateString('km-KH', { year: 'numeric', month: 'numeric', day: 'numeric' });
      sampleData.push({
        date: dStr,
        timestamp: d.getTime(),
        dissem: { post: Math.floor(Math.random()*3)+1, like: Math.floor(Math.random()*15)+5, comment: Math.floor(Math.random()*5)+2, share: Math.floor(Math.random()*5)+2 },
        support: { like: Math.floor(Math.random()*20)+10, comment: Math.floor(Math.random()*6)+2, share: Math.floor(Math.random()*8)+2 },
        counter: { like: Math.floor(Math.random()*8)+3, comment: Math.floor(Math.random()*4)+1, report: Math.floor(Math.random()*3) },
        leader: { like: Math.floor(Math.random()*25)+15, comment: Math.floor(Math.random()*10)+3, share: Math.floor(Math.random()*12)+4 }
      });
    }
    reportHistory = sampleData;
    localStorage.setItem("ycpp_report_history", JSON.stringify(reportHistory));
  }
  renderHistoryTable();
}

// Display custom toasts
function showToast(message, type = "success") {
  const toast = document.getElementById("app-toast");
  const icon = toast.querySelector(".toast-icon");
  const msg = toast.querySelector(".toast-message");
  
  msg.textContent = message;
  
  if (type === "success") {
    icon.textContent = "✅";
    toast.style.borderColor = "var(--color-success)";
  } else if (type === "info") {
    icon.textContent = "ℹ️";
    toast.style.borderColor = "var(--color-primary)";
  } else if (type === "error") {
    icon.textContent = "❌";
    toast.style.borderColor = "var(--color-danger)";
  }
  
  toast.classList.add("show");
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// Tab Switching Control
function switchTab(tabName) {
  const formBtn = document.getElementById("tab-form");
  const analBtn = document.getElementById("tab-analytics");
  
  const formSection = document.getElementById("section-form-view");
  const analSection = document.getElementById("section-analytics-view");
  
  if (tabName === "form") {
    formBtn.classList.add("active");
    analBtn.classList.remove("active");
    formSection.style.display = "block";
    analSection.style.display = "none";
  } else {
    formBtn.classList.remove("active");
    analBtn.classList.add("active");
    formSection.style.display = "none";
    analSection.style.display = "block";
    
    // Redraw chart when canvas becomes visible
    setTimeout(() => {
      if (analyticsChart) {
        analyticsChart.update();
      }
    }, 100);
  }
}

// Build History Tables
function renderHistoryTable() {
  const tbody = document.getElementById("history-list");
  tbody.innerHTML = "";
  
  if (reportHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">ไม่มีประวัติการส่งรายงาน</td></tr>`;
    return;
  }
  
  reportHistory.forEach((log, index) => {
    const tr = document.createElement("tr");
    
    tr.innerHTML = `
      <td>${log.date}</td>
      <td><span class="badge badge-info">P:${log.dissem.post} L:${log.dissem.like} C:${log.dissem.comment} S:${log.dissem.share}</span></td>
      <td>L:${log.support.like} C:${log.support.comment} S:${log.support.share}</td>
      <td>L:${log.counter.like} C:${log.counter.comment} R:${log.counter.report}</td>
      <td>L:${log.leader.like} C:${log.leader.comment} S:${log.leader.share}</td>
      <td>
        <button class="btn btn-secondary" onclick="deleteHistoryItem(${index})" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; border-radius: 6px;" title="លុបចេញ">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Delete historical record
function deleteHistoryItem(index) {
  if (confirm("តើអ្នកពិតជាចង់លុបរបាយការណ៍ប្រចាំថ្ងៃនេះមែនទេ?")) {
    reportHistory.splice(index, 1);
    localStorage.setItem("ycpp_report_history", JSON.stringify(reportHistory));
    renderHistoryTable();
    renderAnalyticsChart();
    showToast("🗑️ លុបរបាយការណ៍ជោគជ័យ!", "info");
  }
}

// Render Analytics Chart using Chart.js
function renderAnalyticsChart() {
  const ctx = document.getElementById("analyticsChart").getContext("2d");
  
  // Sort chronological
  const sortedHistory = [...reportHistory].reverse();
  
  const labels = sortedHistory.map(h => h.date);
  
  // Sum totals per category
  const dissemTotals = sortedHistory.map(h => h.dissem.post + h.dissem.like + h.dissem.comment + h.dissem.share);
  const supportTotals = sortedHistory.map(h => h.support.like + h.support.comment + h.support.share);
  const counterTotals = sortedHistory.map(h => h.counter.like + h.counter.comment + h.counter.report);
  const leaderTotals = sortedHistory.map(h => h.leader.like + h.leader.comment + h.leader.share);
  
  if (analyticsChart) {
    analyticsChart.destroy();
  }
  
  analyticsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "ផ្សព្វផ្សាយ (Dissemination)",
          data: dissemTotals,
          borderColor: "#48cae4",
          backgroundColor: "rgba(72, 202, 228, 0.1)",
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: "គាំទ្រ (Support)",
          data: supportTotals,
          borderColor: "#7209b7",
          backgroundColor: "rgba(114, 9, 183, 0.1)",
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: "វាយបក (Counterattack)",
          data: counterTotals,
          borderColor: "#f25c54",
          backgroundColor: "rgba(242, 92, 84, 0.1)",
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: "គាំទ្រថ្នាក់ដឹកនាំ (Leaders)",
          data: leaderTotals,
          borderColor: "#f7a072",
          backgroundColor: "rgba(247, 160, 114, 0.1)",
          tension: 0.3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#adb5bd',
            font: {
              family: 'Outfit, Koh Santepheap'
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255,255,255,0.03)"
          },
          ticks: {
            color: '#6c757d',
            font: {
              family: 'Outfit'
            }
          }
        },
        y: {
          grid: {
            color: "rgba(255,255,255,0.03)"
          },
          ticks: {
            color: '#6c757d',
            font: {
              family: 'Outfit'
            }
          }
        }
      }
    }
  });
}

// Expose functions globally for HTML inline handlers (handles Vite ES Module scoping)
window.adjustCount = adjustCount;
window.resetForm = resetForm;
window.switchTab = switchTab;
window.copyReportToClipboard = copyReportToClipboard;
window.submitTelegram = submitTelegram;
window.closeSettings = closeSettings;
window.deleteHistoryItem = deleteHistoryItem;
window.saveSettings = saveSettings;
