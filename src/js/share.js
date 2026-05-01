const BASE_URL = (() => {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  return u.toString().replace(/\/$/, "");
})();

export function initShare() {
  const shareBtn = document.getElementById("share-btn");
  const modal = document.getElementById("share-modal");
  const closeBtn = document.getElementById("share-close-btn");
  const backdrop = modal?.querySelector(".share-backdrop");
  const nameInput = document.getElementById("share-name");
  const linkText = document.getElementById("share-link-text");
  const copyBtn = document.getElementById("share-copy-btn");
  const lineBtn = document.getElementById("share-line-btn");
  const fbBtn = document.getElementById("share-fb-btn");

  if (!shareBtn || !modal) return;

  function getLink() {
    const name = nameInput?.value.trim();
    return name ? `${BASE_URL}?to=${encodeURIComponent(name)}` : BASE_URL;
  }

  function updateLink() {
    const url = getLink();
    if (linkText) linkText.textContent = url;
    if (lineBtn)
      lineBtn.href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    if (fbBtn)
      fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  }

  function openModal() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    updateLink();
    setTimeout(() => nameInput?.focus(), 300);
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  shareBtn.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);
  nameInput?.addEventListener("input", updateLink);

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getLink());
      copyBtn.textContent = "คัดลอกแล้ว ✓";
      setTimeout(() => {
        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>คัดลอก`;
      }, 2000);
    } catch {
      copyBtn.textContent = "คัดลอกไม่สำเร็จ";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });
}
