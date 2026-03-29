// ──────────────────────────────────────────────
// Narmada Yield Phase II — Frontend Logic
// ──────────────────────────────────────────────
const API_BASE = "http://localhost:5005";

// ══════════════════════════════════════════════
// GLOBAL USER STATE
// ══════════════════════════════════════════════
window.userState = {
  name: "Advik",
  location: "Kothri Kalan, Madhya Pradesh",
  zone: "Central India",
  activeCrops: ["Soybean", "Wheat"]
};

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

  if (isNaN(temp) || isNaN(humidity) || isNaN(rainfall)) {
    alert("Please enter values for Temperature, Humidity, and Rainfall.");
    return;
  }

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner border-t-white"></div> CALCULATING...';

  try {
    const res = await fetch(`${API_BASE}/predict_risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        avg_temp_celsius: temp, 
        avg_humidity_percent: humidity, 
        avg_rainfall_mm: rainfall,
        zone: window.userState.zone || "Central India",
        active_crops: window.userState.activeCrops || []
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    resultDiv.classList.remove("hidden");

    const prob = data.risk_percentage ?? data.probability ?? data.risk ?? 0;
    const severity = data.severity_level ?? "Unknown Risk";
    const rec = data.recommendation ? `<br><span class="text-sm font-medium mt-1 block opacity-90">${data.recommendation}</span>` : "";
    
    // Regional Crops Evaluation Block
    const regionalCrops = data.regional_crops || [];
    let cropsHtml = `<div class="mt-4 mb-2 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
        <span class="text-sm font-bold text-secondary uppercase tracking-wide block mb-2">Viable Crops for ${window.userState.zone}</span>
        <div class="flex flex-wrap gap-2">
            ${regionalCrops.map(c => `<span class="bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-bold text-xs">${c}</span>`).join("")}
        </div>
    </div>`;

    let alertHtml = "";
    if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(a => {
            alertHtml += `<div class="mt-2 p-4 bg-error-container text-error rounded-xl text-sm font-bold border border-error">
                Warning: Conditions are optimal for ${a.disease} in regional ${a.crop} fields.<br>
                <span class="font-normal opacity-90 block mt-1">Treatment: ${a.treatment}</span>
            </div>`;
        });
        
        const pestContainer = document.getElementById("pest-alerts-container");
        if (pestContainer) {
            pestContainer.innerHTML = data.alerts.map(a => `
                <div class="bg-error-container p-6 rounded-2xl mb-4 border border-error">
                    <h4 class="text-xl font-black text-error mb-2">Regional Risk: ${a.disease} (${a.crop})</h4>
                    <p class="text-on-error-container font-medium">${a.treatment}</p>
                </div>
            `).join("");
        }
    } else {
        const pestContainer = document.getElementById("pest-alerts-container");
        if (pestContainer) {
            pestContainer.innerHTML = `<p class="text-secondary font-medium">No urgent weather-driven disease alerts detected.</p>`;
        }
    }

    riskText.innerHTML = `${severity} Risk - ${prob}%${rec}${cropsHtml}${alertHtml}`;

    if (severity === "High" || prob > 75) {
      riskIndicator.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-error text-white';
      riskIcon.innerText = "warning";
      riskText.className = "text-xl font-black text-error";
    } else if (severity === "Moderate" || (prob >= 40 && prob <= 75)) {
      riskIndicator.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-orange-500 text-white';
      riskIcon.innerText = "warning";
      riskText.className = "text-xl font-black text-orange-600";
    } else {
      riskIndicator.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-green-500 text-white';
      riskIcon.innerText = "check_circle";
      riskText.className = "text-xl font-black text-green-600";
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
    // 1. Hydrate User State
    const greeting = document.getElementById("greeting-name");
    if (greeting) greeting.innerText = `Hello, ${window.userState.name}`;

    const profileName = document.getElementById("profile-name");
    const profileLocation = document.getElementById("profile-location");
    const profileZone = document.getElementById("profile-zone");
    const profileCrops = document.getElementById("profile-crops");

    if (profileName) profileName.innerText = window.userState.name;
    if (profileLocation) profileLocation.innerText = window.userState.location;
    if (profileZone) profileZone.innerText = window.userState.zone;
    if (profileCrops) {
        profileCrops.innerHTML = window.userState.activeCrops.map(
            crop => `<span class="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-sm font-bold shadow-sm">${crop}</span>`
        ).join("");
    }

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
            
            const userZone = window.userState.zone || "Central India";
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

// ══════════════════════════════════════════════
// 5. PROFILE MANAGEMENT (Modals)
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById("edit-profile-btn");
    const modal = document.getElementById("edit-profile-modal");
    const cancelBtn = document.getElementById("cancel-edit-btn");
    const saveBtn = document.getElementById("save-edit-btn");

    if (editBtn && modal) {
        // Open Modal and Read Current State into Inputs
        editBtn.addEventListener("click", () => {
            document.getElementById("edit-name").value = window.userState.name;
            document.getElementById("edit-location").value = window.userState.location;
            document.getElementById("edit-zone").value = window.userState.zone;
            document.getElementById("edit-crops").value = window.userState.activeCrops.join(", ");
            
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        });

        // Close form (cancel)
        cancelBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        });

        // Save Form (write to state and hydrate DOM)
        saveBtn.addEventListener("click", () => {
            window.userState.name = document.getElementById("edit-name").value;
            window.userState.location = document.getElementById("edit-location").value;
            window.userState.zone = document.getElementById("edit-zone").value;
            const newCrops = document.getElementById("edit-crops").value.split(",").map(c => c.trim()).filter(c => c);
            if(newCrops.length > 0) window.userState.activeCrops = newCrops;

            // Re-render UI Elements reflecting the new State instantly
            const greeting = document.getElementById("greeting-name");
            if (greeting) greeting.innerText = `Hello, ${window.userState.name}`;

            const profileName = document.getElementById("profile-name");
            const profileLocation = document.getElementById("profile-location");
            const profileZone = document.getElementById("profile-zone");
            const profileCrops = document.getElementById("profile-crops");

            if (profileName) profileName.innerText = window.userState.name;
            if (profileLocation) profileLocation.innerText = window.userState.location;
            if (profileZone) profileZone.innerText = window.userState.zone;
            if (profileCrops) {
                profileCrops.innerHTML = window.userState.activeCrops.map(
                    crop => `<span class="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-sm font-bold shadow-sm">${crop}</span>`
                ).join("");
            }

            modal.classList.add("hidden");
            modal.classList.remove("flex");
        });
    }
});
