const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const mainHeaderTitle = document.querySelector('.header-title');
const headerWelcome = document.querySelector('.header-welcome');
const contentArea = document.getElementById('content-area');
const sidebarNav = document.querySelector('.sidebar-nav ul');
const logoutBtn = document.getElementById('logout');

const customModal = document.getElementById('custom-modal');
const modalMsgTitle = document.getElementById('modal-msg-title');
const modalMsgBody = document.getElementById('modal-msg-body');
const modalActions = document.getElementById('modal-actions');
const modalCloseCustom = document.querySelector('#custom-modal .modal-close');

const bookingModal = document.getElementById('booking-modal');
const bookingModalTitle = document.getElementById('booking-modal-title');
const bookingForm = document.getElementById('booking-form');
const paymentSection = document.getElementById('payment-section');
const paymentAmount = document.getElementById('payment-amount');
const bookingIdForPayment = document.getElementById('booking-id-for-payment');
const processPaymentBtn = document.getElementById('process-payment-btn');

let allPackages = []; 


const showCustomModal = (title, body, actionsHtml = '', callback = null) => {
    modalMsgTitle.textContent = title;
    modalMsgBody.innerHTML = body;
    modalActions.innerHTML = actionsHtml;

    const closeListener = () => {
        customModal.style.display = 'none';
        modalCloseCustom.removeEventListener('click', closeListener);
        if (callback) callback(false); 
    };
    modalCloseCustom.addEventListener('click', closeListener);

    customModal.style.display = 'block';

    if (actionsHtml) {
        const setupButtonListeners = () => {
            const primaryButton = modalActions.querySelector('.btn-primary');
            let primaryListener, secondaryListener; 

            if (primaryButton) {
                primaryListener = () => {
                    customModal.style.display = 'none';
                    primaryButton.removeEventListener('click', primaryListener);
                    modalActions.querySelectorAll('.btn-secondary').forEach(btn => btn.removeEventListener('click', secondaryListener));
                    if (callback) callback(true);
                };
                primaryButton.addEventListener('click', primaryListener);
            }
            const secondaryButton = modalActions.querySelector('.btn-secondary');
            if (secondaryButton) {
                secondaryListener = () => {
                    customModal.style.display = 'none';
                    secondaryButton.removeEventListener('click', secondaryListener);
                    modalActions.querySelectorAll('.btn-primary').forEach(btn => btn.removeEventListener('click', primaryListener));
                    if (callback) callback(false);
                };
                secondaryButton.addEventListener('click', secondaryListener);
            }
        };
        setTimeout(setupButtonListeners, 0); 
    }
};

const hideModal = (modalId) => {
    document.getElementById(modalId).style.display = 'none';
};

const fetchData = async (endpoint, prefix = 'user', method = 'GET', body = null) => {
    const finalUrl = `${API_URL}/${prefix}/${endpoint}`;
    console.log(`[API Call] Starting ${method} request to: ${finalUrl}`);
    
    try {
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(finalUrl, options);

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            showCustomModal('Session Expired', 'Your session has expired. Please log in again.', `<button class="btn btn-secondary">OK</button>`);
            setTimeout(() => window.location.href = 'index.html', 1500);
            return null;
        }

        let data = {};
        try {
            data = await res.json();
            console.log(`[API Response] Data received (Status: ${res.status}):`, data); 
        } catch (e) {
            console.warn(`[API Response] Could not parse JSON for status ${res.status}. Falling back to status text.`);
        }


        if (res.ok) {
            return data;
        } else {
            showCustomModal('API Error', data.message || res.statusText, `<button class="btn btn-secondary">Close</button>`);
            return null;
        }
    } catch (err) {
        console.error(`[API Error] Network or server connection failed for ${finalUrl}:`, err);
        showCustomModal('Network Error', `Could not connect to the server or: ${err.message}`, `<button class="btn btn-secondary">Close</button>`);
        return null;
    }
};

const updateUIForSection = (title, content) => {
    mainHeaderTitle.textContent = title;
    contentArea.innerHTML = content;
};

const renderTable = (data, headers, rowIdKey = null, actionType = null) => {
    if (!data || data.length === 0) {
        return '<p>No data found.</p>';
    }

    const headerHtml = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const bodyHtml = `<tbody>${data.map(row => {
        const rowData = headers.map(h => {
            
            const key = h.toUpperCase().replace(/\s/g, '_');
            let value = row[key];
            
    
            if (h === 'STARTING POINT' && !value) {
                value = row['STARTINGPOINT'] || row['startingPoint'] || row['starting_point'] || 'N/A';
            }
            if (h === 'PACKAGE TITLE' && !value) {
                value = row['PACKAGETITLE'] || row['packageTitle'] || row['package_title'];
            }
            
            let cellContent = value === null || value === undefined ? 'N/A' : String(value);


            if (h.toUpperCase().includes('DATE') || h.toUpperCase().includes('TIME')) {
                if (!value) return `<td style="white-space: nowrap;">N/A</td>`;
        
                const dateObj = new Date(value);
              
                if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0 && dateObj.getSeconds() === 0 && dateObj.getMilliseconds() === 0) {
            
                    cellContent = dateObj.toLocaleDateString();
                } else {
                    
                    cellContent = dateObj.toLocaleString();
                }
                 return `<td style="white-space: nowrap;">${cellContent}</td>`;
            }

            if (rowIdKey && h === 'ACTIONS') {
                const rowId = row[rowIdKey.toUpperCase()];
                if (actionType === 'booking') {
                    const status = row.STATUS ? row.STATUS.toLowerCase() : '';
                    if (status === 'pending') {
                        return `<td><button class="btn btn-success btn-sm pay-btn" data-id="${rowId}" data-amount="${row.PRICE}">Pay</button>
                                         <button class="btn btn-danger btn-sm cancel-btn" data-id="${rowId}">Cancel</button></td>`;
                    } else if (status === 'booked' || status === 'confirmed') {
                        return `<td><button class="btn btn-danger btn-sm cancel-btn" data-id="${rowId}">Cancel</button></td>`;
                    } else {
                        return `<td><span class="badge ${status === 'canceled' ? 'bg-danger' : 'bg-secondary'}">${row.STATUS}</span></td>`;
                    }
                }
            }
            if (h.toUpperCase() === 'PRICE') {
                 return `<td style="white-space: nowrap;">${cellContent}</td>`;
            }
            
            return `<td>${cellContent}</td>`;
        }).join('');
        return `<tr>${rowData}</tr>`;
    }).join('')}</tbody>`;
    return `<div class="table-container"><table>${headerHtml}${bodyHtml}</table></div>`;
};



const renderAvailablePackages = async () => {
    const packages = await fetchData('packages'); 
    if (!packages) {
        updateUIForSection('Available Packages', '<h2>Available Tours</h2><p class="text-danger">Failed to load packages. Please check API connection.</p>');
        return;
    }
    
    allPackages = packages; 

    const packageCardsHtml = packages.map(pkg => {
        const startTime = pkg.START_TIME ? new Date(pkg.START_TIME).toLocaleDateString() : 'Flexible';

        return `
            <div class="package-card">
                <div>
                    <h3 class="text-2xl font-bold text-indigo-700 mb-2">${pkg.TITLE}</h3>
                    <p class="package-description">
                        ${pkg.DESCRIPTION}
                    </p>
                </div>
                
                <div class="package-details">
                    <p class="text-lg font-extrabold text-green-600">Price: ₹${parseFloat(pkg.PRICE).toFixed(2)}</p>
                    <p class="text-sm text-gray-600">Starts: <span class="font-semibold">${startTime}</span></p>
                </div>
                
                <div class="package-actions">
                    <button class="btn btn-primary book-btn w-full" data-id="${pkg.PACKAGE_ID}" data-title="${pkg.TITLE}" data-price="${pkg.PRICE}">Book Now</button>
                    <button class="btn btn-secondary itinerary-btn w-full" data-id="${pkg.PACKAGE_ID}">View Itinerary</button>
                </div>
            </div>
        `;
    }).join('');

    const packagesHtml = `
        <h2 class="text-3xl font-bold text-gray-800 mb-2">Available Tours</h2>
        <p class="mb-8 text-lg text-gray-600">Explore our best packages and book your next adventure!</p>
        <div class="package-card-list">
            ${packageCardsHtml}
        </div>
    `;
    updateUIForSection('Available Packages', packagesHtml);

    contentArea.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', () => showBookingModal(btn.dataset.id, btn.dataset.title, btn.dataset.price));
    });
    contentArea.querySelectorAll('.itinerary-btn').forEach(btn => {
        btn.addEventListener('click', () => renderItinerary(btn.dataset.id));
    });
};

const renderMyBookings = async () => {
    const bookings = await fetchData('bookings');
    if (!bookings) return;

    
    const headers = ['PACKAGE TITLE', 'TOUR DATE', 'BOOKING DATE', 'STARTING POINT', 'STATUS', 'PRICE', 'ACTIONS'];

    const tableHtml = renderTable(bookings, headers, 'BOOKING_ID', 'booking'); 
    
    updateUIForSection('My Bookings', `<h2>My Bookings</h2>${tableHtml}`);

    contentArea.querySelectorAll('.pay-btn').forEach(btn => {
        btn.addEventListener('click', () => showPaymentModal(btn.dataset.id, btn.dataset.amount));
    });

    contentArea.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => handleCancellation(btn.dataset.id));
    });
    
    
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    document.querySelector('.sidebar-nav li[data-section="bookings"]')?.classList.add('active');
};

const renderItinerary = async (packageId) => {
    const itinerary = await fetchData(`itinerary/${packageId}`);
    if (!itinerary) return;

    const headers = ['DAY', 'ACTIVITY'];
    const tableHtml = renderTable(itinerary, headers);
    
    const packageTitle = allPackages.find(p => p.PACKAGE_ID == packageId)?.TITLE || packageId;

    updateUIForSection(`Itinerary for Package ${packageId}`, `
        <h2>Itinerary Details: ${packageTitle}</h2>
        <p class="text-muted">This is the day-by-day plan for the selected package.</p>
        ${tableHtml}
        <button class="btn btn-secondary mt-4" onclick="renderAvailablePackages()">Back to Packages</button>
    `);
};


const showBookingModal = (packageId, title, price) => {

    bookingModalTitle.textContent = `Confirm Booking: ${title}`;
    
    paymentSection.style.display = 'none';
    bookingForm.style.display = 'block';

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); 
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;

    const maxDateObj = new Date(today);
    maxDateObj.setMonth(maxDateObj.getMonth() + 3);
    const max_yyyy = maxDateObj.getFullYear();
    const max_mm = String(maxDateObj.getMonth() + 1).padStart(2, '0');
    const max_dd = String(maxDateObj.getDate()).padStart(2, '0');
    const maxDate = `${max_yyyy}-${max_mm}-${max_dd}`;
    

    bookingForm.innerHTML = `
        <div class="form-group mb-3 p-3 bg-light rounded shadow-sm border border-info">
            <h4 class="text-primary">${title}</h4>
            <p class="mb-0">Price: <strong class="text-success">₹${parseFloat(price).toFixed(2)}</strong></p>
            <p class="text-sm text-danger mt-1">Booking is restricted from ${minDate} to ${maxDate}.</p>
        </div>
        
        <div class="form-group">
            <label for="tour-date-input" class="form-label">Select Tour Date <span class="text-danger">*</span></label>
            <input type="date" id="tour-date-input" class="form-control" required min="${minDate}" max="${maxDate}">
        </div>
        <div class="form-group">
            <label for="starting-point-input" class="form-label">Starting Point <span class="text-danger">*</span></label>
            <input type="text" id="starting-point-input" class="form-control" placeholder="e.g., Your City Name or Hotel" required>
        </div>
        
        <input type="hidden" id="package-id-input" value="${packageId}">
        <input type="hidden" id="package-price-input" value="${price}">
        
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="hideModal('booking-modal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Confirm Booking</button>
        </div>
    `;
    
    bookingModal.style.display = 'block';
};

const showPaymentModal = (bookingId, amount) => {

    bookingModal.style.display = 'block'; 
    
    bookingModalTitle.textContent = 'Complete Payment';
    bookingForm.style.display = 'none';

    paymentAmount.textContent = `₹${parseFloat(amount).toFixed(2)}`;
    bookingIdForPayment.value = bookingId;
    
    paymentSection.style.display = 'block'; 
};


const handleCancellation = (bookingId) => {
    const actionHtml = `
        <button class="btn btn-danger btn-primary">Yes, Cancel Permanently</button>
        <button class="btn btn-secondary">No, Keep Booking</button>
    `;
    
    showCustomModal(
        'Confirm Cancellation', 
        `Are you sure you want to cancel booking ? This action cannot be undone.`, 
        actionHtml, 
        async (confirmed) => {
            if (confirmed) {
                const response = await fetchData(`bookings/${bookingId}/cancel`, 'user', 'PUT');
                if (response) {
                    showCustomModal('Cancellation Success', `<h4 class="text-success">✅ Bookingsuccessfully canceled!</h4>`, `<button class="btn btn-primary">Close</button>`);
                    renderMyBookings();
                }
            }
        }
    );
};


document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'user') {
            window.location.href = 'admin.html';
            return;
        }
        headerWelcome.textContent = `Welcome, ${payload.email}`;
    } catch (e) {
        console.error('Authentication error:', e);
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
    }

 
    renderAvailablePackages();
});

sidebarNav.addEventListener('click', (e) => {
    const section = e.target.closest('li')?.dataset.section;
    if (section) {
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        e.target.closest('li').classList.add('active');
        switch (section) {
            case 'packages': renderAvailablePackages(); break;
            case 'bookings': renderMyBookings(); break;
        }
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentStartingPointInput = bookingForm.querySelector('#starting-point-input');
    const currentPackageIdInput = bookingForm.querySelector('#package-id-input');
    const currentTourDateInput = bookingForm.querySelector('#tour-date-input');
    
    if (!currentStartingPointInput || !currentPackageIdInput || !currentTourDateInput) {
        showCustomModal('Form Error', 'Package or date details were missing from the form. Please try booking again.', `<button class="btn btn-secondary">Close</button>`);
        return;
    }

    const package_id = parseInt(currentPackageIdInput.value);
    const starting_point = currentStartingPointInput.value;
    const tour_date = currentTourDateInput.value; 

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDateObj = new Date(today);
    maxDateObj.setMonth(maxDateObj.getMonth() + 3);
    maxDateObj.setHours(23, 59, 59, 999); 
    const selectedDate = new Date(tour_date);
    
    if (selectedDate < today || selectedDate > maxDateObj) {
        showCustomModal('Date Error', 'The selected tour date is outside the allowed booking window (today up to 3 months from now). Please select a valid date.', `<button class="btn btn-secondary">Close</button>`);
        return; 
    }
    
    const submitButton = bookingForm.querySelector('button[type="submit"]');
    
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
    }

    try {
      
        const response = await fetchData('bookings', 'user', 'POST', { package_id, starting_point, tour_date });
        
        if (response) {
            
            console.log(`[Booking Confirmation] Server returned success (Status 2xx). Closing modal and navigating to bookings.`);

            
            hideModal('booking-modal'); 
            
          
            renderMyBookings();
            
        } else {
          
             bookingModal.style.display = 'block'; 
        }
    } finally {

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Booking'; 
        }
    }
});

processPaymentBtn.addEventListener('click', async () => {
    if (processPaymentBtn.disabled) {
        console.warn('Attempted double-payment blocked.');
        return;
    }

    const booking_id = parseInt(bookingIdForPayment.value);
    
    const packagePrice = parseFloat(paymentAmount.textContent.replace('₹', ''));
    
    const originalButtonText = processPaymentBtn.textContent;

    processPaymentBtn.disabled = true;
    processPaymentBtn.textContent = 'Processing Payment...';

    try {
        const response = await fetchData('payments', 'user', 'POST', { booking_id, amount: packagePrice });

        if (response) {
            hideModal('booking-modal');
            showCustomModal('Payment Successful', `<h4 class="text-success">💰 Payment Completed!</h4><p>Booking is now confirmed.</p>`, `<button class="btn btn-primary">OK</button>`);
            renderMyBookings();
        }
    } finally {
        processPaymentBtn.disabled = false;
        processPaymentBtn.textContent = originalButtonText;
    }
});

bookingModal.querySelectorAll('.modal-close, .btn-secondary').forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target.closest('#booking-modal') && (e.target.classList.contains('modal-close') || e.target.textContent.includes('Cancel'))) {
            hideModal('booking-modal');
        }
    });
});


window.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
        hideModal('booking-modal');
    }
    if (e.target === customModal) {
        customModal.style.display = 'none';
    }
});