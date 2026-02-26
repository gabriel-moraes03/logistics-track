const ORDER_API = 'http://localhost:8080/orders';
const NOTIFICATION_API = 'http://localhost:8081/notifications/stream';

const ORDER_STATUSES = [
    'PENDING',
    'PROCESSED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'COMPLETED'
];

// DOM Elements
const form = document.getElementById('order-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = submitBtn.querySelector('span');
const submitSpinner = document.getElementById('submit-spinner');
const formError = document.getElementById('form-error');
const formSuccess = document.getElementById('form-success');
const sseError = document.getElementById('sse-error');
const notificationContainer = document.getElementById('notification-container');
const emptyState = document.getElementById('empty-state');
const statusIndicator = document.getElementById('system-status-indicator');
const statusText = document.getElementById('system-status-text');
const counterOrders = document.getElementById('counter-orders');
const clearFeedBtn = document.getElementById('clear-feed');
const ordersTableBody = document.getElementById('orders-table-body');
const refreshOrdersBtn = document.getElementById('refresh-orders');

let orderCount = 0;
let eventSource = null;
let reconnectTimeout = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupOrderForm();
    connectSSE();
    fetchOrders();

    refreshOrdersBtn.addEventListener('click', fetchOrders);

    clearFeedBtn.addEventListener('click', () => {
        const notifications = document.querySelectorAll('.notification-item');
        notifications.forEach(n => n.remove());
        emptyState.style.display = 'flex';
        orderCount = 0;
        counterOrders.textContent = '0';
    });
});

// Setup Form Submission
function setupOrderForm() {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Hide messages
        formError.classList.add('hidden');
        formSuccess.classList.add('hidden');

        const customerName = document.getElementById('customerName').value.trim();
        const value = parseFloat(document.getElementById('value').value);

        if (!customerName || isNaN(value)) {
            showError('Please fill all fields correctly.');
            return;
        }

        // Set loading state
        submitBtn.disabled = true;
        btnText.textContent = 'Dispatching...';
        submitSpinner.classList.remove('hidden');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(ORDER_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerName: customerName,
                    amount: value
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Read potential response body from server
                let errMsg = 'API Error';
                try {
                    const errData = await response.json();
                    errMsg = errData.message || errMsg;
                } catch (e) { }
                throw new Error(`Failed to submit order: ${response.status} - ${errMsg}`);
            }

            // Success
            formSuccess.classList.remove('hidden');
            form.reset();
            setTimeout(() => {
                formSuccess.classList.add('hidden');
            }, 3000);

            // Increment local counter optimistically (actual notifications will come via SSE)
            orderCount++;
            counterOrders.textContent = orderCount;

            // Refresh orders table
            fetchOrders();

        } catch (error) {
            console.error('Submission error:', error);
            showError(error.name === 'AbortError' ? 'Connection timed out. Order API is offline.' : error.message);
        } finally {
            // Restore button
            submitBtn.disabled = false;
            btnText.textContent = 'Dispatch Order';
            submitSpinner.classList.add('hidden');
        }
    });
}

async function fetchOrders() {
    try {
        const response = await fetch(ORDER_API);
        if (!response.ok) throw new Error('Failed to fetch orders');

        const orders = await response.json();
        renderOrders(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-red-500 uppercase tracking-widest text-xs">
                    Failed to load orders
                </td>
            </tr>
        `;
    }
}

function renderOrders(orders) {
    if (orders.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-slate-500 uppercase tracking-widest text-xs">
                    No orders found
                </td>
            </tr>
        `;
        return;
    }

    ordersTableBody.innerHTML = '';

    // Sort by createdAt descending
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-900/50 transition-colors';

        const shortId = order.id.split('-')[0];
        const amount = '$' + Number(order.amount).toFixed(2);

        // Build status options
        const statusOptions = ORDER_STATUSES.map(status => {
            return `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`;
        }).join('');

        const statusColors = {
            'PENDING': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
            'PROCESSED': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            'SHIPPED': 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
            'DELIVERED': 'text-green-400 bg-green-400/10 border-green-400/20',
            'CANCELLED': 'text-red-400 bg-red-400/10 border-red-400/20',
            'COMPLETED': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
        };

        const badgeClass = statusColors[order.status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20';

        tr.innerHTML = `
            <td class="p-4 font-mono text-slate-400" title="${order.id}">${shortId}</td>
            <td class="p-4 font-medium text-slate-200">${order.customerName}</td>
            <td class="p-4 font-mono text-brand">${amount}</td>
            <td class="p-4">
                <span class="text-[10px] uppercase tracking-widest px-2 py-0.5 border ${badgeClass}">
                    ${order.status}
                </span>
            </td>
            <td class="p-4 text-right flex justify-end items-center gap-2">
                <select class="status-select bg-dark border border-border text-slate-300 text-xs py-1 px-2 focus:outline-none focus:border-brand" data-id="${order.id}">
                    ${statusOptions}
                </select>
                <button class="update-status-btn bg-border hover:bg-slate-700 text-white text-xs py-1 px-3 transition-colors uppercase tracking-wider" data-id="${order.id}">
                    Save
                </button>
            </td>
        `;

        ordersTableBody.appendChild(tr);
    });

    // Attach event listeners for update buttons
    const updateBtns = document.querySelectorAll('.update-status-btn');
    updateBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const select = document.querySelector(`.status-select[data-id="${id}"]`);
            const newStatus = select.value;

            // disable button
            const originalText = e.target.textContent;
            e.target.textContent = '...';
            e.target.disabled = true;

            await updateOrderStatus(id, newStatus);

            e.target.textContent = originalText;
            e.target.disabled = false;
        });
    });
}

async function updateOrderStatus(id, newStatus) {
    try {
        const response = await fetch(`${ORDER_API}/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to update status');
        }

        fetchOrders();
    } catch (error) {
        console.error('Error updating status:', error);
        alert(`Error updating status: ${error.message}`);
    }
}

function showError(message) {
    formError.textContent = message;
    formError.classList.remove('hidden');
}

// Setup SSE Connection
function connectSSE() {
    if (eventSource) {
        eventSource.close();
    }

    updateStatus('connecting');

    eventSource = new EventSource(NOTIFICATION_API);

    eventSource.onopen = () => {
        console.log('SSE Connection opened');
        sseError.classList.add('hidden');
        updateStatus('connected');
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
    };

    eventSource.onmessage = (event) => {
        try {
            // Some backends send pure text, some send JSON. 
            // Try parsing as JSON first
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                data = event.data; // fallback to string
            }

            addNotificationToFeed(data);
        } catch (err) {
            console.error('Error processing message:', err);
        }
    };

    eventSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        eventSource.close();
        sseError.classList.remove('hidden');
        updateStatus('disconnected');

        // Attempt reconnection after 5 seconds
        if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(connectSSE, 5000);
        }
    };
}

function updateStatus(state) {
    statusIndicator.className = 'w-2.5 h-2.5 rounded-full';

    if (state === 'connected') {
        statusIndicator.classList.add('bg-green-500');
        statusIndicator.classList.add('animate-pulse');
        statusText.textContent = 'System Online';
        statusText.className = 'text-xs font-medium uppercase text-green-400';
    } else if (state === 'connecting') {
        statusIndicator.classList.add('bg-amber-500');
        statusText.textContent = 'Connecting...';
        statusText.className = 'text-xs font-medium uppercase text-amber-400';
    } else {
        statusIndicator.classList.add('bg-red-500');
        statusText.textContent = 'Stream Offline';
        statusText.className = 'text-xs font-medium uppercase text-red-500';
    }
}

function addNotificationToFeed(data) {
    // Hide empty state
    emptyState.style.display = 'none';

    // Create notification element
    const notifEl = document.createElement('div');
    notifEl.className = 'notification-item notification-enter bg-border/30 border border-border p-4 mb-3 relative overflow-hidden group hover:bg-border/50 transition-colors';

    // We don't know the exact structure of data coming from the rabbitMQ via notification-service.
    // Assuming it's an object with customerName, value, or falling back to string representation
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });

    let contentHtml = '';

    if (typeof data === 'object' && data !== null) {
        // Build structured view
        const idStr = data.id ? `<span class= "text-xs text-slate-500 mb-1 block" > ID: ${data.id}</span> ` : '';
        const nameStr = data.customerName || data.name || 'Unknown Customer';
        const valueStr = data.value !== undefined ? `$${Number(data.value).toFixed(2)
            }` : '';

        contentHtml = `
            ${idStr}
        <div class= "flex justify-between items-start">
        <div>
            <p class="text-slate-200 font-medium">${nameStr}</p>
            <p class="text-brand font-mono mt-1">${valueStr}</p>
        </div>
            </div>
            `;
    } else {
        // String view
        contentHtml = `<p class= "text-slate-300 font-mono text-sm break-all" > ${data}</p> `;
    }

    notifEl.innerHTML = `
        <div class= "absolute left-0 top-0 bottom-0 w-1 bg-brand opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <div class="flex justify-between items-start mb-2 pl-2">
            <span class="text-[10px] uppercase tracking-widest text-brand bg-brand/10 px-2 py-0.5 border border-brand/20">
                New Order Event
            </span>
            <span class="text-xs text-slate-500 font-mono">${timestamp}</span>
        </div>
        <div class="pl-2 mt-2">
            ${contentHtml}
        </div>
    `;

    // Insert at the top
    notificationContainer.insertBefore(notifEl, notificationContainer.firstChild);

    // Keep only last 50 notifications to prevent memory issues
    if (notificationContainer.children.length > 51) { // +1 for the empty state element
        notificationContainer.removeChild(notificationContainer.lastChild);
    }
}
