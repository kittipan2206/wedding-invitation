export function initShare() {
  const btn = document.getElementById('share-btn');
  if (!btn) return;

  const shareData = {
    title: 'นนท์ & เมย์ — Wedding Invitation',
    text: 'ขอเรียนเชิญร่วมงานแต่งงาน นนท์ & เมย์ วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569',
    url: window.location.href,
  };

  btn.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) { /* user cancelled */ }
      return;
    }

    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('คัดลอกลิงก์แล้ว ✓');
    } catch (_) {
      showToast('ไม่สามารถคัดลอกได้');
    }
  });
}

function showToast(msg) {
  let toast = document.getElementById('share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'share-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}
