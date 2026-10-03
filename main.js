/* =========================================================
   SHOP TẤN ĐẠT — MAIN.JS
   Snow + Music + Checkout + Copy + QR + Drag + Telegram + Auth + Google Sheets
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
  if (!SHEET_API_URL) {
    console.warn('⚠️ Chưa cấu hình SHEET_API_URL');
    return { ok: false };
  }
  try {
    const formData = new URLSearchParams();
    for (const key in data) {
      formData.append(key, data[key] || '');
    }
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
   🔐 AUTH
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
  if (user) {
    localStorage.setItem(STORAGE_CURRENT, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_CURRENT);
  }
}
function updateUserUI() {
  const userBox = $('#userBox');
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
const NOTIFY_KEY = 'notifySnoozeUntil';

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

function handleNotifyOk() {
  closeSuccessPopup();
}

function handleNotifyLater() {
  closeSuccessPopup();
  const until = Date.now() + 60 * 60 * 1000;
  try {
    localStorage.setItem(NOTIFY_KEY, String(until));
  } catch (err) {
    console.warn('Không lưu được snooze:', err);
  }
}

(function initAuth() {
  const authModal    = $('#authModal');
  const tabLogin     = $('#tabLogin');
  const tabRegister  = $('#tabRegister');
  const loginForm    = $('#loginForm');
  const registerForm = $('#registerForm');
  const loginMsg     = $('#loginMsg');
  const registerMsg  = $('#registerMsg');
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

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginMsg.textContent = '';
    registerMsg.textContent = '';
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    loginMsg.textContent = '';
    registerMsg.textContent = '';
  });

  /* ==== ĐĂNG KÝ ==== */
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name     = registerForm.name.value.trim();
    const phone    = registerForm.phone.value.trim();
    const password = registerForm.password.value;
    const confirm  = registerForm.confirm.value;

    if (name.length < 2) {
      registerMsg.textContent = '⚠️ Vui lòng nhập họ tên đầy đủ.';
      return;
    }
    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
      registerMsg.textContent = '⚠️ Số điện thoại không hợp lệ.';
      return;
    }
    if (password.length < 6) {
      registerMsg.textContent = '⚠️ Mật khẩu phải từ 6 ký tự.';
      return;
    }
    if (password !== confirm) {
      registerMsg.textContent = '⚠️ Mật khẩu nhập lại không khớp.';
      return;
    }

    const users = getUsers();
    if (users.find(u => u.phone === phone)) {
      registerMsg.textContent = '⚠️ SĐT này đã được đăng ký.';
      return;
    }

    const newUser = {
      name,
      phone,
      password,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);

    sendToSheet({
      name: name,
      phone: phone,
      password: password,
      action: 'register'
    });

    setCurrentUser({ name: newUser.name, phone: newUser.phone });

    authModal.classList.add('hidden');
    updateUserUI();
    showSuccessPopup('Thông báo', 'SHOP TẤN ĐẠT');

    registerForm.reset();
    registerMsg.textContent = '';
  });

  /* ==== ĐĂNG NHẬP ==== */
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone    = loginForm.phone.value.trim();
    const password = loginForm.password.value;

    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
      loginMsg.textContent = '⚠️ Số điện thoại không hợp lệ.';
      return;
    }
    if (!password) {
      loginMsg.textContent = '⚠️ Vui lòng nhập mật khẩu.';
      return;
    }

    const users = getUsers();
    const found = users.find(u => u.phone === phone && u.password === password);

    if (!found) {
      loginMsg.textContent = '⚠️ SĐT hoặc mật khẩu không đúng.';
      return;
    }

    setCurrentUser({ name: found.name, phone: found.phone });

    sendToSheet({
      name: found.name,
      phone: found.phone,
      password: '(đã có)',
      action: 'login'
    });

    authModal.classList.add('hidden');
    updateUserUI();
    showSuccessPopup('Thông báo', 'SHOP TẤN ĐẠT');

    loginForm.reset();
    loginMsg.textContent = '';
  });

  /* ==== ĐĂNG XUẤT ==== */
  logoutBtn?.addEventListener('click', () => {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
    setCurrentUser(null);
    updateUserUI();
    authModal.classList.remove('hidden');
    tabLogin.click();
  });

  const notifyOk = $('#notifyOk');
  const notifyLater = $('#notifyLater');

  notifyOk?.addEventListener('click', handleNotifyOk);
  notifyLater?.addEventListener('click', handleNotifyLater);
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
   📤 GỬI ĐƠN HÀNG QUA TELEGRAM
   ========================================================= */
async function sendToTelegram(orderData) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Chưa cấu hình Telegram');
    return { ok: false, error: 'missing_config' };
  }

  const now = new Date();
  const timeStr = now.toLocaleString('vi-VN', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
    hour:  '2-digit',
    minute:'2-digit'
  });

  const currentUser = getCurrentUser();
  const userInfo = currentUser
    ? `👤 <b>Tài khoản:</b> ${currentUser.name} (${currentUser.phone})\n`
    : '';

  const text =
    `🛒 <b>ĐƠN HÀNG MỚI</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>Sản phẩm:</b> ${orderData.productName}\n` +
    `⏱️ <b>Thời hạn:</b> ${orderData.duration}\n` +
    `💰 <b>Số tiền:</b> ${formatVND(orderData.price)}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    userInfo +
    `📞 <b>Người nhận:</b> ${orderData.buyerName}\n` +
    `📱 <b>SĐT:</b> ${orderData.phone}\n` +
    `💳 <b>Thanh toán:</b> ${orderData.method}\n` +
    `📝 <b>Ghi chú:</b> ${orderData.note || '(không)'}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `⏰ ${timeStr}`;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    TELEGRAM_CHAT_ID,
        text:       text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();

    if (data.ok) {
      console.log('✅ Đã gửi đơn qua Telegram');
      return { ok: true };
    } else {
      console.error('❌ Telegram API lỗi:', data);
      return { ok: false, error: data.description || 'unknown' };
    }
  } catch (err) {
    console.error('❌ Lỗi gửi Telegram:', err);
    return { ok: false, error: err.message };
  }
}

/* =========================================================
   1. NĂM HIỆN TẠI Ở FOOTER
   ========================================================= */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================================================
   2. SNOW EFFECT
   ========================================================= */
(function initSnow() {
  const field = $('#snowField');
  if (!field) return;
  const isMobile = window.innerWidth < 768;
  const total = isMobile ? 80 : 200;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < total; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = '❄';
    const size     = Math.random() * 10 + 6;
    const duration = Math.random() * 5 + 6;
    const delay    = Math.random() * 10;
    const drift    = Math.random() * 120 - 60;
    flake.style.left = Math.random() * 100 + 'vw';
    flake.style.fontSize = size + 'px';
    flake.style.opacity = (Math.random() * 0.5 + 0.35).toFixed(2);
    flake.style.animationDuration = duration + 's';
    flake.style.animationDelay = (-delay) + 's';
    flake.style.setProperty('--drift', drift + 'px');
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
    
    { title: 'Parada',     artist: 'Shop Tấn Đạt', src: 'parada.mp3'   },
    { title: 'Nhạc Đóa quỳnh lan',     artist: 'Shop Tấn Đạt', src: 'doaquynhlan.mp3'    },
    { title: 'Nhạc Ngày mình chia tay',     artist: 'Shop Tấn Đạt', src: 'ngayminhctay.mp3'    },
    { title: 'Nhạc Hai ta không xứng',     artist: 'Shop Tấn Đạt', src: 'thuongnhaudenthe.mp3'    },
    { title: 'Nhạc Thương phận hồng nhan',     artist: 'Shop Tấn Đạt', src: 'thuongphanhongnhan.mp3'    }
  ];

  let currentIndex = 0;
  let isPlaying = false;
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
      audio.play()
        .then(() => setPlayingUI(true))
        .catch(err => {
          console.warn('Lỗi phát nhạc:', err);
          setPlayingUI(false);
        });
    }
  }

  function setPlayingUI(playing) {
    isPlaying = playing;
    playPause.textContent = playing ? '⏸' : '▶';
    disc.classList.toggle('playing', playing);
  }

  playPause.addEventListener('click', () => {
    if (audio.paused) {
      audio.play()
        .then(() => setPlayingUI(true))
        .catch(err => console.warn('Lỗi phát nhạc:', err));
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
    if (audio.duration) {
      audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
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
  loadTrack(7, false);

  /* TỰ ĐỘNG PHÁT NHẠC khi khách tương tác lần đầu */
  let autoplayTried = false;

  function tryAutoplayOnce() {
    if (autoplayTried) return;
    if (!PLAYLIST.length) return;
    autoplayTried = true;

    if (audio.paused) {
      audio.play()
        .then(() => {
          setPlayingUI(true);
          console.log('✅ Nhạc tự phát sau tương tác đầu tiên');
        })
        .catch(err => {
          console.warn('Không phát được nhạc:', err);
          autoplayTried = false;
        });
    }

    document.removeEventListener('click', tryAutoplayOnce);
    document.removeEventListener('touchstart', tryAutoplayOnce);
    document.removeEventListener('keydown', tryAutoplayOnce);
    document.removeEventListener('scroll', tryAutoplayOnce);
  }

  document.addEventListener('click', tryAutoplayOnce, { once: false });
  document.addEventListener('touchstart', tryAutoplayOnce, { once: false, passive: true });
  document.addEventListener('keydown', tryAutoplayOnce, { once: false });
  document.addEventListener('scroll', tryAutoplayOnce, { once: false, passive: true });
})();

/* =========================================================
   4. DRAG MUSIC WIDGET
   ========================================================= */
(function initDrag() {
  const widget = $('#musicWidget');
  if (!widget) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

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
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop  = Math.max(0, Math.min(newTop,  maxTop));
    widget.style.left = newLeft + 'px';
    widget.style.top  = newTop + 'px';
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
      console.error(err);
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
  const bankBtn         = $('#bankBtn');
  const vietinbankBtn   = $('#vietinbankBtn');
  const bankAccEl     = $('#bankAcc');
  const bankNameEl    = $('#bankName');
  const bankOwnerEl   = $('#bankOwner');
  const copyAccBtn    = $('#copyAcc');
  const confirmBtn    = $('#confirmBtn');

  if (!modal || !form) return;

  const ACCOUNTS = {
    bank: {
      name:  'Vietcombank',
      acc:   '2345085074',
      owner: 'Nguyễn Tấn Đạt',
      qr:    '45.jpg'
    },
    vietinbank: {
      name:  'VietinBank',
      acc:   '107888416084',
      owner: 'Nguyễn Tấn Đạt',
      qr:    'images/qrvtb.jpg'
    }
  };

  let currentProduct = null;
  let currentMethod  = 'bank';

  $$('.pkg-btn').forEach(btn => {
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
        id:       btn.dataset.id,
        name:     btn.dataset.name,
        price:    Number(btn.dataset.price),
        duration: btn.dataset.duration
      };

      renderSummary();
      setMethod('bank');

      const user = getCurrentUser();
      if (user) {
        if (form.buyerName) form.buyerName.value = user.name;
        if (form.phone)     form.phone.value     = user.phone;
      }

      modal.classList.remove('hidden');
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
    const note  = form.note.value.trim();

    if (name.length < 2) {
      showToast('Vui lòng nhập họ tên.', 'error');
      form.buyerName.focus();
      return;
    }
    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
      showToast('Số điện thoại không hợp lệ.', 'error');
      form.phone.focus();
      return;
    }
    if (!currentProduct) {
      showToast('Vui lòng chọn gói dịch vụ.', 'error');
      return;
    }

    const info = ACCOUNTS[currentMethod];

    const orderData = {
      productName: currentProduct.name,
      duration:    currentProduct.duration,
      price:       currentProduct.price,
      buyerName:   name,
      phone:       phone,
      method:      info.name,
      note:        note
    };

    const originalBtnText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Đang gửi...';

    const result = await sendToTelegram(orderData);

    confirmBtn.disabled = false;
    confirmBtn.textContent = originalBtnText;

    if (result.ok) {
      saveOrderToHistory(orderData);
      showToast('✅ Đã gửi đơn thành công! Tấn Đạt sẽ liên hệ sớm.');
      setTimeout(() => closeModal(), 1500);
    } else {
      console.error('Lỗi:', result.error);
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
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
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
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveOrderHistory(list) {
  const key = getHistoryKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch (err) {
    console.warn('Không lưu được lịch sử:', err);
  }
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusLabel(status) {
  const map = {
    pending: '⏳ Chờ xử lý',
    done: '✅ Hoàn thành',
    cancelled: '❌ Đã hủy'
  };
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
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  history.forEach(order => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const statusClass = order.status === 'done' ? 'done'
                      : order.status === 'cancelled' ? 'cancelled'
                      : 'pending';

    const topDiv = document.createElement('div');
    topDiv.className = 'history-item-top';

    const idSpan = document.createElement('span');
    idSpan.className = 'history-order-id';
    idSpan.textContent = '#' + order.id;

    const statusSpan = document.createElement('span');
    statusSpan.className = 'history-status ' + statusClass;
    statusSpan.textContent = getStatusLabel(order.status);

    topDiv.appendChild(idSpan);
    topDiv.appendChild(statusSpan);

    const dateDiv = document.createElement('div');
    dateDiv.className = 'history-item-date';
    dateDiv.textContent = '📅 ' + formatDateTime(order.timestamp);

    const mainDiv = document.createElement('div');
    mainDiv.className = 'history-item-main';

    const productDiv = document.createElement('div');
    productDiv.className = 'history-product';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'history-product-name';
    nameDiv.textContent = order.productName;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'history-product-meta';
    const priceB = document.createElement('b');
    priceB.textContent = formatVND(order.price);
    metaDiv.append(priceB, ` · 💳 ${order.method}`);

    productDiv.appendChild(nameDiv);
    productDiv.appendChild(metaDiv);

    const reorderBtn = document.createElement('button');
    reorderBtn.className = 'history-reorder-btn';
    reorderBtn.type = 'button';
    reorderBtn.textContent = '🔄 Đặt lại';
    reorderBtn.dataset.orderId = order.id;

    mainDiv.appendChild(productDiv);
    mainDiv.appendChild(reorderBtn);

    item.appendChild(topDiv);
    item.appendChild(dateDiv);
    item.appendChild(mainDiv);

    listEl.appendChild(item);
  });

  listEl.querySelectorAll('.history-reorder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.orderId;
      reorderFromHistory(orderId);
    });
  });
}

function reorderFromHistory(orderId) {
  const history = getOrderHistory();
  const order = history.find(o => o.id === orderId);
  if (!order) return;

  closeHistoryModal();

  const allBtns = $$('.pkg-btn');
  let found = false;
  for (const btn of allBtns) {
    const name = btn.dataset.name;
    const price = btn.dataset.price;
    if (name === order.productName && Number(price) === order.price) {
      btn.click();
      found = true;
      break;
    }
  }

  if (!found) {
    showToast('Không tìm thấy gói này. Có thể sản phẩm đã thay đổi.', 'error');
  }
}

function openHistoryModal() {
  const modal = $('#historyModal');
  if (!modal) return;

  const user = getCurrentUser();
  if (!user) {
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
  const historyBtn = $('#historyBtn');
  const historyClose = $('#historyClose');
  const historyClearAll = $('#historyClearAll');
  const historyModal = $('#historyModal');

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