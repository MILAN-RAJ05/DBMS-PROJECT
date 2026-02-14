const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const mainHeaderTitle = document.querySelector('.header-title');
const headerWelcome = document.querySelector('.header-welcome');
const contentArea = document.getElementById('content-area');
const sidebarNav = document.querySelector('.sidebar-nav ul');
const logoutBtn = document.getElementById('logout');

const modalPackage = document.getElementById('modal-package');
const modalTitle = document.getElementById('modal-title');
const packageForm = document.getElementById('package-form');
const packageIdInput = document.getElementById('package-id');
const pkgTitleInput = document.getElementById('pkg-title');
const pkgDescInput = document.getElementById('pkg-desc');
const pkgPriceInput = document.getElementById('pkg-price');
const pkgStartInput = document.getElementById('pkg-start');
const pkgPeopleInput = document.getElementById('pkg-people');
const pkgBusInput = document.getElementById('pkg-bus');
const modalClosePackage = document.querySelector('#modal-package .modal-close');
const cancelBtn = document.getElementById('cancel-btn');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'admin') {
            window.location.href = 'user.html';
            return;
        }
        headerWelcome.textContent = `Welcome, ${payload.email}`;
    } catch (e) {
        console.error('Authentication error:', e);
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
    }

    const initialActive = document.querySelector('.sidebar-nav li[data-section="dashboard"]');
    if (initialActive) {
        initialActive.classList.add('active');
    }

    renderDashboard();
});

const fetchData = async (endpoint, prefix = 'admin', method = 'GET', body = null) => {
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

        const res = await fetch(`${API_URL}/${prefix}/${endpoint}`, options);
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return null;
        }

        const data = await res.json();

        if (res.ok) {
            return data;
        } else {
            throw new Error(data.message || res.statusText);
        }
    } catch (err) {
        console.error(`Error fetching data from ${endpoint}:`, err);
        alert(`Error: ${err.message}`);
        return null;
    }
};

const updateUIForSection = (title, content) => {
    mainHeaderTitle.textContent = title;
    contentArea.innerHTML = content;
};

const renderTable = (data, headers, actions = false, rowIdKey = null, actionType = null) => {
    if (!data || data.length === 0) {
        return '<p>No data found.</p>';
    }

    const headerHtml = `<thead><tr>${headers.map(h => `<th style="white-space: nowrap;">${h}</th>`).join('')}${actions ? `<th style="white-space: nowrap;">Actions</th>` : ''}</tr></thead>`;
    
    const bodyHtml = `<tbody>${data.map(row => {
        const rowData = headers.map(h => {
            const key = h.toUpperCase().replace(/\s/g, '_');
            const value = row[key];
            
            let cellContent = value === null || value === undefined ? '' : String(value);

            let isDateOrTime = false; 
            

            if (h.toUpperCase().includes('DATE') || h.toUpperCase().includes('TIME')) {
                isDateOrTime = true; 
                if (!value) cellContent = ''; 
                else {
                    const dateObj = new Date(value);
                    if (isNaN(dateObj.getTime())) { 
                        cellContent = value; 
                    } else if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0 && dateObj.getSeconds() === 0) {
                        cellContent = dateObj.toLocaleDateString();
                    } else {
                        cellContent = dateObj.toLocaleString();
                    }
                }
            }
            
            if (h.toUpperCase() === 'PRICE' || isDateOrTime || h.toUpperCase() === 'STATUS') {
                return `<td style="white-space: nowrap;">${cellContent}</td>`;
            }

            return `<td>${cellContent}</td>`;
        }).join('');
        
        let actionButtons = '';
        if (actions && rowIdKey && actionType) {
            const rowId = row[rowIdKey.toUpperCase()];
            let editButton = '';
            if (actionType === 'package') {
                editButton = `<button class="btn btn-sm btn-secondary" data-id="${rowId}" data-action="edit">Edit</button>`;
            }
            actionButtons = `<td style="white-space: nowrap;">
                <div style="display: flex; gap: 5px;">
                    ${editButton}
                    <button class="btn btn-sm btn-danger" data-id="${rowId}" data-action="delete" data-type="${actionType}">Delete</button>
                </div>
            </td>`;
        }
        return `<tr>${rowData}${actionButtons}</tr>`;
    }).join('')}</tbody>`;
    
    return `<div class="table-container" style="word-break: break-word; overflow-x: auto;"><table>${headerHtml}${bodyHtml}</table></div>`;
};


const renderDashboard = async () => {
    const stats = await fetchData('stats');
    if (!stats || stats.length === 0) {
        updateUIForSection('Dashboard', '<p>Error fetching dashboard stats.</p>');
        return;
    }
    
    const { PACKAGES, USERS, BOOKINGS, PAYMENTS } = stats[0];
    const dashboardHtml = `
        <div class="cards">
            <div class="card">
                <div class="card-icon"><i class="fa fa-box-open"></i></div>
                <div class="card-info">
                    <h3 style="white-space: nowrap;">${PACKAGES || 0}</h3>
                    <p>Packages</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fa fa-users"></i></div>
                <div class="card-info">
                    <h3 style="white-space: nowrap;">${USERS || 0}</h3>
                    <p>Users</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fa fa-calendar-check"></i></div>
                <div class="card-info">
                    <h3 style="white-space: nowrap;">${BOOKINGS || 0}</h3>
                    <p>Bookings</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fa fa-credit-card"></i></div>
                <div class="card-info">
                    <h3 style="white-space: nowrap;">${PAYMENTS || 0}</h3>
                    <p>Payments</p>
                </div>
            </div>
        </div>
    `;
    updateUIForSection('Dashboard', dashboardHtml);
};

const renderPackages = async () => {
    const packages = await fetchData('packages', 'admin');
    const headers = ['TITLE', 'DESCRIPTION', 'PRICE', 'START_TIME', 'NUMBER_OF_PEOPLE', 'BUS_DETAILS'];
    const tableHtml = renderTable(packages, headers, true, 'PACKAGE_ID', 'package');

    const packagesHtml = `
        <h2>Packages</h2>
        <button class="btn btn-primary" id="add-package-btn">Add New Package</button>
        ${tableHtml}
    `;
    updateUIForSection('Packages', packagesHtml);

    document.getElementById('add-package-btn').addEventListener('click', () => showPackageModal());
    
    if (packages && packages.length > 0) {
      contentArea.querySelectorAll('.btn-secondary[data-action="edit"]').forEach(btn => {
          btn.addEventListener('click', () => {
              const packageId = btn.dataset.id;
              const packageData = packages.find(p => p.PACKAGE_ID == packageId);
              showPackageModal(packageData);
          });
      });
    }

    contentArea.querySelectorAll('.btn-danger[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const rowId = btn.dataset.id;
            if (confirm(`Are you sure you want to delete this package ?`)) {
                const response = await fetchData(`packages/${rowId}`, 'admin', 'DELETE');
                if (response) {
                    alert(response.message);
                    renderPackages();
                }
            }
        });
    });
};

const renderUsers = async () => {
    const users = await fetchData('users', 'admin');
    const headers = ['NAME', 'EMAIL', 'PHONE'];
    const tableHtml = renderTable(users, headers, true, 'USER_ID', 'user');
    updateUIForSection('Users', `<h2>Users</h2>${tableHtml}`);
    
    contentArea.querySelectorAll('.btn-danger[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const rowId = btn.dataset.id;
            if (confirm(`Are you sure you want to delete this user ?`)) {
                const response = await fetchData(`users/${rowId}`, 'admin', 'DELETE');
                if (response) {
                    alert(response.message);
                    renderUsers();
                }
            }
        });
    });
};

const renderBookings = async () => {
    const bookings = await fetchData('bookings', 'admin');
    const headers = ['USER_NAME', 'PACKAGE_TITLE', 'BOOKING_DATE', 'TOUR_DATE', 'STARTING_POINT', 'STATUS'];
    const tableHtml = renderTable(bookings, headers, true, 'BOOKING_ID', 'booking');
    
    const bookingsHtml = `
        <h2>Bookings</h2>
        ${tableHtml}
    `;
    updateUIForSection('Bookings', bookingsHtml);

    contentArea.querySelectorAll('.btn-danger[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const rowId = btn.dataset.id;
            if (confirm(`Are you sure you want to delete this booking ?`)) {
                const response = await fetchData(`bookings/${rowId}`, 'admin', 'DELETE');
                if (response) {
                    alert(response.message);
                    renderBookings();
                }
            }
        });
    });
};

const renderPayments = async () => {
    const payments = await fetchData('payments', 'admin');
    const headers = ['USER_NAME', 'AMOUNT', 'PAYMENT_DATE'];
    const tableHtml = renderTable(payments, headers, false);
    
    const paymentsHtml = `
        <h2>Payments</h2>
        ${tableHtml}
    `;
    updateUIForSection('Payments', paymentsHtml);
};

const renderItinerary = async () => {
    const packages = await fetchData('packages', 'admin');
    if (!packages) {
        updateUIForSection('Itinerary', '<p>Error fetching packages for itinerary management.</p>');
        return;
    }

    const packagesWithItinerary = await Promise.all(packages.map(async pkg => {
        const itinerary = await fetchData(`itinerary/${pkg.PACKAGE_ID}`, 'admin');
        return { ...pkg, itinerary };
    }));

    const itineraryHtml = `
        <h2>Itinerary Management</h2>
        ${packagesWithItinerary.length === 0
            ? '<p>No packages found.</p>'
            : packagesWithItinerary.map(pkg => {
                const headers = ['DAY', 'ACTIVITY'];
                const tableHtml = renderTable(pkg.itinerary, headers, true, 'ITEM_ID', 'itinerary-item');
                return `
                    <h3>Itinerary for ${pkg.TITLE}</h3> 
                    <div class="itinerary-actions">
                        <button class="btn btn-primary btn-sm add-itinerary-item" data-package-id="${pkg.PACKAGE_ID}">Add Item</button>
                    </div>
                    ${tableHtml}
                `;
            }).join('')
        }
    `;
    updateUIForSection('Itinerary', itineraryHtml);

    contentArea.querySelectorAll('.add-itinerary-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            const packageId = btn.dataset.packageId;
            const day = prompt("Enter day number:");
            const activity = prompt("Enter activity:");
            if (day && activity) {
                const response = await fetchData(`itinerary/${packageId}`, 'admin', 'POST', { day, activity });
                if (response) {
                    alert(response.message);
                    renderItinerary();
                }
            }
        });
    });

    contentArea.querySelectorAll('.btn-danger[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemId = btn.dataset.id;
            if (confirm(`Are you sure you want to delete this itinerary item ?`)) {
                const response = await fetchData(`itinerary/${itemId}`, 'admin', 'DELETE');
                if (response) {
                    alert(response.message);
                    renderItinerary();
                }
            }
        });
    });
};

const showPackageModal = (packageData = {}) => {
    modalTitle.textContent = packageData.PACKAGE_ID ? 'Edit Package' : 'Add Package';
    packageIdInput.value = packageData.PACKAGE_ID || '';
    pkgTitleInput.value = packageData.TITLE || '';
    pkgDescInput.value = packageData.DESCRIPTION || '';
    pkgPriceInput.value = packageData.PRICE || '';
    
    pkgStartInput.value = packageData.START_TIME ? new Date(packageData.START_TIME).toISOString().substring(0, 16) : '';
    
    pkgPeopleInput.value = packageData.NUMBER_OF_PEOPLE || '';
    pkgBusInput.value = packageData.BUS_DETAILS || '';

    modalPackage.style.display = 'block';
};

const hidePackageModal = () => {
    modalPackage.style.display = 'none';
};

sidebarNav.addEventListener('click', (e) => {
    const targetLi = e.target.closest('li');
    const section = targetLi?.dataset.section;
    if (section) {
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        targetLi.classList.add('active');
        switch (section) {
            case 'dashboard': renderDashboard(); break;
            case 'packages': renderPackages(); break;
            case 'users': renderUsers(); break;
            case 'bookings': renderBookings(); break;
            case 'payments': renderPayments(); break;
            case 'itinerary': renderItinerary(); break;
        }
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

packageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const packageId = packageIdInput.value;
    const method = packageId ? 'PUT' : 'POST';
    const endpoint = packageId ? `packages/${packageId}` : 'packages';
    
    const body = {
        title: pkgTitleInput.value,
        description: pkgDescInput.value,
        price: parseFloat(pkgPriceInput.value),
        start_time: pkgStartInput.value,
        number_of_people: parseInt(pkgPeopleInput.value),
        bus_details: pkgBusInput.value
    };

    const response = await fetchData(endpoint, 'admin', method, body);
    if (response) {
        alert(response.message);
        hidePackageModal();
        renderPackages();
    }
});

modalClosePackage.addEventListener('click', hidePackageModal);
cancelBtn.addEventListener('click', hidePackageModal);
window.addEventListener('click', (e) => {
    if (e.target === modalPackage) {
        hidePackageModal();
    }
});