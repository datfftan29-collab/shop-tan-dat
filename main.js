/* =========================================================
   SHOP TẤN ĐẠT — MAIN.JS
   ========================================================= */
'use strict';

/* =========================================================
   ⚙️ CẤU HÌNH TELEGRAM
   ========================================================= */
const TELEGRAM_BOT_TOKEN = '8290012420:AAE4H0V9qqC_nLGLV-tpSnFgSJhEYVuc1N0';
const TELEGRAM_CHAT_ID   = '7166493375';

/* =========================================================
   📊 CẤU HÌNH GOOGLE SHEETS
   ========================================================= */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxLsj-LJsa1QLirwBNZEtzMJ7dFsZ6NsC8GUreNQpG8KFd2aNYVbTQ5tObTlEu-v2E/exec';

async function sendToSheet(data) {
  if (!SHEET_API_URL) return { ok: false };
  try {
    const formData = new URLSearchParams();
    for (const key in data) formData.append(key, data[key] || '');
    await fetch(SHEET_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    console.log('✅ Đã gửi lên Google Sheets:', data);
    return { ok: true };
  } catch (err) {
    console.error('❌ Lỗi gửi Sheets:', err);
    return { ok: false, error: err.message };
  }
}

/* =========================================================
   0. HELPERS
   ========================================================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function formatVND(n) {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

let toastTimer = null;
function showToast(msg, type = 'success', duration = 2600) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* =========================================================
   🔐 AUTH — chỉ Google
   ========================================================= */
const STORAGE_USERS    = 'shopUsers';
const STORAGE_CURRENT  = 'shopCurrentUser';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]'); }
  catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_CURRENT) || 'null'); }
  catch { return null; }
}
function setCurrentUser(user) {
  if (user) localStorage.setItem(STORAGE_CURRENT, JSON.stringify(user));
  else      localStorage.removeItem(STORAGE_CURRENT);
}
function updateUserUI() {
  const userBox  = $('#userBox');
  const userName = $('#userName');
  if (!userBox || !userName) return;
  const user = getCurrentUser();
  if (user) {
    userName.textContent = user.name;
    userBox.classList.remove('hidden');
  } else {
    userBox.classList.add('hidden');
  }
}

/* =========================================================
   🔔 NOTIFY POPUP
   ========================================================= */
function showSuccessPopup(title, text) {
  const popup = $('#successPopup');
  const titleEl = $('#successTitle');
  const textEl = $('#successText');
  if (!popup) return;
  if (titleEl) titleEl.textContent = title || 'Thông báo';
  if (textEl) textEl.textContent = text || 'SHOP TẤN ĐẠT';
  popup.classList.remove('hidden');
}
function closeSuccessPopup() {
  const popup = $('#successPopup');
  if (popup) popup.classList.add('hidden');
}
function handleNotifyOk() { closeSuccessPopup(); }
function handleNotifyLater() {
  closeSuccessPopup();
  try { localStorage.setItem('notifySnoozeUntil', String(Date.now() + 60 * 60 * 1000)); } catch {}
}

(function initAuth() {
  const authModal    = $('#authModal');
  const logoutBtn    = $('#logoutBtn');
  const successClose = $('#successClose');
  const successPopup = $('#successPopup');

  if (!authModal) return;

  const user = getCurrentUser();
  if (!user) {
    authModal.classList.remove('hidden');
  } else {
    authModal.classList.add('hidden');
    updateUserUI();
  }

  logoutBtn?.addEventListener('click', () => {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
    setCurrentUser(null);
    updateUserUI();
    authModal.classList.remove('hidden');
  });

  $('#notifyOk')?.addEventListener('click', handleNotifyOk);
  $('#notifyLater')?.addEventListener('click', handleNotifyLater);
  successClose?.addEventListener('click', closeSuccessPopup);

  successPopup?.addEventListener('click', (e) => {
    if (e.target === successPopup) closeSuccessPopup();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !successPopup?.classList.contains('hidden')) {
      closeSuccessPopup();
    }
  });
})();

/* =========================================================
   📤 GỬI ĐƠN + ẢNH THANH TOÁN QUA TELEGRAM
   ========================================================= */
async function sendPhotoToTelegram(file, orderData) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { ok: false, error: 'missing_config' };
  if (!file) return { ok: false, error: 'no_file' };

  const now = new Date();
  const timeStr = now.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const currentUser = getCurrentUser();
  const userInfo = currentUser
    ? `👤 <b>Tài khoản:</b> ${currentUser.name}\n`
    : '';

  const caption =
    `🛒 <b>ĐƠN HÀNG MỚI</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>Sản phẩm:</b> ${orderData.productName}\n` +
    `⏱️ <b>Thời hạn:</b> ${orderData.duration}\n` +
    `💵 <b>Đơn giá:</b> ${formatVND(orderData.price)}\n` +
    (orderData.link ? `🔗 <b>Link:</b> ${orderData.link}\n` : '') +
    (orderData.qty  ? `🔢 <b>Số lượng:</b> ${orderData.qty}\n` : '') +
    `💰 <b>Số tiền:</b> ${formatVND(orderData.price)}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    userInfo +
    `📞 <b>Người nhận:</b> ${orderData.buyerName}\n` +
    `📱 <b>SĐT:</b> ${orderData.phone}\n` +
    `💳 <b>Thanh toán:</b> ${orderData.method}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `⏰ ${timeStr}`;

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('photo', file);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    if (data.ok) { console.log('✅ Đã gửi đơn + ảnh qua Telegram'); return { ok: true }; }
    return { ok: false, error: data.description || 'unknown' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* =========================================================
   1. NĂM HIỆN TẠI
   ========================================================= */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================================================
   2. SNOW EFFECT
   ========================================================= */
(function initSnow() {
  const field = $('#snowField');
  if (!field) return;
  const total = window.innerWidth < 768 ? 80 : 200;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < total; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = '❄';
    flake.style.left = Math.random() * 100 + 'vw';
    flake.style.fontSize = (Math.random() * 10 + 6) + 'px';
    flake.style.opacity = (Math.random() * 0.5 + 0.35).toFixed(2);
    flake.style.animationDuration = (Math.random() * 5 + 6) + 's';
    flake.style.animationDelay = (-Math.random() * 10) + 's';
    flake.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
    frag.appendChild(flake);
  }
  field.appendChild(frag);
})();

/* =========================================================
   3. MUSIC PLAYER
   ========================================================= */
(function initMusic() {
  const audio       = $('#bgMusic');
  const playPause   = $('#playPauseBtn');
  const prevBtn     = $('#prevBtn');
  const nextBtn     = $('#nextBtn');
  const progressBar = $('#progressBar');
  const volumeSldr  = $('#volumeSlider');
  const widget      = $('#musicWidget');
  const disc        = $('#musicDisc');
  const trackTitle  = $('#trackTitle');
  const trackArtist = $('#trackArtist');
  const playlistEl  = $('#playlist');
  const toggleBtn   = $('#musicToggle');

  if (!audio || !widget) return;

  const PLAYLIST = [
    { title: 'Parada', artist: 'Shop Tấn Đạt', src: 'parada.mp3' },
    { title: 'Nhạc Đóa quỳnh lan', artist: 'Shop Tấn Đạt', src: 'doaquynhlan.mp3' },
    { title: 'Nhạc Ngày mình chia tay', artist: 'Shop Tấn Đạt', src: 'ngayminhctay.mp3' },
    { title: 'Nhạc Hai ta không xứng', artist: 'Shop Tấn Đạt', src: 'thuongnhaudenthe.mp3' },
    { title: 'Nhạc Thương phận hồng nhan', artist: 'Shop Tấn Đạt', src: 'thuongphanhongnhan.mp3' }
  ];

  let currentIndex = 0;
  let isDraggingProgress = false;

  function renderPlaylist() {
    if (!playlistEl) return;
    playlistEl.innerHTML = '';
    PLAYLIST.forEach((song, i) => {
      const div = document.createElement('div');
      div.className = 'track' + (i === currentIndex ? ' active' : '');
      div.textContent = `${i + 1}. ${song.title} — ${song.artist}`;
      div.dataset.index = i;
      playlistEl.appendChild(div);
    });
  }

  function loadTrack(index, autoPlay = false) {
    if (!PLAYLIST.length) return;
    if (index < 0) index = PLAYLIST.length - 1;
    if (index >= PLAYLIST.length) index = 0;
    currentIndex = index;
    const song = PLAYLIST[index];
    trackTitle.textContent  = song.title;
    trackArtist.textContent = song.artist;
    audio.src = song.src;
    audio.load();
    renderPlaylist();
    if (autoPlay) {
      audio.play().then(() => setPlayingUI(true)).catch(() => setPlayingUI(false));
    }
  }

  function setPlayingUI(playing) {
    playPause.textContent = playing ? '⏸' : '▶';
    disc.classList.toggle('playing', playing);
  }

  playPause.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => setPlayingUI(true)).catch(() => {});
    } else {
      audio.pause();
      setPlayingUI(false);
    }
  });

  prevBtn.addEventListener('click', () => loadTrack(currentIndex - 1, true));
  nextBtn.addEventListener('click', () => loadTrack(currentIndex + 1, true));
  audio.addEventListener('ended', () => loadTrack(currentIndex + 1, true));
  audio.addEventListener('play',  () => setPlayingUI(true));
  audio.addEventListener('pause', () => setPlayingUI(false));

  audio.addEventListener('timeupdate', () => {
    if (isDraggingProgress) return;
    if (!audio.duration) return;
    progressBar.value = (audio.currentTime / audio.duration) * 100;
  });

  progressBar.addEventListener('input', () => { isDraggingProgress = true; });
  progressBar.addEventListener('change', () => {
    if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
    isDraggingProgress = false;
  });

  audio.volume = parseFloat(volumeSldr.value) || 0.7;
  volumeSldr.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
  });

  playlistEl?.addEventListener('click', (e) => {
    const track = e.target.closest('.track');
    if (!track) return;
    loadTrack(Number(track.dataset.index), true);
  });

  toggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    widget.classList.toggle('open');
    toggleBtn.textContent = widget.classList.contains('open') ? '⌄' : '⌃';
  });

  renderPlaylist();
  loadTrack(3, false);

  /* NHẠC CHỈ PHÁT KHI INTRO ĐÓNG */
  function isIntroOpen() {
    const intro = document.getElementById('videoIntro');
    return intro && !intro.classList.contains('hidden');
  }

  let autoplayTried = false;

  function tryAutoplayOnce() {
    if (autoplayTried) return;
    if (isIntroOpen()) {
      console.log('ℹ️ Intro đang hiện → chờ intro xong mới phát nhạc');
      return;
    }
    autoplayTried = true;
    if (audio.paused) {
      audio.play()
        .then(() => setPlayingUI(true))
        .catch(() => { autoplayTried = false; });
    }
    document.removeEventListener('click', tryAutoplayOnce);
    document.removeEventListener('touchstart', tryAutoplayOnce);
    document.removeEventListener('keydown', tryAutoplayOnce);
    document.removeEventListener('scroll', tryAutoplayOnce);
  }

  document.addEventListener('click', tryAutoplayOnce);
  document.addEventListener('touchstart', tryAutoplayOnce, { passive: true });
  document.addEventListener('keydown', tryAutoplayOnce);
  document.addEventListener('scroll', tryAutoplayOnce, { passive: true });

  document.addEventListener('introClosed', () => {
    console.log('🎵 Intro đã đóng → phát nhạc nền');
    autoplayTried = false;
    if (audio.paused) {
      audio.play()
        .then(() => setPlayingUI(true))
        .catch(err => console.warn('Không phát được nhạc:', err));
    }
  });
})();

/* =========================================================
   4. DRAG MUSIC WIDGET
   ========================================================= */
(function initDrag() {
  const widget = $('#musicWidget');
  if (!widget) return;
  let isDragging = false, offsetX = 0, offsetY = 0;

  function startDrag(clientX, clientY, target) {
    if (target.closest('button, input, .playlist, .track')) return;
    const rect = widget.getBoundingClientRect();
    widget.style.left = rect.left + 'px';
    widget.style.top = rect.top + 'px';
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
    isDragging = true;
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
  }
  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    let newLeft = clientX - offsetX;
    let newTop  = clientY - offsetY;
    const maxLeft = window.innerWidth  - widget.offsetWidth;
    const maxTop  = window.innerHeight - widget.offsetHeight;
    widget.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
    widget.style.top  = Math.max(0, Math.min(newTop,  maxTop))  + 'px';
  }
  function endDrag() { isDragging = false; }

  widget.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY, e.target));
  document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', endDrag);

  widget.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY, e.target);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchend', endDrag);
})();

/* =========================================================
   5. COPY TO CLIPBOARD
   ========================================================= */
$$('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    if (!text) return;
    const originalText = btn.textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      btn.textContent = '✅ Đã sao chép';
      showToast('Đã sao chép: ' + text);
      setTimeout(() => { btn.textContent = originalText; }, 1600);
    } catch (err) {
      showToast('Không sao chép được.', 'error');
    }
  });
});

/* =========================================================
   6. QR MODAL
   ========================================================= */
(function initQrModal() {
  const qrModal  = $('#qrModal');
  const qrViewer = $('#qrViewer');
  const closeQr  = $('#closeQr');
  if (!qrModal || !qrViewer || !closeQr) return;

  $$('[data-qr]').forEach(btn => {
    btn.addEventListener('click', () => {
      qrViewer.src = btn.dataset.qr;
      qrModal.classList.remove('hidden');
    });
  });
  closeQr.addEventListener('click', () => qrModal.classList.add('hidden'));
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !qrModal.classList.contains('hidden')) {
      qrModal.classList.add('hidden');
    }
  });
})();

/* =========================================================
   7. CHECKOUT MODAL
   ========================================================= */
(function initCheckout() {
  const modal         = $('#checkoutModal');
  const closeBtn      = $('#closeModal');
  const cancelBtn     = $('#cancelBtn');
  const form          = $('#orderForm');
  const orderSummary  = $('#orderSummary');
  const paymentBox    = $('#paymentDetails');
  const qrImage       = $('#checkoutQr');
  const bankBtn       = $('#bankBtn');
  const vietinbankBtn = $('#vietinbankBtn');
  const bankAccEl     = $('#bankAcc');
  const bankNameEl    = $('#bankName');
  const bankOwnerEl   = $('#bankOwner');
  const copyAccBtn    = $('#copyAcc');
  const confirmBtn    = $('#confirmBtn');

  const extraFields = $('#serviceExtraFields');
  const extraLink   = $('#extraLink');
  const extraQty    = $('#extraQty');

  const paymentProof = $('#paymentProof');
  const previewWrap  = $('#previewWrap');
  const previewImg   = $('#previewImg');
  const removeImg    = $('#removeImg');

  if (!modal || !form) return;

  const ACCOUNTS = {
    bank: { name: 'Vietcombank', acc: '2345085074', owner: 'Nguyễn Tấn Đạt', qr: '45.jpg' },
    vietinbank: { name: 'VietinBank', acc: '107888416084', owner: 'Nguyễn Tấn Đạt', qr: 'images/qrvtb.jpg' }
  };

  let currentProduct = null;
  let currentMethod  = 'bank';
  let extraServiceInfo = null;

  function hideExtraFields() {
    if (extraFields) extraFields.classList.add('hidden');
    if (extraLink)   extraLink.value = '';
    if (extraQty)    extraQty.value  = 1000;
    const el = document.getElementById('extraTotal');
    if (el) el.textContent = '0đ';
    extraServiceInfo = null;
  }

  function showExtraFields(unit, pricePer1000) {
    if (!extraFields) return;
    extraFields.classList.remove('hidden');
    if (extraLink) extraLink.value = '';
    if (extraQty)  extraQty.value  = 1000;
    extraServiceInfo = { unit, pricePer1000 };

    function recalc() {
      if (!currentProduct || !extraServiceInfo) return;
      const qty = Number(extraQty.value) || 0;
      const total = (qty / 1000) * extraServiceInfo.pricePer1000;
      currentProduct.price = total;
      currentProduct.duration = qty.toLocaleString('vi-VN') +
        (extraServiceInfo.unit ? ' ' + extraServiceInfo.unit : '');
      renderSummary();
      const el = document.getElementById('extraTotal');
      if (el) el.textContent = total.toLocaleString('vi-VN') + 'đ';
    }
    if (extraQty) extraQty.oninput = recalc;
    recalc();
  }

  if (paymentProof) {
    paymentProof.addEventListener('change', () => {
      const file = paymentProof.files[0];
      if (!file) { previewWrap?.classList.add('hidden'); return; }
      if (!file.type.startsWith('image/')) {
        showToast('⚠️ Vui lòng chọn file ảnh.', 'error');
        paymentProof.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ Ảnh quá lớn (tối đa 5MB).', 'error');
        paymentProof.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (previewImg) previewImg.src = ev.target.result;
        previewWrap?.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }

  removeImg?.addEventListener('click', () => {
    if (paymentProof) paymentProof.value = '';
    previewWrap?.classList.add('hidden');
    if (previewImg) previewImg.src = '';
  });

  $$('.pkg-btn').forEach(btn => {
    if (btn.classList.contains('order-now-btn')) return;
    btn.addEventListener('click', () => {
      const parent = btn.closest('.packages');
      parent?.querySelectorAll('.pkg-btn').forEach(b => {
        b.classList.remove('active', 'purple', 'green');
      });
      btn.classList.add('active');

      const card = btn.closest('.product-card');
      if (card?.classList.contains('purple-card')) btn.classList.add('purple');
      if (card?.classList.contains('green-card'))  btn.classList.add('green');

      currentProduct = {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: Number(btn.dataset.price),
        duration: btn.dataset.duration
      };
      hideExtraFields();
      renderSummary();
      setMethod('bank');

      const user = getCurrentUser();
      if (user) {
        if (form.buyerName) form.buyerName.value = user.name;
        if (form.phone && !user.phone.startsWith('google_')) {
          form.phone.value = user.phone;
        }
      }
      modal.classList.remove('hidden');
    });
  });

  $$('.order-now-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const serviceForm = btn.closest('.service-form');
      if (!serviceForm) return;

      const pricePer1000 = Number(serviceForm.dataset.price) || 0;
      const serviceName  = btn.dataset.name || 'Dịch vụ';
      const unit         = btn.dataset.unit || '';

      currentProduct = {
        id: 'svc-' + Date.now(),
        name: serviceName,
        price: pricePer1000,
        duration: '1.000' + (unit ? ' ' + unit : '')
      };
      renderSummary();
      setMethod('bank');

      const user = getCurrentUser();
      if (user) {
        if (form.buyerName) form.buyerName.value = user.name;
        if (form.phone && !user.phone.startsWith('google_')) {
          form.phone.value = user.phone;
        }
      }
      modal.classList.remove('hidden');
      showExtraFields(unit, pricePer1000);
    });
  });

  function renderSummary() {
    if (!currentProduct) return;
    orderSummary.innerHTML = '';
    const rows = [
      ['Sản phẩm', currentProduct.name],
      ['Thời hạn', currentProduct.duration],
      ['Đơn giá',  formatVND(currentProduct.price)]
    ];
    rows.forEach(([k, v]) => {
      const p = document.createElement('p');
      const kSpan = document.createElement('span');
      kSpan.textContent = k + ': ';
      kSpan.style.color = '#9a9aaa';
      const vStrong = document.createElement('strong');
      vStrong.textContent = v;
      p.appendChild(kSpan);
      p.appendChild(vStrong);
      orderSummary.appendChild(p);
    });
  }

  function setMethod(method) {
    currentMethod = method;
    bankBtn.classList.toggle('active', method === 'bank');
    vietinbankBtn.classList.toggle('active', method === 'vietinbank');
    const info = ACCOUNTS[method];
    bankNameEl.textContent  = info.name;
    bankAccEl.textContent   = info.acc;
    bankOwnerEl.textContent = info.owner;
    qrImage.src             = info.qr;
    copyAccBtn.dataset.copy = info.acc;
    paymentBox.innerHTML = '';
    const p1 = document.createElement('p'); p1.textContent = `Ngân hàng/Ví: ${info.name}`;
    const p2 = document.createElement('p'); p2.textContent = `Số TK: ${info.acc}`;
    const p3 = document.createElement('p'); p3.textContent = `Chủ TK: ${info.owner}`;
    paymentBox.append(p1, p2, p3);
  }

  bankBtn.addEventListener('click', () => setMethod('bank'));
  vietinbankBtn.addEventListener('click', () => setMethod('vietinbank'));

  function closeModal() {
    modal.classList.add('hidden');
    form.reset();
    paymentBox.innerHTML = '';
    currentProduct = null;
    hideExtraFields();
    if (paymentProof) paymentProof.value = '';
    previewWrap?.classList.add('hidden');
    if (previewImg) previewImg.src = '';
  }
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = form.buyerName.value.trim();
    const phone = form.phone.value.trim();
    let   extraLinkValue = '';
    let   extraQtyValue  = '';

    if (name.length < 2) {
      showToast('⚠️ Vui lòng nhập họ tên đầy đủ.', 'error');
      form.buyerName.focus();
      return;
    }
    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
      showToast('⚠️ Số điện thoại không hợp lệ.', 'error');
      form.phone.focus();
      return;
    }
    if (!currentProduct) {
      showToast('Vui lòng chọn gói dịch vụ.', 'error');
      return;
    }

    const fileInput = document.getElementById('paymentProof');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('⚠️ Vui lòng tải ảnh thanh toán lên trước.', 'error');
      fileInput?.focus();
      return;
    }
    const proofFile = fileInput.files[0];

    if (extraServiceInfo) {
      const link = (extraLink?.value || '').trim();
      const qty  = Number(extraQty?.value) || 0;
      if (!link) {
        showToast('⚠️ Vui lòng nhập link video/bài viết.', 'error');
        extraLink?.focus();
        return;
      }
      if (qty < 1) {
        showToast('⚠️ Vui lòng nhập số lượng hợp lệ.', 'error');
        extraQty?.focus();
        return;
      }
      extraLinkValue = link;
      const unitTxt = extraServiceInfo.unit ? ' ' + extraServiceInfo.unit : '';
      extraQtyValue = qty.toLocaleString('vi-VN') + unitTxt;
    }

    const info = ACCOUNTS[currentMethod];
    const orderData = {
      productName: currentProduct.name,
      duration:    currentProduct.duration,
      price:       currentProduct.price,
      buyerName:   name,
      phone:       phone,
      method:      info.name,
      note:        '',
      link:        extraLinkValue,
      qty:         extraQtyValue
    };

    const originalBtnText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Đang gửi...';

    const photoResult = await sendPhotoToTelegram(proofFile, orderData);

    confirmBtn.disabled = false;
    confirmBtn.textContent = originalBtnText;

    if (photoResult.ok) {
      saveOrderToHistory(orderData);
      showToast('✅ Đã gửi đơn thành công! Tấn Đạt sẽ liên hệ sớm.');
      setTimeout(() => closeModal(), 1500);
    } else {
      showToast('❌ Không gửi được đơn. Vui lòng liên hệ Zalo: 0345085074', 'error', 4000);
      setTimeout(() => closeModal(), 2000);
    }
  });
})();

/* =========================================================
   8. SCROLL REVEAL
   ========================================================= */
(function initReveal() {
  const els = $$('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => { el.style.opacity = 1; });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.style.opacity = 1;
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => {
    el.style.opacity = 0;
    el.style.animation = 'none';
    io.observe(el);
  });
})();

/* =========================================================
   9. SMOOTH SCROLL
   ========================================================= */
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href');
  if (id === '#' || id.length < 2) return;
  const target = document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* =========================================================
   🔥 HEADER SCROLL EFFECT
   ========================================================= */
(function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  function handleScroll() {
    const y = window.pageYOffset || document.documentElement.scrollTop;
    header.classList.toggle('scrolled', y > 50);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
})();

/* =========================================================
   📜 LỊCH SỬ MUA HÀNG
   ========================================================= */
const HISTORY_KEY_PREFIX = 'orderHistory_';
const HISTORY_MAX = 20;

function getHistoryKey() {
  const user = getCurrentUser();
  if (!user) return null;
  return HISTORY_KEY_PREFIX + user.phone;
}
function getOrderHistory() {
  const key = getHistoryKey();
  if (!key) return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function saveOrderHistory(list) {
  const key = getHistoryKey();
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, HISTORY_MAX))); }
  catch {}
}
function generateOrderId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${y}${m}${day}-${rand}`;
}
function saveOrderToHistory(orderData) {
  const history = getOrderHistory();
  const newOrder = {
    id: generateOrderId(),
    timestamp: Date.now(),
    productName: orderData.productName,
    duration: orderData.duration,
    price: orderData.price,
    method: orderData.method,
    note: orderData.note || '',
    buyerName: orderData.buyerName,
    phone: orderData.phone,
    status: 'pending'
  };
  history.unshift(newOrder);
  saveOrderHistory(history);
  return newOrder;
}
function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function getStatusLabel(status) {
  const map = { pending: '⏳ Chờ xử lý', done: '✅ Hoàn thành', cancelled: '❌ Đã hủy' };
  return map[status] || '⏳ Chờ xử lý';
}
function renderHistoryList() {
  const listEl = $('#historyList');
  if (!listEl) return;
  const history = getOrderHistory();
  if (!history.length) {
    listEl.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📭</div>
        <p>Bạn chưa có đơn hàng nào.<br>Hãy đặt đơn đầu tiên nhé!</p>
      </div>`;
    return;
  }
  listEl.innerHTML = '';
  history.forEach(order => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const statusClass = order.status === 'done' ? 'done'
                      : order.status === 'cancelled' ? 'cancelled' : 'pending';
    item.innerHTML = `
      <div class="history-item-top">
        <span class="history-order-id">#${order.id}</span>
        <span class="history-status ${statusClass}">${getStatusLabel(order.status)}</span>
      </div>
      <div class="history-item-date">📅 ${formatDateTime(order.timestamp)}</div>
      <div class="history-item-main">
        <div class="history-product">
          <div class="history-product-name">${order.productName}</div>
          <div class="history-product-meta"><b>${formatVND(order.price)}</b> · 💳 ${order.method}</div>
        </div>
        <button class="history-reorder-btn" type="button" data-order-id="${order.id}">🔄 Đặt lại</button>
      </div>`;
    listEl.appendChild(item);
  });
  listEl.querySelectorAll('.history-reorder-btn').forEach(btn => {
    btn.addEventListener('click', () => reorderFromHistory(btn.dataset.orderId));
  });
}
function reorderFromHistory(orderId) {
  const order = getOrderHistory().find(o => o.id === orderId);
  if (!order) return;
  closeHistoryModal();
  let found = false;
  for (const btn of $$('.pkg-btn')) {
    if (btn.dataset.name === order.productName && Number(btn.dataset.price) === order.price) {
      btn.click();
      found = true;
      break;
    }
  }
  if (!found) showToast('Không tìm thấy gói này.', 'error');
}
function openHistoryModal() {
  const modal = $('#historyModal');
  if (!modal) return;
  if (!getCurrentUser()) {
    showToast('Vui lòng đăng nhập để xem lịch sử mua hàng.', 'error');
    return;
  }
  renderHistoryList();
  modal.classList.remove('hidden');
}
function closeHistoryModal() {
  const modal = $('#historyModal');
  if (modal) modal.classList.add('hidden');
}
function clearAllHistory() {
  if (!confirm('Bạn có chắc muốn xóa tất cả lịch sử mua hàng?')) return;
  const key = getHistoryKey();
  if (!key) return;
  localStorage.removeItem(key);
  renderHistoryList();
  showToast('✅ Đã xóa tất cả lịch sử');
}
(function initHistory() {
  const historyBtn      = $('#historyBtn');
  const historyClose    = $('#historyClose');
  const historyClearAll = $('#historyClearAll');
  const historyModal    = $('#historyModal');
  if (!historyBtn) return;
  historyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openHistoryModal();
  });
  historyClose?.addEventListener('click', closeHistoryModal);
  historyModal?.addEventListener('click', (e) => {
    if (e.target === historyModal) closeHistoryModal();
  });
  historyClearAll?.addEventListener('click', clearAllHistory);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !historyModal?.classList.contains('hidden')) {
      closeHistoryModal();
    }
  });
})();

/* =========================================================
   💬 NÚT ZALO NỔI
   ========================================================= */
(function initZaloFloat() {
  const zalo = document.querySelector('.zalo-float');
  if (!zalo) return;
  window.addEventListener('scroll', () => {
    const scrollBottom = window.pageYOffset + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    zalo.style.opacity = (docHeight - scrollBottom < 300) ? '0.4' : '1';
  }, { passive: true });
})();

/* =========================================================
   🎬 VIDEO INTRO — Nút loa + Đếm ngược 5s + Phát nhạc sau intro
   ✅ ĐÃ FIX SCROLL MOBILE
   ========================================================= */
(function initVideoIntro() {
  const intro        = document.getElementById('videoIntro');
  const video        = document.getElementById('introVideo');
  const soundToggle  = document.getElementById('soundToggle');
  const skipBtn      = document.getElementById('skipIntro');
  const enterBtn     = document.getElementById('enterShop');
  const countdownEl  = document.getElementById('introCountdown');
  const countdownTxt = document.getElementById('countdownText');

  if (!intro || !video) return;

  /* KHÓA SCROLL KHI INTRO MỞ — đủ cách để fix iOS/Android */
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.documentElement.style.overflow = 'hidden';

  video.muted = true;
  video.volume = 0.8;

  video.play()
    .then(() => console.log('🎬 Video intro phát (muted)'))
    .catch(err => {
      console.warn('⚠️ Không autoplay được:', err);
      showEnterBtn();
    });

  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      if (video.muted) {
        video.muted = false;
        video.volume = 0.8;
        video.play().catch(() => {});
        soundToggle.textContent = '🔊';
        soundToggle.classList.add('on');
        console.log('🔊 Bật tiếng');
      } else {
        video.muted = true;
        soundToggle.textContent = '🔇';
        soundToggle.classList.remove('on');
        console.log('🔇 Tắt tiếng');
      }
    });
  }

  let secondsLeft = 5;
  const countdownInterval = setInterval(() => {
    secondsLeft--;
    if (countdownTxt) countdownTxt.textContent = secondsLeft;

    if (secondsLeft <= 0) {
      clearInterval(countdownInterval);
      if (countdownEl) countdownEl.classList.add('hidden');
      if (skipBtn) skipBtn.classList.remove('hidden');
      console.log('✅ Đã hiện nút Bỏ qua');
    }
  }, 1000);

  function showEnterBtn() {
    if (enterBtn) enterBtn.classList.remove('hidden');
  }
  video.addEventListener('ended', showEnterBtn);
  setTimeout(showEnterBtn, 60000);

  /* ĐÓNG INTRO — MỞ LẠI SCROLL CHO MỌI THIẾT BỊ */
  function closeIntro() {
    intro.classList.add('fade-out');
    video.pause();

    /* MỞ LẠI SCROLL — fix triệt để mobile */
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.documentElement.style.overflow = '';

    /* Thêm class để CSS hỗ trợ */
    document.body.classList.add('intro-closed');
    document.documentElement.classList.add('intro-closed');

    clearInterval(countdownInterval);

    setTimeout(() => {
      intro.classList.add('hidden');
      intro.style.display = 'none';
      document.dispatchEvent(new Event('introClosed'));
      console.log('✅ Intro đã đóng → phát nhạc nền');
    }, 650);
  }

  if (skipBtn)  skipBtn.addEventListener('click', closeIntro);
  if (enterBtn) enterBtn.addEventListener('click', closeIntro);

  /* CHO PHÉP TAP VÀO VIDEO ĐỂ ĐÓNG INTRO (mobile) */
  video.addEventListener('click', () => {
    /* Nếu video đã bật tiếng → click đóng intro */
    if (!video.muted) {
      closeIntro();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !intro.classList.contains('hidden')) {
      closeIntro();
    }
  });

  /* FALLBACK: tự động đóng intro sau 60s dù user không làm gì */
  setTimeout(() => {
    if (!intro.classList.contains('hidden')) {
      closeIntro();
      console.log('⏰ Tự động đóng intro sau 60s');
    }
  }, 60000);

  console.log('🎬 Video intro sẵn sàng');
})();

/* =========================================================
   🔵 ĐĂNG NHẬP GOOGLE
   ========================================================= */
const GOOGLE_CLIENT_ID = '472001144086-hai8a8e25s3fl56peedqna94rjchdju5.apps.googleusercontent.com';

(function initGoogleLogin() {
  const btn = document.getElementById('googleLoginBtn');
  if (!btn) {
    console.warn('⚠️ Không tìm thấy nút #googleLoginBtn');
    return;
  }

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('DÁN_CLIENT_ID')) {
    console.warn('⚠️ Chưa cấu hình GOOGLE_CLIENT_ID');
    btn.disabled = true;
    return;
  }

  function waitForGoogle(maxWait = 5000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (window.google?.accounts?.oauth2) {
          resolve();
        } else if (Date.now() - start > maxWait) {
          reject(new Error('Google SDK không load được'));
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>⏳ Đang kết nối Google...</span>';

    try {
      await waitForGoogle();

      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (response) => {
          if (response.error) {
            console.error('Google login error:', response);
            showToast('❌ Đăng nhập Google thất bại.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            return;
          }

          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            });
            const info = await res.json();

            const googleUser = {
              name: info.name,
              email: info.email,
              phone: 'google_' + info.sub,
              picture: info.picture,
              method: 'google'
            };

            const users = getUsers();
            if (!users.find(u => u.phone === googleUser.phone)) {
              users.push({
                ...googleUser,
                password: '(google)',
                createdAt: new Date().toISOString()
              });
              saveUsers(users);
            }

            setCurrentUser({ name: googleUser.name, phone: googleUser.phone });

            sendToSheet({
              name: googleUser.name,
              phone: googleUser.phone,
              email: googleUser.email,
              action: 'login_google'
            });

            document.getElementById('authModal')?.classList.add('hidden');
            updateUserUI();
            showSuccessPopup('Thông báo', 'SHOP TẤN ĐẠT');
            showToast('✅ Đăng nhập Google thành công!');

            btn.disabled = false;
            btn.innerHTML = originalHTML;
          } catch (err) {
            console.error('Lỗi lấy info Google:', err);
            showToast('❌ Không lấy được thông tin Google.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
          }
        }
      });

      client.requestAccessToken();
    } catch (err) {
      console.error('Lỗi Google login:', err);
      showToast('❌ Không kết nối được Google.', 'error');
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });

  console.log('🔵 Google Login đã sẵn sàng');
})();
