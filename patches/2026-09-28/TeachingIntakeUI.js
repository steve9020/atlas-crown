'use strict';
/** TeachingIntakeUI — plain-object method mixin attached to the plugin prototype. */
module.exports = {
  // AXOL Teaching Intake UI binder. Frontend requests and displays only:
  // every interpretation (examiner, store, promotion) runs in the backend
  // through this.teachingIntake. Errors are shown honestly, never swallowed.
  bindTeachingIntakeUI(container) {
    if (!container) return;
    const bridge = this.teachingIntake;
    const esc = (s) => this.escapeHtml(String(s == null ? "" : s));
    const intakeRoot = container.querySelector('[data-teaching-panel="intake"]');
    if (!intakeRoot || intakeRoot.dataset.boundIntake === "true") return;
    intakeRoot.dataset.boundIntake = "true";

    const statusEl = intakeRoot.querySelector('[data-intake="form-status"]');
    const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
    const refreshAll = () => { this.renderIntakeQueue(container); this.renderIntakeFlyers(container); this.renderIntakeVersions(container); this.renderIntakeAudits(container); };

    if (!bridge) {
      setStatus("Teaching intake backend is not available in this session. The forms are disabled until the backend loads.");
      intakeRoot.querySelectorAll("form button[type=submit]").forEach((b) => { b.disabled = true; });
      return;
    }
    try {
      const info = bridge.examinerInfo();
      const bs = intakeRoot.querySelector('[data-intake="bridge-status"]');
      if (bs) bs.textContent = "examiner: " + info.nature + " · bar " + info.scoreBar;
    } catch (_) { /* non-fatal */ }

    // Kind switcher.
    intakeRoot.querySelectorAll("[data-intake-kind]").forEach((btn) => {
      btn.addEventListener("click", () => {
        intakeRoot.querySelectorAll("[data-intake-kind]").forEach((b) => b.classList.toggle("active", b === btn));
        const kind = btn.getAttribute("data-intake-kind");
        intakeRoot.querySelectorAll("[data-intake-form]").forEach((f) => f.classList.toggle("hidden", f.getAttribute("data-intake-form") !== kind));
      });
    });

    const lines = (v) => String(v || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

    const parseHeldOut = (v) => lines(v).map((line) => {
      const m = line.match(/^\s*([+\-−])\s*(.*)$/);
      if (!m) return { text: line, expect: "match" };
      return { text: m[2].trim(), expect: m[1] === "+" ? "match" : "no-match" };
    }).filter((h) => h.text);

    const parseVariants = (v) => lines(v).map((line) => {
      const m = line.match(/^\s*([^:]{1,24}):\s*(.+)$/);
      return m ? { form: m[1].trim(), text: m[2].trim() } : { form: "", text: line };
    });

    // Form submits → backend staging.
    intakeRoot.querySelectorAll("[data-intake-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const kind = form.getAttribute("data-intake-form");
        const val = (name) => { const el = form.querySelector(`[data-f="${name}"]`); return el ? el.value : ""; };
        try {
          const base = { type: kind, name: val("name"), definition: val("definition") };
          let data = base;
          if (kind === "axol-distinction") {
            data = Object.assign(base, {
              axis: val("axis"), phrases: lines(val("phrases")), regexPatterns: lines(val("regexPatterns")),
              negationBehavior: val("negationBehavior") || "flip", uncertaintyBehavior: val("uncertaintyBehavior") || "weaken",
              teachingExamples: { positives: lines(val("positives")), nonMatches: lines(val("nonMatches")) },
              heldOut: parseHeldOut(val("heldOut")),
            });
          } else if (kind === "language-construction") {
            data = Object.assign(base, { name: val("canonicalText").slice(0, 80) || "Untitled wording set",
              canonicalText: val("canonicalText"), targetAxis: val("targetAxis"), variants: parseVariants(val("variants")) });
          } else if (kind === "voice-pair") {
            data = Object.assign(base, { name: "Voice correction " + new Date().toLocaleDateString(),
              prompt: val("prompt"), weakResponse: val("weakResponse"), correctedResponse: val("correctedResponse"),
              whyBetter: val("whyBetter"), weakWords: val("weakWords") });
          }
          const c = bridge.createCandidate(data);
          setStatus("Staged: " + c.name + " (" + c.id + "). Find it in the Review Queue, then run the examiner.");
          form.reset();
          this.renderIntakeQueue(container);
          new Notice("Teaching staged. Review it in the Review Queue.");
        } catch (err) {
          setStatus("Could not stage: " + err.message);
        }
      });
    });

    // Audit button.
    const auditBtn = container.querySelector('[data-intake="run-audit"]');
    if (auditBtn && !auditBtn.dataset.boundIntake) {
      auditBtn.dataset.boundIntake = "true";
      auditBtn.addEventListener("click", () => {
        auditBtn.disabled = true; auditBtn.textContent = "Auditing…";
        try {
          const audit = bridge.runAudit(3);
          const failures = (audit.results || []).filter((r) => !r.pass);
          new Notice(failures.length ? "Audit found " + failures.length + " problem(s). See the Audits tab." : "Audit clean: " + audit.results.length + " past approval(s) re-examined.");
          this.renderIntakeAudits(container);
        } catch (err) { new Notice("Audit failed: " + err.message); }
        auditBtn.disabled = false; auditBtn.textContent = "Run a random audit now";
      });
    }

    refreshAll();
  },

  // -- Review Queue ---------------------------------------------------------
  renderIntakeQueue(container) {
    const bridge = this.teachingIntake;
    const list = container.querySelector('[data-intake="candidate-list"]');
    if (!list) return;
    const esc = (s) => this.escapeHtml(String(s == null ? "" : s));
    if (!bridge) { list.innerHTML = '<p class="atlas-muted-copy">Backend unavailable.</p>'; return; }
    let candidates = [];
    try { candidates = bridge.listCandidates({}); } catch (err) { list.innerHTML = '<p class="atlas-muted-copy">Could not load: ' + esc(err.message) + "</p>"; return; }
    const pending = candidates.filter((c) => c.status === "staged" || c.status === "examined" || c.status === "approved");
    const done = candidates.filter((c) => !["staged", "examined", "approved"].includes(c.status));
    const qc = container.querySelector('[data-intake="queue-count"]');
    if (qc) qc.textContent = pending.length + " awaiting review";

    const examHtml = (c) => {
      if (!c.examReport) return '<p class="atlas-muted-copy">Not examined yet.</p>';
      const r = c.examReport;
      const rows = Object.entries(r.breakdown || {}).map(([k, v]) => `<span class="atlas-intake-chip">${esc(k)} ${v.passed}/${v.total}</span>`).join("");
      const fails = (r.items || []).filter((i) => !i.pass && i.actual !== "skipped").slice(0, 4)
        .map((i) => `<li><b>${esc(i.category)}</b> — ${esc(i.actual)}${i.note ? " (" + esc(i.note) + ")" : ""}</li>`).join("");
      return `<div class="atlas-intake-exam"><b>Examiner blind score: ${r.score}/100</b> (${r.passed}/${r.total}) — bar is ${r.scoreBar}. ${r.meetsBar ? "Meets the bar." : "<b>BELOW THE BAR — promotion needs your explicit override.</b>"}<div class="atlas-intake-chips">${rows}</div>${fails ? "<ul>" + fails + "</ul>" : ""}<p class=\"atlas-muted-copy\">${esc(r.note || "")}</p></div>`;
    };

    const cardHtml = (c) => {
      const kindLabel = { "axol-distinction": "New distinction", "language-construction": "Same meaning, new words", "voice-pair": "Voice correction" }[c.type] || c.type;
      let detail = "";
      if (c.type === "axol-distinction") {
        detail = `<p><b>Axis:</b> ${esc(c.axis || "(not set)")} · <b>Phrases:</b> ${esc((c.phrases || []).join("; "))}</p><p>${esc(c.definition)}</p>`;
      } else if (c.type === "language-construction") {
        detail = `<p><b>Canonical:</b> ${esc(c.canonicalText)}</p><p><b>Variants:</b> ${(c.variants || []).map((v) => esc((v.form ? v.form + ": " : "") + v.text)).join(" · ")}</p>`;
      } else {
        detail = `<p><b>Weak:</b> ${esc(c.weakResponse)}</p><p><b>Corrected:</b> ${esc(c.correctedResponse)}</p><p><b>Why better:</b> ${esc(c.whyBetter)}</p>`;
      }
      let actions = "";
      if (c.status === "staged") actions = `<button class="primary" data-cand-action="examine" data-cand-id="${esc(c.id)}">Run examiner</button>`;
      if (c.status === "examined") actions = `<button class="primary" data-cand-action="approve" data-cand-id="${esc(c.id)}">Approve</button><button data-cand-action="reject" data-cand-id="${esc(c.id)}">Reject</button><button data-cand-action="examine" data-cand-id="${esc(c.id)}">Re-run examiner</button>`;
      if (c.status === "approved") actions = `<button class="primary" data-cand-action="promote" data-cand-id="${esc(c.id)}">Promote to keeper…</button><button data-cand-action="reject" data-cand-id="${esc(c.id)}">Reject instead</button>`;
      const stamp = c.status === "approved" ? '<span class="atlas-intake-chip atlas-intake-chip-warn">approved · awaiting promotion</span>' : "";
      const override = c.examReport && !c.examReport.meetsBar && c.status === "approved" ? '<span class="atlas-intake-chip atlas-intake-chip-warn">below-bar override will be recorded</span>' : "";
      return `<article class="atlas-intake-card" data-intake-card="${esc(c.id)}">
        <div class="atlas-card-header"><h4>${esc(c.name)}</h4><span>${esc(kindLabel)} · ${esc(c.status)}${c.source === "frequent-flyer" ? " · from a frequent flyer" : ""}</span></div>
        ${detail}${examHtml(c)}${stamp}${override}
        <div class="atlas-teaching-actions">${actions}</div>
      </article>`;
    };

    list.innerHTML = (pending.length ? pending.map(cardHtml).join("") : '<p class="atlas-muted-copy">Nothing awaiting review. Stage something from the Intake tab.</p>')
      + (done.length ? '<h3 class="atlas-intake-subhead">Decided</h3>' + done.slice(0, 20).map(cardHtml).join("") : "");

    list.querySelectorAll("[data-cand-action]").forEach((btn) => {
      if (btn.dataset.boundIntake) return; btn.dataset.boundIntake = "true";
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-cand-id");
        const action = btn.getAttribute("data-cand-action");
        try {
          if (action === "examine") {
            btn.disabled = true; btn.textContent = "Examining…";
            const report = bridge.examineCandidate(id);
            new Notice("Examiner score: " + report.score + "/100 (" + report.passed + "/" + report.total + ").");
          } else if (action === "approve") {
            let note = ""; try { note = window.prompt("Approve this candidate? Add a short note (optional):", "") || ""; } catch (e) { /* prompt() unsupported here — approve without a note */ }
            bridge.reviewCandidate(id, true, note);
            new Notice("Approved. You can promote it to the keeper when ready.");
          } else if (action === "reject") {
            let note = ""; try { note = window.prompt("Reject this candidate? Add a short note (optional):", "") || ""; } catch (e) { /* prompt() unsupported here — reject without a note */ }
            bridge.reviewCandidate(id, false, note);
            new Notice("Rejected. The candidate is kept for the record.");
          } else if (action === "promote") {
            const c = bridge.getCandidate(id);
            const belowBar = c.examReport && !c.examReport.meetsBar;
            let ok = true; try { ok = window.confirm("Promote \"" + c.name + "\" to the live keeper?\n\nThis writes to the real registry. Both stamps are recorded:\n• MACHINERY — proof suite re-runs now\n• MEANING — examiner " + (c.examReport ? c.examReport.score : "?") + "/100 + your approval" + (belowBar ? "\n\n⚠ BELOW THE EXAMINER BAR — your override will be recorded with the version forever." : "")); } catch (e) { /* confirm() unsupported here — the button click is the confirmation */ }
            if (!ok) return;
            btn.disabled = true; btn.textContent = "Promoting…";
            const version = bridge.promoteCandidate(id);
            new Notice("Promoted: keeper version " + version.version + ".");
            this.renderIntakeVersions(container);
          }
        } catch (err) { new Notice("Action failed: " + err.message); }
        this.renderIntakeQueue(container);
      });
    });
  },

  // -- Frequent Flyers ------------------------------------------------------
  renderIntakeFlyers(container) {
    const bridge = this.teachingIntake;
    const list = container.querySelector('[data-intake="flyer-list"]');
    const qlist = container.querySelector('[data-intake="quarantine-list"]');
    if (!list) return;
    const esc = (s) => this.escapeHtml(String(s == null ? "" : s));
    if (!bridge) { list.innerHTML = '<p class="atlas-muted-copy">Backend unavailable.</p>'; return; }
    let flyers = [];
    try { flyers = bridge.listFlyers({ limit: 100 }); } catch (err) { list.innerHTML = '<p class="atlas-muted-copy">Could not load: ' + esc(err.message) + "</p>"; return; }
    const qc = container.querySelector('[data-intake="flyer-count"]');
    if (qc) qc.textContent = flyers.length + " logged";
    list.innerHTML = flyers.length ? flyers.map((f) => `
      <article class="atlas-intake-card">
        <div class="atlas-card-header"><h4>×${f.count}</h4><span>${esc(new Date(f.firstSeen).toLocaleDateString())} → ${esc(new Date(f.lastSeen).toLocaleDateString())} · ${esc(f.status)}</span></div>
        <p>${esc(f.phrase)}</p>
        <div class="atlas-teaching-actions">
          <button class="primary" data-flyer-action="teach" data-flyer-id="${esc(f.id)}" data-flyer-phrase="${esc(f.phrase)}">Teach from this</button>
          <button data-flyer-action="archive" data-flyer-id="${esc(f.id)}">Archive</button>
        </div>
      </article>`).join("") : '<p class="atlas-muted-copy">No unknown phrases logged yet. When Atlas hears something it cannot place, it lands here.</p>';

    list.querySelectorAll("[data-flyer-action]").forEach((btn) => {
      if (btn.dataset.boundIntake) return; btn.dataset.boundIntake = "true";
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-flyer-id");
        const action = btn.getAttribute("data-flyer-action");
        try {
          if (action === "archive") {
            bridge.archiveFlyer(id);
            new Notice("Flyer archived (kept, not deleted).");
            this.renderIntakeFlyers(container);
          } else if (action === "teach") {
            const phrase = btn.getAttribute("data-flyer-phrase") || "";
            const c = bridge.promoteFlyerToCandidate(id);
            new Notice("Staged as a new distinction. Fill in the definition in the Review Queue.");
            // Pre-fill the intake form with the phrase so Steve can define it properly.
            const intakePanel = container.querySelector('[data-teaching-panel="intake"]');
            if (intakePanel) {
              const kindBtn = intakePanel.querySelector('[data-intake-kind="axol-distinction"]');
              if (kindBtn) kindBtn.click();
              const pos = intakePanel.querySelector('[data-intake-form="axol-distinction"] [data-f="positives"]');
              if (pos) pos.value = phrase;
              const nameEl = intakePanel.querySelector('[data-intake-form="axol-distinction"] [data-f="name"]');
              if (nameEl) nameEl.value = "From frequent flyer: " + phrase.slice(0, 50);
            }
            container.querySelectorAll(".atlas-auto-tabs button[data-tab]").forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab") === "intake"));
            container.querySelectorAll("[data-teaching-panel]").forEach((p) => p.classList.toggle("hidden", p.getAttribute("data-teaching-panel") !== "intake"));
          }
        } catch (err) { new Notice("Action failed: " + err.message); }
      });
    });

    if (qlist) {
      let q = [];
      try { q = bridge.listQuarantined(); } catch (_) { /* ignore */ }
      qlist.innerHTML = q.length ? q.slice(0, 50).map((x) => `
        <article class="atlas-intake-card atlas-intake-card-quarantine">
          <div class="atlas-card-header"><h4>×${x.count} quarantined</h4><span>${esc((x.scanFlags || []).join(", "))}</span></div>
          <p>${esc(x.phrase)}</p>
          <p class="atlas-muted-copy">Failed the injection scan before pool entry. Visible for review; never promotable.</p>
        </article>`).join("") : '<p class="atlas-muted-copy">Quarantine is empty.</p>';
    }
  },

  // -- Versions -------------------------------------------------------------
  renderIntakeVersions(container) {
    const bridge = this.teachingIntake;
    const list = container.querySelector('[data-intake="version-list"]');
    if (!list) return;
    const esc = (s) => this.escapeHtml(String(s == null ? "" : s));
    if (!bridge) { list.innerHTML = '<p class="atlas-muted-copy">Backend unavailable.</p>'; return; }
    let versions = [];
    try { versions = bridge.listVersions(); } catch (err) { list.innerHTML = '<p class="atlas-muted-copy">Could not load: ' + esc(err.message) + "</p>"; return; }
    const vc = container.querySelector('[data-intake="version-count"]');
    if (vc) vc.textContent = versions.length + " version(s)";
    list.innerHTML = versions.length ? versions.map((v) => {
      const s = v.stamps || {};
      const meaning = s.meaning || {};
      const machinery = s.machinery || {};
      const badge = v.status === "current" ? '<span class="atlas-intake-chip">current</span>'
        : v.status === "quarantined" ? '<span class="atlas-intake-chip atlas-intake-chip-warn">quarantined (study only)</span>'
        : v.status === "rolled-back" ? '<span class="atlas-intake-chip">rolled back</span>'
        : '<span class="atlas-intake-chip">' + esc(v.status) + "</span>";
      return `<article class="atlas-intake-card">
        <div class="atlas-card-header"><h4>Keeper v${v.version} — ${esc(v.candidateName || "")}</h4>${badge}</div>
        <p class="atlas-muted-copy">${esc(v.at ? new Date(v.at).toLocaleString() : "")} · ${(v.changelog || []).map(esc).join(" · ")}</p>
        <div class="atlas-intake-stamps">
          <div><b>MACHINERY</b> — AXOL regression ${esc(machinery.axolRegressionDetail || machinery.axolRegression || "?")} · full closure: ${esc(machinery.fullClosure || "?")}</div>
          <div><b>MEANING</b> — examiner ${meaning.examinerScore != null ? meaning.examinerScore + "/100" : "?"}${meaning.belowBarOverride ? " (below-bar override)" : ""} · approved by Steve ${esc(meaning.approvedAt ? new Date(meaning.approvedAt).toLocaleDateString() : "")}</div>
        </div>
        ${v.status !== "current" && v.status !== "rolled-back" ? `<div class="atlas-teaching-actions"><button data-version-action="rollback" data-version="${v.version}">Roll back to v${v.version}</button></div>` : ""}
      </article>`;
    }).join("") : '<p class="atlas-muted-copy">No promotions yet. Approved candidates become numbered keeper versions here.</p>';

    list.querySelectorAll("[data-version-action]").forEach((btn) => {
      if (btn.dataset.boundIntake) return; btn.dataset.boundIntake = "true";
      btn.addEventListener("click", () => {
        const vnum = parseInt(btn.getAttribute("data-version"), 10);
        let ok = true; try { ok = window.confirm("Roll back to keeper v" + vnum + "?\n\nThe current version will be quarantined for study (never deleted). The registry is restored from backups. This is one step and can be audited after."); } catch (e) { /* confirm() unsupported here — the button click is the confirmation */ }
        if (!ok) return;
        try {
          const r = bridge.rollbackTo(vnum);
          new Notice("Rolled back to v" + r.rolledBackTo + ".");
        } catch (err) { new Notice("Rollback failed: " + err.message); }
        this.renderIntakeVersions(container);
      });
    });
  },

  // -- Audits ---------------------------------------------------------------
  renderIntakeAudits(container) {
    const bridge = this.teachingIntake;
    const list = container.querySelector('[data-intake="audit-list"]');
    if (!list) return;
    const esc = (s) => this.escapeHtml(String(s == null ? "" : s));
    if (!bridge) { list.innerHTML = '<p class="atlas-muted-copy">Backend unavailable.</p>'; return; }
    let audits = [];
    try { audits = bridge.listAudits(); } catch (err) { list.innerHTML = '<p class="atlas-muted-copy">Could not load: ' + esc(err.message) + "</p>"; return; }
    const ac = container.querySelector('[data-intake="audit-count"]');
    if (ac) ac.textContent = audits.length + " audit(s)";
    list.innerHTML = audits.length ? audits.slice(0, 20).map((a) => {
      const fails = (a.results || []).filter((r) => !r.pass);
      return `<article class="atlas-intake-card${fails.length ? " atlas-intake-card-quarantine" : ""}">
        <div class="atlas-card-header"><h4>${esc(new Date(a.at).toLocaleString())}</h4><span>${(a.results || []).length} re-examined · ${fails.length} failed</span></div>
        ${(a.results || []).map((r) => `<p><b>${esc(r.candidateName)}</b> — ${r.pass ? "held up" : "<b>FAILED</b>"}${r.examReport ? " (score now " + r.examReport.score + "/100)" : ""}<br><span class="atlas-muted-copy">${(r.checks || []).map((c) => esc(c.name + ": " + c.detail)).join(" · ")}</span></p>`).join("")}
        ${fails.length ? '<p class="atlas-muted-copy">Failures return to Steve with the evidence above. Nothing was un-approved silently.</p>' : ""}
      </article>`;
    }).join("") : '<p class="atlas-muted-copy">No audits yet. Run one above — past approvals get re-examined with fresh blind tests.</p>';
  }

};
