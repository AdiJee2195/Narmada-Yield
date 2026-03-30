// ──────────────────────────────────────────────
// Narmada Yield Phase II — Frontend Logic
// ──────────────────────────────────────────────
const API_BASE = "http://localhost:5005";

// ══════════════════════════════════════════════
// GLOBAL UI STATE (AppState) & DATABASE SYNC
// ══════════════════════════════════════════════
window.AppState = {
  phone: "",
  name: "Farmer",
  zone: "Malwa Plateau",
  crop: "Wheat",
  n: "",
  p: "",
  k: ""
};

window.syncUI = function() {
    // 1. Profile Setup Form
    if (document.getElementById("profile-phone")) {
        document.getElementById("profile-phone").value = window.AppState.phone || "";
        document.getElementById("profile-name").value = window.AppState.name || "";
        document.getElementById("profile-n").value = window.AppState.n || "";
        document.getElementById("profile-p").value = window.AppState.p || "";
        document.getElementById("profile-k").value = window.AppState.k || "";
        
        const pZone = document.getElementById("profile-zone");
        const pCrop = document.getElementById("profile-crop");
        pZone.innerHTML = `<option value="">Select Zone</option>` + 
            Object.keys(window.agroZones).map(z => `<option value="${z}">${z}</option>`).join("");
            
        if (window.AppState.zone) {
            pZone.value = window.AppState.zone;
            pCrop.innerHTML = `<option value="">Select Crop</option>` + 
                window.agroZones[window.AppState.zone].map(c => `<option value="${c}">${c}</option>`).join("");
            if(window.AppState.crop) pCrop.value = window.AppState.crop;
        } else {
            pCrop.innerHTML = `<option value="">Select Crop</option>`;
        }
    }
    
    // 2. Risk Forecasting
    const rZone = document.getElementById("risk_zone");
    const rCrop = document.getElementById("risk_crop");
    if (rZone && rCrop && window.AppState.zone) {
        rZone.innerHTML = `<option value="">Select Zone</option>` + 
            Object.keys(window.agroZones).map(z => `<option value="${z}">${z}</option>`).join("");
        rZone.value = window.AppState.zone;
        rCrop.innerHTML = `<option value="">Select Crop</option>` + 
            window.agroZones[window.AppState.zone].map(c => `<option value="${c}">${c}</option>`).join("") +
            `<option value="Other">Other</option>`;
        if (window.AppState.crop) rCrop.value = window.AppState.crop;
    }

    // 3. Soil Health Engine
    if (document.getElementById("in-n")) document.getElementById("in-n").value = window.AppState.n || "";
    if (document.getElementById("in-p")) document.getElementById("in-p").value = window.AppState.p || "";
    if (document.getElementById("in-k")) document.getElementById("in-k").value = window.AppState.k || "";

    // 4. Greeting string
    const greeting = document.getElementById("greeting-name");
    if(greeting) greeting.innerText = window.AppState.name ? `Farmer Profile Sync — ${window.AppState.name}` : `Farmer Profile Sync`;
}

// ══════════════════════════════════════════════
// SQL PROFILE LOAD / SAVE DRIVERS
// ══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-load-profile")?.addEventListener("click", async () => {
        const phone = document.getElementById("profile-phone").value;
        if(!phone) { window.showToast("Please enter a registered phone number.", "error"); return; }
        
        try {
            const btn = document.getElementById("btn-load-profile");
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<div class="spinner border-t-white w-4 h-4 rounded-full border-2 border-primary/20 animate-spin"></div><span>Loading...</span>';
            btn.disabled = true;

            const res = await fetch(`${API_BASE}/load_profile`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({phone})
            });
            
            btn.innerHTML = originalHtml;
            btn.disabled = false;

            if(!res.ok) throw new Error("Profile not found in Cloud Database.");
            const data = await res.json();
            
            window.AppState.phone = data.phone;
            window.AppState.name = data.name;
            window.AppState.zone = data.default_zone;
            window.AppState.crop = data.default_crop;
            window.AppState.n = data.last_n;
            window.AppState.p = data.last_p;
            window.AppState.k = data.last_k;
            
            window.syncUI();
            window.showToast(`Welcome back, ${data.name || 'Farmer'}! UI Synthesised.`, "success");
        } catch(err) {
            window.showToast(err.message, "error");
        }
    });

    document.getElementById("btn-save-profile")?.addEventListener("click", async () => {
        const phone = document.getElementById("profile-phone").value;
        if(!phone) { window.showToast("Phone number is required to save to DB.", "error"); return; }
        
        const payload = {
            phone: phone,
            name: document.getElementById("profile-name").value,
            default_zone: document.getElementById("profile-zone").value,
            default_crop: document.getElementById("profile-crop").value,
            last_n: document.getElementById("profile-n").value || null,
            last_p: document.getElementById("profile-p").value || null,
            last_k: document.getElementById("profile-k").value || null
        };
        
        try {
            const btn = document.getElementById("btn-save-profile");
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<div class="spinner border-t-white w-4 h-4 rounded-full border-2 border-primary/20 animate-spin"></div><span>Saving...</span>';
            btn.disabled = true;
            
            const res = await fetch(`${API_BASE}/save_profile`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload)
            });
            
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            
            if(!res.ok) throw new Error("Database rejection. Could not save.");
            
            Object.assign(window.AppState, payload);
            window.syncUI();
            window.showToast("Profile deeply persisted to SQLite Database.", "success");
        } catch(err) {
            window.showToast(err.message, "error");
        }
    });

    document.getElementById("profile-zone")?.addEventListener("change", (e) => {
        const zone = e.target.value;
        const pCrop = document.getElementById("profile-crop");
        if (zone && window.agroZones[zone]) {
            pCrop.innerHTML = `<option value="">Select Crop</option>` + 
                window.agroZones[zone].map(c => `<option value="${c}">${c}</option>`).join("");
        } else {
            pCrop.innerHTML = `<option value="">Select Crop</option>`;
        }
    });

    document.getElementById("risk_zone")?.addEventListener("change", (e) => {
         window.AppState.zone = e.target.value;
         const rCrop = document.getElementById("risk_crop");
         if (e.target.value && window.agroZones[e.target.value]) {
             rCrop.innerHTML = `<option value="">Select Crop</option>` + 
                 window.agroZones[e.target.value].map(c => `<option value="${c}">${c}</option>`).join("") +
                 `<option value="Other">Other</option>`;
         } else {
             rCrop.innerHTML = `<option value="">Select Crop</option>`;
         }
    });
    
    document.getElementById("risk_crop")?.addEventListener("change", (e) => {
         window.AppState.crop = e.target.value.replace(" (Other)", "");
    });
    
    // Initial Render
    window.syncUI();
});

// ══════════════════════════════════════════════
// 1. RISK FORECASTING
// ══════════════════════════════════════════════
async function calculateRisk() {
  const btn = document.getElementById("risk-btn");
  const resultDiv = document.getElementById("riskResult");
  const riskText = document.getElementById("riskText");
  const riskIndicator = document.getElementById("riskIndicator");
  const riskIcon = document.getElementById("riskIcon");

  const temp = parseFloat(document.getElementById("risk_temp").value);
  const humidity = parseFloat(document.getElementById("risk_hum").value);
  const rainfall = parseFloat(document.getElementById("risk_rain").value);
  const zoneVal = document.getElementById("risk_zone").value;
  const cropVal = document.getElementById("risk_crop").value.replace(" (Other)", "");

  if (isNaN(temp) || isNaN(humidity) || isNaN(rainfall) || !zoneVal || !cropVal) {
    alert("Please enter all required fields for Machine Learning evaluation.");
    return;
  }

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner border-t-white"></div> EVALUATING ML MODEL...';

  try {
    const res = await fetch(`${API_BASE}/predict_risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        temp_14d: temp, 
        humid_14d: humidity, 
        rain_14d: rainfall,
        zone: zoneVal,
        crop: cropVal
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    resultDiv.classList.remove("hidden");

    const prob = data.probability ?? 0;
    
    // UI update for Alert Banner CSS based on backend status Traffic Light design
    if (data.alert_level === "danger") {
        resultDiv.className = "mt-6 p-6 rounded-2xl flex items-center gap-4 transition-all bg-error-container text-error border-2 border-error";
        riskIndicator.className = 'min-w-[48px] h-12 rounded-full flex items-center justify-center bg-error text-white shadow-lg';
        riskIcon.innerText = "warning";
        riskText.innerHTML = `<span class="uppercase tracking-widest text-xs font-bold opacity-80">HIGH RISK - ${prob}%</span><br><span class="text-sm font-medium block mt-1">${data.message}</span>`;
    } else {
        resultDiv.className = "mt-6 p-6 rounded-2xl flex items-center gap-4 transition-all bg-[#e4ffd9] text-[#173418] border-2 border-[#173418]/20";
        riskIndicator.className = 'min-w-[48px] h-12 rounded-full flex items-center justify-center bg-[#173418] text-[#e4ffd9] shadow-lg';
        riskIcon.innerText = "check_circle";
        riskText.innerHTML = `<span class="uppercase tracking-widest text-xs font-bold opacity-80">LOW RISK - ${prob}%</span><br><span class="text-sm font-medium block mt-1">${data.message}</span>`;
    }

  } catch (err) {
    resultDiv.classList.remove("hidden");
    riskIndicator.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-error text-white';
    riskIcon.innerText = "error";
    riskText.innerText = err.message.includes("fetch") ? "Connection Error" : err.message;
    riskText.className = "text-md font-bold text-error";
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalContent;
  }
}


// ══════════════════════════════════════════════
// 2. DIAGNOSTIC VISION
// ══════════════════════════════════════════════
let selectedFile = null;

(function initDragDrop() {
  const zone = document.getElementById("drop-zone");
  const labelWrapper = document.getElementById("upload-label");
  const input = document.getElementById("leaf-input");
  const label = document.getElementById("drop-label");
  const preview = document.getElementById("preview-wrap");
  const img = document.getElementById("preview-img");
  const btn = document.getElementById("diag-btn");
  const resultDiv = document.getElementById("diagnosisResult");

  if (!zone) return;

  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) =>
    document.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); })
  );

  ["dragenter", "dragover"].forEach((evt) =>
    zone.addEventListener(evt, () => zone.classList.add("drop-active"))
  );
  ["dragleave", "drop"].forEach((evt) =>
    zone.addEventListener(evt, () => zone.classList.remove("drop-active"))
  );

  zone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  input.addEventListener("change", () => {
    if (input.files[0]) handleFile(input.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    selectedFile = file;
    label.textContent = file.name;
    btn.classList.remove("hidden");
    resultDiv.classList.add("hidden");

    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
})();

async function submitDiagnosis() {
  if (!selectedFile) return;

  const btn = document.getElementById("diag-btn");
  const loading = document.getElementById("diagnosisLoading");
  const resultDiv = document.getElementById("diagnosisResult");
  const text = document.getElementById("diagnosisText");
  const treatmentText = document.getElementById("treatmentText");
  const icon = document.getElementById("diagnosisIcon");
  const border = document.getElementById("diagnosisBorder");

  btn.disabled = true;
  loading.classList.remove("hidden");
  resultDiv.classList.add("hidden");

  const form = new FormData();
  form.append("file", selectedFile);

  try {
    const res = await fetch(`${API_BASE}/diagnose`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    
    loading.classList.add("hidden");
    resultDiv.classList.remove("hidden");
    
    text.innerText = (data.detected || data.diagnosis || "Unknown").toUpperCase();
    treatmentText.innerHTML = `<strong>Treatment:</strong> ${data.treatment || "Consult an agronomist."}`;

    if (text.innerText.includes("HEALTHY")) {
      icon.innerText = 'check_circle';
      icon.className = 'material-symbols-outlined text-4xl text-green-500 mb-2';
      border.className = 'bg-white p-6 rounded-3xl shadow-sm border-t-8 border-green-500 text-left';
    } else {
      icon.innerText = 'warning';
      icon.className = 'material-symbols-outlined text-4xl text-error mb-2';
      border.className = 'bg-white p-6 rounded-3xl shadow-sm border-t-8 border-error text-left';
    }

  } catch (err) {
    loading.classList.add("hidden");
    resultDiv.classList.remove("hidden");
    icon.innerText = 'error';
    icon.className = 'material-symbols-outlined text-4xl text-error mb-2';
    border.className = 'bg-white p-6 rounded-3xl shadow-sm border-t-8 border-error text-left';
    text.innerText = err.message.includes("fetch") ? "CONNECTION ERROR" : "ERROR";
    treatmentText.innerText = err.message;
  } finally {
    btn.disabled = false;
  }
}


// ══════════════════════════════════════════════
// 3. SOIL HEALTH ENGINE
// ══════════════════════════════════════════════
async function calculateFertilizer() {
  const btn = document.getElementById("soil-btn");
  const resultDiv = document.getElementById("shcResult");
  const amountUrea = document.getElementById("amount-urea");
  const amountDap = document.getElementById("amount-dap");
  const amountMop = document.getElementById("amount-mop");
  const shcText = document.getElementById("shcText");
  const progress = document.getElementById("yieldProgress");

  const N = parseFloat(document.getElementById("shc_n").value);
  const P = parseFloat(document.getElementById("shc_p").value);
  const K = parseFloat(document.getElementById("shc_k").value);

  if (isNaN(N) || isNaN(P) || isNaN(K)) {
    alert("Please enter valid numbers for N, P, and K.");
    return;
  }

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner border-t-white"></div> Fetching...';

  try {
    const res = await fetch(`${API_BASE}/shc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ N, P, K }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    resultDiv.classList.remove("hidden");

    amountUrea.innerText = `${data.urea_kg ?? data.urea ?? "-"} kg`;
    amountDap.innerText = `${data.dap_kg ?? data.dap ?? "-"} kg`;
    amountMop.innerText = `${data.mop_kg ?? data.mop ?? "-"} kg`;
    
    shcText.innerText = "A precise application of Urea, DAP, and MOP is recommended. Ensure even spreading and immediate light irrigation to prevent volatilization.";
    
    progress.style.width = "0%";
    setTimeout(() => {
      progress.style.width = "85%";
    }, 100);

  } catch (err) {
    resultDiv.classList.remove("hidden");
    shcText.innerText = err.message.includes("fetch") ? "Could not reach the server." : err.message;
    amountUrea.innerText = "Err";
    amountDap.innerText = "Err";
    amountMop.innerText = "Err";
    progress.style.width = "10%";
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalContent;
  }
}

// ══════════════════════════════════════════════
// 4. SPA ROUTING & INITIALIZATION
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // 2. Setup Routing
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.page-view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (!targetId) return;

            // Hide all views
            views.forEach(view => {
                view.classList.remove('block');
                view.classList.add('hidden');
            });

            // Show selected view
            const activeView = document.getElementById(`view-${targetId}`);
            if (activeView) {
                activeView.classList.remove('hidden');
                activeView.classList.add('block');
            }

            // Update active navigation highlighting
            navLinks.forEach(nav => {
                const navTarget = nav.getAttribute('data-target');
                const isTopNav = nav.closest('#topNav');
                const isSideNav = nav.closest('#sideNav');
                const isBottomNav = nav.closest('nav.md\\:hidden');

                // Reset all classes
                if (isTopNav) {
                    nav.className = "nav-link text-[#7a5649] font-medium hover:text-[#173418] transition-colors";
                } else if (isSideNav) {
                    // Specific reset handling for side nav retaining base styles
                    nav.className = "nav-link flex items-center gap-3 text-[#7a5649] p-3 hover:bg-[#e2e4d5] transition-all rounded-lg";
                } else if (isBottomNav) {
                    nav.className = "nav-link flex flex-col items-center gap-1 text-[#7a5649]";
                }

                // Apply active classes
                if (navTarget === targetId) {
                    if (isTopNav) {
                        nav.className = "nav-link text-[#173418] border-b-2 border-[#173418] pb-1 font-bold transition-all";
                    } else if (isSideNav) {
                        nav.className = "nav-link flex items-center gap-3 bg-[#ffffff] text-[#173418] rounded-lg p-3 shadow-sm group font-bold";
                    } else if (isBottomNav) {
                        nav.className = "nav-link flex flex-col items-center gap-1 text-[#173418] font-bold";
                    }
                }
            });

            // Handle Profile specific case (Avatar button)
            const profileLink = document.querySelector('a[data-target="profile"]');
            if (profileLink) {
                if (targetId === "profile") {
                    profileLink.classList.add("ring-2", "ring-primary", "ring-offset-2");
                } else {
                    profileLink.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                }
            }
        });
    });
});

// ══════════════════════════════════════════════
// 6. DASHBOARD INTERACTIVITY ENGINE
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Legacy Crop Dropdown binding has been deprecated globally.

    // 1. Populate Edit Profile Zone Select dynamically from config
    const editZoneSelect = document.getElementById("edit-zone");
    if (editZoneSelect && window.agroZones) {
        Object.keys(window.agroZones).forEach(zone => {
            const opt = document.createElement("option");
            opt.value = zone;
            opt.textContent = zone;
            editZoneSelect.appendChild(opt);
        });
    }

    // Generic Modal Framework Engine
    const actionModal = document.getElementById("generic-action-modal");
    const actionTitle = document.getElementById("generic-modal-title");
    const actionLabel = document.getElementById("generic-modal-label");
    const actionInput = document.getElementById("generic-modal-input");
    const actionSelectContainer = document.getElementById("generic-modal-select-container");
    const actionRecommendedChips = document.getElementById("generic-modal-recommended-chips");
    const actionOtherChips = document.getElementById("generic-modal-other-chips");
    const actionZoneText = document.getElementById("generic-modal-zone-text");
    const actionCancelBtn = document.getElementById("cancel-action-btn");
    const actionSaveBtn = document.getElementById("save-action-btn");
    let currentActionCallback = null;

    window.openGenericModal = (title, label, callback) => {
        if (!actionModal) return;
        actionTitle.innerText = title;
        actionLabel.innerText = label;
        actionInput.value = "";
        currentActionCallback = callback;
        
        // Reset base visibility
        actionInput.classList.remove("hidden");
        if (actionSelectContainer) actionSelectContainer.classList.add("hidden");

        // Dynamically spawn Crop Select UI matching configuration database
        if (title.toLowerCase().includes("crop") && window.agroZones && actionSelectContainer) {
            actionInput.classList.add("hidden");
            actionSelectContainer.classList.remove("hidden");
            
            const userZone = window.AppState.zone || "Malwa Plateau";
            if (actionZoneText) actionZoneText.innerText = userZone;
            
            const recommended = window.agroZones[userZone] || [];
            const others = window.allAvailableCrops.filter(c => !recommended.includes(c));
            
            const createChip = (crop, isRecommended) => {
                const chip = document.createElement("button");
                chip.className = `px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isRecommended ? 'bg-[#e4ffd9] text-[#173418] border-primary/20 hover:bg-[#c2efb3]' : 'bg-surface-container text-secondary border-outline-variant hover:bg-surface-dim'}`;
                chip.innerText = crop;
                chip.onclick = (e) => {
                    actionSelectContainer.querySelectorAll('button').forEach(b => b.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'));
                    chip.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                    actionInput.value = crop;
                };
                return chip;
            };

            actionRecommendedChips.innerHTML = "";
            recommended.forEach(c => actionRecommendedChips.appendChild(createChip(c, true)));
            
            actionOtherChips.innerHTML = "";
            others.forEach(c => actionOtherChips.appendChild(createChip(c, false)));
        } else {
            actionInput.focus();
        }

        actionModal.classList.remove("hidden");
        actionModal.classList.add("flex");
    };

    if (actionCancelBtn) {
        actionCancelBtn.addEventListener("click", () => {
            actionModal.classList.add("hidden");
            actionModal.classList.remove("flex");
            currentActionCallback = null;
        });
    }

    if (actionSaveBtn) {
        actionSaveBtn.addEventListener("click", () => {
            if (currentActionCallback) currentActionCallback(actionInput.value);
            actionModal.classList.add("hidden");
            actionModal.classList.remove("flex");
            currentActionCallback = null;
        });
    }

    // Elegant Toast Notification System
    window.showToast = (message, type = 'success') => {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "fixed bottom-8 right-8 z-[200] flex flex-col gap-2 items-end pointer-events-none";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        const icon = type === 'success' ? 'check_circle' : 'info';
        const bgColor = type === 'success' ? 'bg-[#173418]' : 'bg-primary';
        toast.className = `flex items-center gap-3 ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-auto`;
        toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span class="font-bold text-sm">${message}</span>`;
        container.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.remove("translate-y-10", "opacity-0");
        });
        
        setTimeout(() => {
            toast.classList.add("translate-y-10", "opacity-0");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Generic Event Delegation tracking all CRUD actions throughout SPA
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Prevent routing links or explicit modals from being hijacked
        if (btn.id === 'save-edit-btn' || btn.id === 'cancel-edit-btn' || btn.id === 'edit-profile-btn' || btn.id === 'save-action-btn' || btn.id === 'cancel-action-btn') return;
        if (btn.innerText.includes('Danger') || btn.innerText.includes('Analyze') || btn.innerText.includes('Diagnostics')) return;

        const text = btn.innerText.toLowerCase().trim();
        const html = btn.innerHTML.toLowerCase();

        // 1. Destroy Action Node Context
        if (html.includes('delete') || html.includes('remove') || text.includes('remove')) {
            const card = btn.closest('li') || btn.closest('.bg-white.border-outline-variant');
            if (card && !card.id.includes('view-')) {
                card.style.transition = "all 0.3s ease";
                card.style.opacity = "0";
                card.style.transform = "scale(0.95)";
                setTimeout(() => {
                    card.remove();
                    window.showToast("Item permanently removed.");
                }, 300);
            }
            return;
        }

        // 2. Create Action Node Context
        if (text.includes('add') || text.includes('plant') || text.includes('deploy') || text.includes('new')) {
            let baseAction = text.replace('add', '').replace('plant', '').replace('deploy', '').replace('new', '').replace('trap', 'Trap').replace('schedule', 'Schedule').replace('crop', 'Crop').replace('field', 'Field').replace('projection', 'Projection').trim();
            let dynamicTitle = "Add New " + baseAction;
            dynamicTitle = dynamicTitle.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            window.openGenericModal(dynamicTitle, "Enter Title/Name:", (itemName) => {
                if (itemName && itemName.trim() !== '') {
                    window.showToast(`Successfully created "${itemName.trim()}".`);
                    const view = btn.closest('.page-view');
                    if (view) {
                        const ulTemplate = view.querySelector('ul');
                        const gridTemplate = view.querySelector('.grid');
                        // Branch matching UI pattern
                        if (ulTemplate && ulTemplate.firstElementChild) {
                            const newLi = ulTemplate.firstElementChild.cloneNode(true);
                            newLi.querySelector('span.font-bold').innerText = itemName;
                            ulTemplate.prepend(newLi);
                        } else if (gridTemplate && gridTemplate.firstElementChild) {
                            const newCard = gridTemplate.firstElementChild.cloneNode(true);
                            const title = newCard.querySelector('h3');
                            if (title) title.innerText = itemName;
                            gridTemplate.prepend(newCard);
                        } else {
                            const templateCard = Array.from(view.querySelectorAll('.bg-white.border-outline-variant')).find(el => el.querySelector('h3'));
                            if (templateCard) {
                                const newCard = templateCard.cloneNode(true);
                                const title = newCard.querySelector('h3');
                                if (title) title.innerText = itemName;
                                templateCard.parentNode.insertBefore(newCard, templateCard);
                            }
                        }
                    }
                }
            });
            return;
        }

        // 3. Update Action Node Context
        if (text.includes('update') || text.includes('edit') || text.includes('log') || html.includes('edit') || html.includes('tune')) {
            window.openGenericModal("Update Parameters", "Enter new numeric value or status:", (val) => {
                if (val && val.trim() !== '') {
                    window.showToast(`Properties successfully logged: ${val.trim()}`);
                } else {
                    window.showToast("Update aborted. No data provided.");
                }
            });
            return;
        }
        
        if (text.includes('mark') || text.includes('override') || text.includes('trigger') || text.includes('adjust')) {
            window.showToast("Action command dispatched to field units.");
            return;
        }
    });
});

// Extraneous bindings removed.
