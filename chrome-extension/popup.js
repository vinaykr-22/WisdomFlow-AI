const API_URL = 'http://localhost:8000/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
  const token = await getStoredToken();
  if (token) {
    showClipSection();
    prefillTitle();
  } else {
    showAuthSection();
  }

  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('clipBtn').addEventListener('click', handleClip);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Theme toggle logic
  const themeToggle = document.getElementById('themeToggle');
  const moonIcon = document.getElementById('moonIcon');
  const sunIcon = document.getElementById('sunIcon');
  
  chrome.storage.local.get(['theme'], function(result) {
    if (result.theme === 'dark') {
      document.body.classList.add('dark');
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    }
  });

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    
    moonIcon.style.display = isDark ? 'none' : 'block';
    sunIcon.style.display = isDark ? 'block' : 'none';
    
    chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
  });
});

async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  
  if (!email || !password) {
    showStatus('Please enter email and password.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      let msg = 'Invalid credentials';
      try {
        const data = await res.json();
        if (data.detail) msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } catch (_) {}
      throw new Error(msg);
    }
    
    const data = await res.json();
    await chrome.storage.local.set({ token: data.access_token });
    
    showStatus('Logged in successfully!', 'success');
    showClipSection();
    prefillTitle();
  } catch (err) {
    showStatus(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login to WisdomFlow';
  }
}

async function handleClip() {
  const token = await getStoredToken();
  if (!token) return showAuthSection();

  const btn = document.getElementById('clipBtn');
  const rawTitle = document.getElementById('docTitle').value || 'Clipped Web Page';
  const docTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'Clipped Web Page';
  
  btn.disabled = true;
  btn.textContent = 'Extracting...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageText,
    });

    if (!result || result.trim().length === 0) {
      throw new Error('No text found on page.');
    }

    btn.textContent = 'Uploading...';

    const file = new File([result], `${docTitle}.txt`, { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      let errorMsg = `Upload failed (${res.status})`;
      try {
        const errData = await res.json();
        if (errData.detail) {
          errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
        }
      } catch (_) {}

      if (res.status === 401) {
        await chrome.storage.local.remove('token');
        showAuthSection();
        errorMsg = 'Session expired. Please log in again.';
      }
      throw new Error(errorMsg);
    }
    
    showStatus('Successfully clipped to WisdomFlow!', 'success');
  } catch (err) {
    showStatus(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Clip This Page';
  }
}

async function handleLogout() {
  await chrome.storage.local.remove('token');
  showAuthSection();
  showStatus('Logged out.', 'success');
}

function extractPageText() {
  // Try to grab main content, fallback to body text
  const main = document.querySelector('main') || document.querySelector('article') || document.body;
  
  // Remove unwanted elements
  const clone = main.cloneNode(true);
  const unwanted = clone.querySelectorAll('script, style, nav, header, footer, iframe');
  unwanted.forEach(el => el.remove());
  
  return clone.innerText || clone.textContent;
}

async function prefillTitle() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.title) {
    document.getElementById('docTitle').value = tab.title;
  }
}

async function getStoredToken() {
  const result = await chrome.storage.local.get(['token']);
  return result.token;
}

function showAuthSection() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('clipSection').style.display = 'none';
}

function showClipSection() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('clipSection').style.display = 'block';
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
}
