export function initCardExport() {
  const btn = document.getElementById('share-btn');
  if (!btn) return;

  // Scale canvas to fit viewport
  function scaleCard() {
    const canvas = document.querySelector('.card-canvas');
    if (!canvas) return;
    const scale = Math.min(
      (window.innerWidth - 32) / 1080,
      (window.innerHeight - 120) / 1080
    );
    canvas.style.transform = `scale(${Math.min(scale, 1)})`;
  }
  window.addEventListener('resize', scaleCard);
  scaleCard();

  btn.addEventListener('click', async () => {
    btn.textContent = 'กำลังสร้างภาพ…';
    btn.disabled = true;

    try {
      const canvas = document.querySelector('.card-canvas');
      // html2canvas loaded via CDN in card.html
      const c = await html2canvas(canvas, { scale: 2, useCORS: true, backgroundColor: null });
      c.toBlob(async blob => {
        const file = new File([blob], 'nont-may-wedding.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'นนท์ & เมย์ — Wedding Invitation' });
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'nont-may-wedding.png';
          a.click();
        }
        btn.textContent = 'บันทึก / แชร์การ์ด';
        btn.disabled = false;
      }, 'image/png');
    } catch (err) {
      console.error(err);
      btn.textContent = 'บันทึก / แชร์การ์ด';
      btn.disabled = false;
    }
  });
}
