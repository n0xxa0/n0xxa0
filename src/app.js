// ============================================================
// app.js — Logique principale du site
// ============================================================
// ✏️  CONFIGURE ICI (après avoir créé le projet Firebase) :
//
//   1. Va sur https://console.firebase.google.com
//   2. Crée un projet "mon-site-perso"
//   3. Active Firestore Database (mode test pour démarrer)
//   4. Dans Paramètres > Web, copie ta config Firebase ci-dessous
//   5. Change ADMIN_PASSWORD par un mot de passe solide
//   6. Configure EmailJS (voir instructions README.md)
// ============================================================

// ⚙️ CONFIG FIREBASE — remplace avec ta config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCEZyXLEI6nNSFqoFozvoERXeIMHd4UPDE",
  authDomain: "noxxao.firebaseapp.com",
  projectId: "noxxao",
  storageBucket: "noxxao.firebasestorage.app",
  messagingSenderId: "830478174424",
  appId: "1:830478174424:web:ec0c39899ef4c9ff68efad"
};

// ⚙️ MOT DE PASSE ADMIN
const ADMIN_PASSWORD = "Jango=<<33";

// ⚙️ EMAILJS — pour envoyer des notifs email (gratuit jusqu'à 200/mois)
// Inscris-toi sur emailjs.com, crée un service + template
const EMAILJS_CONFIG = {
  serviceId: "service_zhbrjvb",
  templateId: "template_u5m9dlm",
  publicKey: "D5QNcY2HR4jaW_LHJ"
};

// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc, orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db = null;
let isAdmin = false;

// ── Init Firebase ──────────────────────────────────────────
async function initFirebase() {
  try {
    if (FIREBASE_CONFIG.apiKey === "REMPLACE_PAR_TA_CLE") {
      console.warn("⚠️ Firebase non configuré. Mode démo activé.");
      loadDemoQuestions();
      return;
    }
    const app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    await loadQuestions();
  } catch (e) {
    console.error("Erreur Firebase:", e);
    loadDemoQuestions();
  }
}

// ── EmailJS ────────────────────────────────────────────────
async function sendNotificationEmail(to, name, question, answer) {
  if (EMAILJS_CONFIG.publicKey === "TA_CLE_PUBLIQUE") return;
  try {
    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      { to_email: to, to_name: name, question, answer },
      EMAILJS_CONFIG.publicKey
    );
  } catch (e) {
    console.error("Erreur EmailJS:", e);
  }
}

// ── Charger les questions ──────────────────────────────────
async function loadQuestions() {
  const list = document.getElementById("faqList");
  if (!db) return;
  try {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      list.innerHTML = '<p class="faq-empty">Pas encore de questions. Sois le premier ! 👇</p>';
      return;
    }
    const questions = [];
    snap.forEach(d => questions.push({ id: d.id, ...d.data() }));
    renderQuestions(questions, list);
    if (isAdmin) renderAdminQuestions(questions);
  } catch (e) {
    list.innerHTML = '<p class="faq-empty">Erreur de chargement.</p>';
  }
}

// ── Mode démo (sans Firebase) ──────────────────────────────
function loadDemoQuestions() {
  const list = document.getElementById("faqList");
  const demoData = [
    {
      id: "demo1",
      name: "Marie",
      question: "Comment tu as commencé dans le développement web ?",
      answer: "Tout a commencé avec un tutoriel HTML/CSS il y a 5 ans. Je me suis pris au jeu et je n'ai plus arrêté !",
      wantsNotif: false,
      createdAt: { seconds: Date.now() / 1000 - 86400 }
    },
    {
      id: "demo2",
      name: "Lucas",
      question: "Tu fais des collaborations ?",
      answer: null,
      wantsNotif: true,
      createdAt: { seconds: Date.now() / 1000 - 3600 }
    }
  ];
  renderQuestions(demoData, list);

  // Message démo
  const banner = document.createElement("div");
  banner.style.cssText = "background:rgba(200,240,74,0.1);border:1px solid rgba(200,240,74,0.3);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.85rem;color:#c8f04a;";
  banner.textContent = "⚡ Mode démo — Configure Firebase pour activer la base de données.";
  list.prepend(banner);
}

// ── Rendu des questions publiques ──────────────────────────
function renderQuestions(questions, container) {
  container.innerHTML = "";
  if (!questions.length) {
    container.innerHTML = '<p class="faq-empty">Pas encore de questions. Sois le premier ! 👇</p>';
    return;
  }
  questions.forEach((q, i) => {
    const date = q.createdAt?.seconds
      ? new Date(q.createdAt.seconds * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "Aujourd'hui";
    const initials = q.name.charAt(0).toUpperCase();

    const item = document.createElement("div");
    item.className = `faq-item${q.answer ? " answered" : ""} reveal`;
    item.style.transitionDelay = `${i * 0.07}s`;
    item.innerHTML = `
      <div class="faq-question">
        <div class="faq-q-avatar">${initials}</div>
        <div class="faq-q-body">
          <div class="faq-q-meta">
            <span class="faq-q-name">${escapeHtml(q.name)}</span>
            <span class="faq-q-date">${date}</span>
          </div>
          <p class="faq-q-text">${escapeHtml(q.question)}</p>
        </div>
      </div>
      ${q.answer
        ? `<div class="faq-answer"><span class="faq-a-label">Réponse</span><p class="faq-a-text">${escapeHtml(q.answer)}</p></div>`
        : `<div class="faq-pending">⏳ En attente de réponse…</div>`
      }
    `;
    container.appendChild(item);

    // Trigger reveal animation
    setTimeout(() => item.classList.add("visible"), 100 + i * 70);
  });
}

// ── Rendu panel admin ─────────────────────────────────────
function renderAdminQuestions(questions) {
  const container = document.getElementById("adminQuestions");
  if (!container) return;
  if (!questions.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">Aucune question pour l\'instant.</p>';
    return;
  }
  container.innerHTML = "";
  questions.forEach(q => {
    const date = q.createdAt?.seconds
      ? new Date(q.createdAt.seconds * 1000).toLocaleDateString("fr-FR")
      : "—";
    const item = document.createElement("div");
    item.className = "admin-q-item";
    item.id = `admin-q-${q.id}`;
    item.innerHTML = `
      <div class="admin-q-meta">
        <div>
          <span class="admin-q-who">${escapeHtml(q.name)}</span>
          ${q.email ? `<span class="admin-q-email"> · ${escapeHtml(q.email)}</span>` : ""}
          <span class="admin-q-email"> · ${date}</span>
        </div>
        ${q.wantsNotif ? '<span style="font-size:0.75rem;color:var(--accent)">📧 Veut une notif</span>' : ''}
      </div>
      <p class="admin-q-text">${escapeHtml(q.question)}</p>
      <div class="admin-answer-area">
        ${q.answer ? `<div class="admin-existing-answer">✅ Répondu : ${escapeHtml(q.answer)}</div>` : ""}
        <textarea rows="3" placeholder="Écrire une réponse…" id="ans-${q.id}">${q.answer || ""}</textarea>
        <div class="admin-answer-actions">
          <button class="btn-sm btn-answer" onclick="submitAnswer('${q.id}', '${escapeAttr(q.email)}', '${escapeAttr(q.name)}', '${escapeAttr(q.question)}', ${q.wantsNotif || false})">
            ${q.answer ? "✏️ Modifier" : "✅ Répondre"}
          </button>
          <button class="btn-sm btn-delete" onclick="deleteQuestion('${q.id}')">🗑 Supprimer</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

// ── Soumettre une question ─────────────────────────────────
async function submitQuestion() {
  const name = document.getElementById("askName").value.trim();
  const email = document.getElementById("askEmail").value.trim();
  const question = document.getElementById("askQuestion").value.trim();
  const wantsNotif = document.getElementById("askNotif").checked;
  const msgEl = document.getElementById("formMsg");
  const btn = document.getElementById("submitQuestion");

  if (!name || !email || !question) {
    showMsg(msgEl, "error", "Merci de remplir tous les champs.");
    return;
  }
  if (!isValidEmail(email)) {
    showMsg(msgEl, "error", "Adresse email invalide.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Envoi en cours…";

  if (!db) {
    // Mode démo
    setTimeout(() => {
      showMsg(msgEl, "success", "✅ Question envoyée ! (mode démo — configure Firebase pour la persistance)");
      resetForm();
      btn.disabled = false;
      btn.textContent = "Envoyer la question →";
    }, 1000);
    return;
  }

  try {
    await addDoc(collection(db, "questions"), {
      name, email, question, wantsNotif,
      answer: null,
      createdAt: serverTimestamp()
    });
    showMsg(msgEl, "success", "✅ Question envoyée ! Tu recevras un email quand je réponds.");
    resetForm();
    await loadQuestions();
  } catch (e) {
    showMsg(msgEl, "error", "Erreur lors de l'envoi. Réessaie.");
  }

  btn.disabled = false;
  btn.textContent = "Envoyer la question →";
}

// ── Répondre à une question (admin) ───────────────────────
window.submitAnswer = async function(id, email, name, question, wantsNotif) {
  const answer = document.getElementById(`ans-${id}`).value.trim();
  if (!answer) { alert("Écris une réponse d'abord."); return; }
  if (!db) { alert("Firebase non configuré."); return; }

  try {
    await updateDoc(doc(db, "questions", id), { answer });
    if (wantsNotif && email) {
      await sendNotificationEmail(email, name, question, answer);
    }
    await loadQuestions();
    alert("✅ Réponse publiée !");
    if (isAdmin) {
      const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const questions = [];
      snap.forEach(d => questions.push({ id: d.id, ...d.data() }));
      renderAdminQuestions(questions);
    }
  } catch (e) {
    alert("Erreur lors de la publication.");
  }
};

// ── Supprimer une question (admin) ────────────────────────
window.deleteQuestion = async function(id) {
  if (!confirm("Supprimer cette question ?")) return;
  if (!db) { alert("Firebase non configuré."); return; }
  try {
    await deleteDoc(doc(db, "questions", id));
    await loadQuestions();
    document.getElementById(`admin-q-${id}`)?.remove();
  } catch (e) {
    alert("Erreur lors de la suppression.");
  }
};

// ── Login admin ───────────────────────────────────────────
function loginAdmin() {
  const pass = document.getElementById("adminPass").value;
  const msg = document.getElementById("adminLoginMsg");
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    closeModal();
    document.getElementById("adminPanel").style.display = "block";
    loadQuestions(); // reload avec vue admin
    document.getElementById("adminPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    showMsg(msg, "error", "Mot de passe incorrect.");
  }
}

// ── Helpers ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function escapeAttr(str) {
  return String(str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function showMsg(el, type, msg) {
  el.textContent = msg;
  el.className = `form-msg ${type}`;
}
function resetForm() {
  document.getElementById("askName").value = "";
  document.getElementById("askEmail").value = "";
  document.getElementById("askQuestion").value = "";
  document.getElementById("charCount").textContent = "0 / 500";
}
function openModal() {
  document.getElementById("adminModal").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() {
  document.getElementById("adminModal").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
}

// ── DOM Ready ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Custom cursor
  const cursor = document.getElementById("cursor");
  const cursorDot = document.getElementById("cursorDot");
  let mx = -100, my = -100, cx = -100, cy = -100;
  document.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; });
  function animateCursor() {
    cx += (mx - cx) * 0.15;
    cy += (my - cy) * 0.15;
    cursor.style.left = cx + "px";
    cursor.style.top = cy + "px";
    cursorDot.style.left = mx + "px";
    cursorDot.style.top = my + "px";
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Nav scroll
  const nav = document.getElementById("nav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 50);
  });

  // Nav mobile toggle
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  toggle?.addEventListener("click", () => {
    toggle.classList.toggle("open");
    links.classList.toggle("open");
  });
  links?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    toggle.classList.remove("open");
    links.classList.remove("open");
  }));

  // Reveal on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

  // Char count
  document.getElementById("askQuestion")?.addEventListener("input", function() {
    document.getElementById("charCount").textContent = `${this.value.length} / 500`;
  });

  // Submit question
  document.getElementById("submitQuestion")?.addEventListener("click", submitQuestion);

  // Admin
  document.getElementById("adminTrigger")?.addEventListener("click", openModal);
  document.getElementById("cancelAdmin")?.addEventListener("click", closeModal);
  document.getElementById("modalOverlay")?.addEventListener("click", closeModal);
  document.getElementById("loginAdmin")?.addEventListener("click", loginAdmin);
  document.getElementById("adminPass")?.addEventListener("keydown", e => { if (e.key === "Enter") loginAdmin(); });
  document.getElementById("closeAdmin")?.addEventListener("click", () => {
    document.getElementById("adminPanel").style.display = "none";
    isAdmin = false;
  });

  // Init Firebase
  initFirebase();
});