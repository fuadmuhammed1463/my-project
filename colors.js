/* ============================================================
   AURA MARKETPLACE — JavaScript Backend
   - Data Store (users, listings)
   - Auth System (register, login, logout)
   - Listings Engine (render, filter, search)
   - Booking System (date picker, cost calc, confirm)
   - List an Item (add new listing)
   - Animated Stats Counter
   - Toast Notifications
   ============================================================ */

// ─── DATA STORE ──────────────────────────────────────────────

const DB = {
    users: JSON.parse(localStorage.getItem('aura_users')) || [],
    listings: JSON.parse(localStorage.getItem('aura_listings')) || [],
    bookings: JSON.parse(localStorage.getItem('aura_bookings')) || [],
    currentUser: JSON.parse(localStorage.getItem('aura_current_user')) || null,

    save() {
        localStorage.setItem('aura_users', JSON.stringify(this.users));
        localStorage.setItem('aura_listings', JSON.stringify(this.listings));
        localStorage.setItem('aura_bookings', JSON.stringify(this.bookings));
        localStorage.setItem('aura_current_user', JSON.stringify(this.currentUser));
    }
};

// ─── SEED LISTINGS (default data if empty) ───────────────────

const SEED_LISTINGS = [
    { id: 1, name: 'Sony A7 IV Mirrorless Camera', category: 'Cameras', price: 45, location: 'Brooklyn, NY', owner: 'Alex M.', available: true, emoji: '📷', gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
    { id: 2, name: 'PlayStation 5 + 2 Controllers', category: 'Gaming', price: 25, location: 'Manhattan, NY', owner: 'Jordan K.', available: true, emoji: '🎮', gradient: 'linear-gradient(135deg,#0f172a,#1e3a5f)' },
    { id: 3, name: 'Segway Ninebot Max G30', category: 'Scooters', price: 18, location: 'Hoboken, NJ', owner: 'Sam R.', available: false, emoji: '🛴', gradient: 'linear-gradient(135deg,#0f2027,#203a43)' },
    { id: 4, name: 'REI Co-op Luxury Tent Kit', category: 'Camping', price: 35, location: 'Jersey City, NJ', owner: 'Maya T.', available: true, emoji: '⛺', gradient: 'linear-gradient(135deg,#1a2a1a,#2d4a2d)' },
    { id: 5, name: 'DJI Mavic 3 Pro Drone', category: 'Cameras', price: 60, location: 'Queens, NY', owner: 'Chris L.', available: true, emoji: '🚁', gradient: 'linear-gradient(135deg,#1a1a2e,#16213e)' },
    { id: 6, name: 'Nintendo Switch OLED', category: 'Gaming', price: 15, location: 'Bronx, NY', owner: 'Priya S.', available: true, emoji: '🎮', gradient: 'linear-gradient(135deg,#0d1b2a,#1b2838)' },
    { id: 7, name: 'Rode NT1 Microphone Kit', category: 'Audio', price: 20, location: 'Brooklyn, NY', owner: 'Leo B.', available: true, emoji: '🎵', gradient: 'linear-gradient(135deg,#1a0a2e,#2d1b4e)' },
    { id: 8, name: 'MacBook Pro M3 (16")', category: 'Tech', price: 55, location: 'Manhattan, NY', owner: 'Nina W.', available: false, emoji: '💻', gradient: 'linear-gradient(135deg,#0a0a0a,#1a1a1a)' },
];

if (DB.listings.length === 0) {
    DB.listings = SEED_LISTINGS;
    DB.save();
}

// ─── CATEGORIES ──────────────────────────────────────────────

const CATEGORIES = ['All', 'Cameras', 'Gaming', 'Camping', 'Scooters', 'Audio', 'Tech'];
const CATEGORY_EMOJI = { Cameras: '📷', Gaming: '🎮', Camping: '⛺', Scooters: '🛴', Audio: '🎵', Tech: '💻', All: '' };

let activeCategory = 'All';
let searchQuery = '';

// ─── UTILS ───────────────────────────────────────────────────

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast toast-${type}`;
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
}
function clearError(id) { document.getElementById(id).classList.add('hidden'); }

// ─── ANIMATED STATS COUNTER ──────────────────────────────────

function animateCount(el, target, suffix = '') {
    let count = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
        count = Math.min(count + step, target);
        el.textContent = count.toLocaleString() + suffix;
        if (count >= target) clearInterval(timer);
    }, 20);
}

function renderStats() {
    const available = DB.listings.filter(l => l.available).length;
    const owners = [...new Set(DB.listings.map(l => l.owner))].length;
    animateCount(document.getElementById('stat-items'), available, '+');
    animateCount(document.getElementById('stat-owners'), owners + 840);
    animateCount(document.getElementById('stat-cities'), 12);
}

// ─── CATEGORY FILTER RENDER ──────────────────────────────────

function renderCategories() {
    const container = document.getElementById('category-filters');
    container.innerHTML = CATEGORIES.map(cat => `
        <div class="chip ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
            ${CATEGORY_EMOJI[cat] || ''} ${cat}
        </div>
    `).join('');

    container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            activeCategory = chip.dataset.cat;
            searchQuery = '';
            document.getElementById('search-input').value = '';
            renderCategories();
            renderListings();
        });
    });
}

// ─── LISTINGS RENDER ─────────────────────────────────────────

function getFilteredListings() {
    return DB.listings.filter(l => {
        const matchCat = activeCategory === 'All' || l.category === activeCategory;
        const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            l.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            l.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });
}

function renderListings() {
    const grid = document.getElementById('listings-grid');
    const noResults = document.getElementById('no-results');
    const countEl = document.getElementById('listings-count');
    const titleEl = document.getElementById('listings-title');
    const filtered = getFilteredListings();

    titleEl.textContent = activeCategory === 'All' ? 'All Listings' : `${CATEGORY_EMOJI[activeCategory]} ${activeCategory}`;
    countEl.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');
    grid.innerHTML = filtered.map(item => `
        <div class="listing-card" data-id="${item.id}">
            <div class="card-img" style="background:${item.gradient}">
                <span class="${item.available ? 'badge-available' : 'badge-rented'}">
                    ${item.available ? '● Available Now' : '● Rented'}
                </span>
                <span class="card-emoji">${item.emoji}</span>
            </div>
            <div class="card-body">
                <span class="card-cat">${CATEGORY_EMOJI[item.category]} ${item.category}</span>
                <h3>${item.name}</h3>
                <p class="card-location">📍 ${item.location}</p>
                <p class="card-owner">👤 ${item.owner}</p>
                <div class="card-footer">
                    <span class="price"><strong>$${item.price}</strong> / day</span>
                    <span class="badge-verified">✔ Verified</span>
                </div>
                <button class="btn-primary btn-full btn-book" data-id="${item.id}" ${!item.available ? 'disabled' : ''}>
                    ${item.available ? 'Book Now' : 'Unavailable'}
                </button>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.btn-book').forEach(btn => {
        btn.addEventListener('click', () => openBooking(parseInt(btn.dataset.id)));
    });
}

// ─── SEARCH ──────────────────────────────────────────────────

document.getElementById('search-btn').addEventListener('click', () => {
    searchQuery = document.getElementById('search-input').value.trim();
    activeCategory = 'All';
    renderCategories();
    renderListings();
    document.getElementById('listings').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('search-btn').click();
});

// ─── AUTH SYSTEM ─────────────────────────────────────────────

function updateNavAuth() {
    const actions = document.querySelector('.nav-actions');
    const userMenu = document.getElementById('user-menu');
    const loginBtn = document.getElementById('open-login');
    const registerBtn = document.getElementById('open-register');

    if (DB.currentUser) {
        loginBtn.classList.add('hidden');
        registerBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');
        document.getElementById('user-greeting').textContent = `👋 ${DB.currentUser.name.split(' ')[0]}`;
    } else {
        loginBtn.classList.remove('hidden');
        registerBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// Open auth modal
document.getElementById('open-login').addEventListener('click', () => {
    switchTab('login');
    openModal('auth-modal');
});
document.getElementById('open-register').addEventListener('click', () => {
    switchTab('register');
    openModal('auth-modal');
});
document.getElementById('close-auth').addEventListener('click', () => closeModal('auth-modal'));

// Tab switching
function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));

// Register
document.getElementById('register-form').addEventListener('submit', e => {
    e.preventDefault();
    clearError('register-error');

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const city = document.getElementById('reg-city').value.trim();

    if (password.length < 6) return showError('register-error', 'Password must be at least 6 characters.');
    if (DB.users.find(u => u.email === email)) return showError('register-error', 'An account with this email already exists.');

    const user = { id: Date.now(), name, email, password, city };
    DB.users.push(user);
    DB.currentUser = { id: user.id, name: user.name, email: user.email, city: user.city };
    DB.save();

    closeModal('auth-modal');
    updateNavAuth();
    showToast(`Welcome to Aura, ${name.split(' ')[0]}! 🎉`);
    e.target.reset();
});

// Login
document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    clearError('login-error');

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const user = DB.users.find(u => u.email === email && u.password === password);

    if (!user) return showError('login-error', 'Invalid email or password.');

    DB.currentUser = { id: user.id, name: user.name, email: user.email, city: user.city };
    DB.save();

    closeModal('auth-modal');
    updateNavAuth();
    showToast(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
    e.target.reset();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    DB.currentUser = null;
    DB.save();
    updateNavAuth();
    showToast('You have been logged out.', 'info');
});

// ─── LIST AN ITEM ─────────────────────────────────────────────

function openListModal() {
    if (!DB.currentUser) {
        showToast('Please log in to list an item.', 'error');
        switchTab('login');
        openModal('auth-modal');
        return;
    }
    openModal('list-modal');
}

document.getElementById('open-list-modal').addEventListener('click', e => { e.preventDefault(); openListModal(); });
document.getElementById('cta-list-btn').addEventListener('click', openListModal);
document.getElementById('close-list').addEventListener('click', () => closeModal('list-modal'));

document.getElementById('list-form').addEventListener('submit', e => {
    e.preventDefault();
    clearError('list-error');

    const name = document.getElementById('list-name').value.trim();
    const category = document.getElementById('list-category').value;
    const price = parseInt(document.getElementById('list-price').value);
    const location = document.getElementById('list-location').value.trim();

    if (!category) return showError('list-error', 'Please select a category.');

    const GRADIENTS = {
        Cameras: 'linear-gradient(135deg,#1e1b4b,#312e81)',
        Gaming: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
        Camping: 'linear-gradient(135deg,#1a2a1a,#2d4a2d)',
        Scooters: 'linear-gradient(135deg,#0f2027,#203a43)',
        Audio: 'linear-gradient(135deg,#1a0a2e,#2d1b4e)',
        Tech: 'linear-gradient(135deg,#0a0a0a,#1a1a1a)',
    };

    const newItem = {
        id: Date.now(),
        name, category, price, location,
        owner: DB.currentUser.name,
        available: true,
        emoji: CATEGORY_EMOJI[category],
        gradient: GRADIENTS[category]
    };

    DB.listings.unshift(newItem);
    DB.save();

    closeModal('list-modal');
    activeCategory = 'All';
    renderCategories();
    renderListings();
    renderStats();
    showToast(`"${name}" is now live on Aura! 🚀`);
    e.target.reset();
});

// ─── BOOKING SYSTEM ──────────────────────────────────────────

function openBooking(id) {
    if (!DB.currentUser) {
        showToast('Please log in to book an item.', 'error');
        switchTab('login');
        openModal('auth-modal');
        return;
    }

    const item = DB.listings.find(l => l.id === id);
    if (!item) return;

    const today = new Date().toISOString().split('T')[0];

    document.getElementById('booking-content').innerHTML = `
        <h2>Book: ${item.name}</h2>
        <p class="booking-owner">👤 Owner: ${item.owner} &nbsp;|&nbsp; 📍 ${item.location}</p>
        <div class="booking-price-tag">$${item.price} / day</div>
        <form id="booking-form">
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" id="book-start" min="${today}" required />
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="date" id="book-end" min="${today}" required />
            </div>
            <div class="booking-summary hidden" id="booking-summary">
                <span id="booking-days"></span>
                <span class="booking-total" id="booking-total"></span>
            </div>
            <p class="form-error hidden" id="booking-error"></p>
            <button type="submit" class="btn-primary btn-full">Confirm Booking</button>
        </form>
    `;

    openModal('booking-modal');

    // Live cost calculator
    function calcCost() {
        const start = document.getElementById('book-start').value;
        const end = document.getElementById('book-end').value;
        if (!start || !end) return;
        const days = Math.round((new Date(end) - new Date(start)) / 86400000);
        const summary = document.getElementById('booking-summary');
        if (days > 0) {
            document.getElementById('booking-days').textContent = `${days} day${days > 1 ? 's' : ''}`;
            document.getElementById('booking-total').textContent = `Total: $${days * item.price}`;
            summary.classList.remove('hidden');
        } else {
            summary.classList.add('hidden');
        }
    }

    document.getElementById('book-start').addEventListener('change', calcCost);
    document.getElementById('book-end').addEventListener('change', calcCost);

    document.getElementById('booking-form').addEventListener('submit', e => {
        e.preventDefault();
        clearError('booking-error');

        const start = document.getElementById('book-start').value;
        const end = document.getElementById('book-end').value;
        const days = Math.round((new Date(end) - new Date(start)) / 86400000);

        if (days <= 0) return showError('booking-error', 'End date must be after start date.');

        const booking = {
            id: Date.now(),
            itemId: item.id,
            itemName: item.name,
            userId: DB.currentUser.id,
            userName: DB.currentUser.name,
            start, end, days,
            total: days * item.price,
            bookedAt: new Date().toISOString()
        };

        DB.bookings.push(booking);

        // Mark item as rented
        const listingIndex = DB.listings.findIndex(l => l.id === item.id);
        DB.listings[listingIndex].available = false;
        DB.save();

        closeModal('booking-modal');
        renderListings();
        renderStats();
        showToast(`Booking confirmed! ${item.name} for ${days} day${days > 1 ? 's' : ''} — $${booking.total} total. 🎉`);
    });
}

document.getElementById('close-booking').addEventListener('click', () => closeModal('booking-modal'));

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.add('hidden');
    });
});

// ─── INIT ─────────────────────────────────────────────────────

renderStats();
renderCategories();
renderListings();
updateNavAuth();
