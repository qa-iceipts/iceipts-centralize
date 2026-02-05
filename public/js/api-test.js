// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Initialize all form handlers
    initVahanForms();
    initEwayForms();
    initEinvoiceForms();
});

// API base URL - adjust based on environment
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api/centralize/api';

// Default dispatcher headers for authentication (update these as needed)
let dispatcherHeaders = {
    'X-Dispatcher-ID': 'test-dispatcher',
    'X-Mine-ID': 'test-mine',
    'X-Org-ID': 'test-org'
};

// Function to update dispatcher headers from UI
function updateDispatcherHeaders() {
    const dispatcherId = document.getElementById('dispatcher-id')?.value;
    const mineId = document.getElementById('mine-id')?.value;
    const orgId = document.getElementById('org-id')?.value;

    if (dispatcherId) dispatcherHeaders['X-Dispatcher-ID'] = dispatcherId;
    if (mineId) dispatcherHeaders['X-Mine-ID'] = mineId;
    if (orgId) dispatcherHeaders['X-Org-ID'] = orgId;
}

// Helper function to make API calls
async function makeApiCall(url, method, data = null) {
    // Update headers from UI before each call
    updateDispatcherHeaders();

    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...dispatcherHeaders
        }
    };

    // Prepend base URL for API calls
    url = API_BASE + url;

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return { success: response.ok, data: result, status: response.status };
    } catch (error) {
        return { success: false, data: { error: error.message }, status: 0 };
    }
}

// Helper function to display response
function displayResponse(elementId, response, section) {
    const responseElement = document.getElementById(elementId);
    responseElement.textContent = JSON.stringify(response.data, null, 2);

    // Add visual feedback to section
    if (response.success) {
        section.classList.remove('error');
        section.classList.add('success');
    } else {
        section.classList.remove('success');
        section.classList.add('error');
    }

    // Remove status classes after 3 seconds
    setTimeout(() => {
        section.classList.remove('success', 'error');
    }, 3000);
}

// VAHAN API Form Handlers
function initVahanForms() {
    // 1. Validate Vehicle RC
    const validateVehicleForm = document.getElementById('vahan-validate-vehicle');
    validateVehicleForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const vehicleNumber = this.vehicleNumber.value;
        const response = await makeApiCall(
            '/gateway/vahan/validate-vehicle',
            'POST',
            { vehicleNumber }
        );

        section.classList.remove('loading');
        displayResponse('vahan-validate-vehicle-response', response, section);
    });

    // 2. Validate Driving License
    const validateDlForm = document.getElementById('vahan-validate-dl');
    validateDlForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const dlNumber = this.dlNumber.value;
        const dob = this.dob?.value || '';
        const response = await makeApiCall(
            '/gateway/vahan/validate-dl',
            'POST',
            { dlNumber, dob }
        );

        section.classList.remove('loading');
        displayResponse('vahan-validate-dl-response', response, section);
    });

    // 3. Save Vehicle Data
    const saveVehicleForm = document.getElementById('vahan-save-vehicle');
    saveVehicleForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        try {
            const vehicleData = JSON.parse(this.vehicleData.value);
            const response = await makeApiCall(
                '/gateway/vahan/save-vehicle',
                'POST',
                vehicleData
            );

            section.classList.remove('loading');
            displayResponse('vahan-save-vehicle-response', response, section);
        } catch (error) {
            section.classList.remove('loading');
            displayResponse('vahan-save-vehicle-response', {
                success: false,
                data: { error: 'Invalid JSON: ' + error.message }
            }, section);
        }
    });

    // 4. Get Vehicle from Database
    const getVehicleForm = document.getElementById('vahan-get-vehicle');
    getVehicleForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const vehicleNumber = this.vehicleNumber.value;
        const response = await makeApiCall(
            `/gateway/vahan/vehicle/${vehicleNumber}`,
            'GET'
        );

        section.classList.remove('loading');
        displayResponse('vahan-get-vehicle-response', response, section);
    });

    // 5. Save Driver Data
    const saveDriverForm = document.getElementById('vahan-save-driver');
    saveDriverForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        try {
            const driverData = JSON.parse(this.driverData.value);
            const response = await makeApiCall(
                '/gateway/vahan/save-driver',
                'POST',
                driverData
            );

            section.classList.remove('loading');
            displayResponse('vahan-save-driver-response', response, section);
        } catch (error) {
            section.classList.remove('loading');
            displayResponse('vahan-save-driver-response', {
                success: false,
                data: { error: 'Invalid JSON: ' + error.message }
            }, section);
        }
    });

    // 6. Get Driver from Database
    const getDriverForm = document.getElementById('vahan-get-driver');
    getDriverForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const dlNumber = this.dlNumber.value;
        const response = await makeApiCall(
            `/gateway/vahan/driver/${dlNumber}`,
            'GET'
        );

        section.classList.remove('loading');
        displayResponse('vahan-get-driver-response', response, section);
    });
}

// eWay Bill API Form Handlers
function initEwayForms() {
    // 1. Generate eWay Bill
    const generateEwayForm = document.getElementById('eway-generate');
    generateEwayForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        try {
            const ewayData = JSON.parse(this.ewayData.value);
            const isMasterEway = this.isMasterEway.checked;

            const response = await makeApiCall(
                '/gateway/eway/generate',
                'POST',
                { ewayData, isMasterEway }
            );

            section.classList.remove('loading');
            displayResponse('eway-generate-response', response, section);
        } catch (error) {
            section.classList.remove('loading');
            displayResponse('eway-generate-response', {
                success: false,
                data: { error: 'Invalid JSON: ' + error.message }
            }, section);
        }
    });

    // 2. Cancel eWay Bill
    const cancelEwayForm = document.getElementById('eway-cancel');
    cancelEwayForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const data = {
            ewayBillNo: this.ewayBillNo.value,
            cancelReason: this.cancelReason.value,
            cancelRemarks: this.cancelRemarks.value,
            isMasterEway: this.isMasterEway.checked
        };

        const response = await makeApiCall(
            '/gateway/eway/cancel',
            'POST',
            data
        );

        section.classList.remove('loading');
        displayResponse('eway-cancel-response', response, section);
    });

    // 3. Extend eWay Bill
    const extendEwayForm = document.getElementById('eway-extend');
    extendEwayForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        try {
            const extensionData = JSON.parse(this.extensionData.value);

            const response = await makeApiCall(
                '/gateway/eway/extend',
                'POST',
                { ewayBillNo: this.ewayBillNo.value, extensionData }
            );

            section.classList.remove('loading');
            displayResponse('eway-extend-response', response, section);
        } catch (error) {
            section.classList.remove('loading');
            displayResponse('eway-extend-response', {
                success: false,
                data: { error: 'Invalid JSON: ' + error.message }
            }, section);
        }
    });
}

// eInvoice API Form Handlers
function initEinvoiceForms() {
    // 1. Generate eInvoice
    const generateEinvoiceForm = document.getElementById('einvoice-generate');
    generateEinvoiceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        try {
            const invoiceData = JSON.parse(this.invoiceData.value);
            const response = await makeApiCall(
                '/gateway/einvoice/generate',
                'POST',
                { invoiceData }
            );

            section.classList.remove('loading');
            displayResponse('einvoice-generate-response', response, section);
        } catch (error) {
            section.classList.remove('loading');
            displayResponse('einvoice-generate-response', {
                success: false,
                data: { error: 'Invalid JSON: ' + error.message }
            }, section);
        }
    });

    // 2. Cancel eInvoice
    const cancelEinvoiceForm = document.getElementById('einvoice-cancel');
    cancelEinvoiceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const data = {
            irn: this.irn.value,
            cancelReason: this.cancelReason.value,
            cancelRemarks: this.cancelRemarks.value
        };

        const response = await makeApiCall(
            '/gateway/einvoice/cancel',
            'POST',
            data
        );

        section.classList.remove('loading');
        displayResponse('einvoice-cancel-response', response, section);
    });

    // 3. Get eInvoice by IRN
    const getByIrnForm = document.getElementById('einvoice-get-irn');
    getByIrnForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const irn = this.irn.value;
        const response = await makeApiCall(
            `/gateway/einvoice/irn/${irn}`,
            'GET'
        );

        section.classList.remove('loading');
        displayResponse('einvoice-get-irn-response', response, section);
    });

    // 4. Get eInvoice by Document Details
    const getByDetailsForm = document.getElementById('einvoice-get-details');
    getByDetailsForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const section = this.closest('.api-section');
        section.classList.add('loading');

        const docType = this.docType.value;
        const docNo = this.docNo.value;
        const docDate = this.docDate.value;

        const response = await makeApiCall(
            `/gateway/einvoice/details?docType=${docType}&docNo=${docNo}&docDate=${docDate}`,
            'GET'
        );

        section.classList.remove('loading');
        displayResponse('einvoice-get-details-response', response, section);
    });
}
