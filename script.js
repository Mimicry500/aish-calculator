document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const householdTypeSelect = document.getElementById('household-type');
    const employmentIncomeInput = document.getElementById('employment-income');
    const selfEmploymentIncomeInput = document.getElementById('self-employment-income');
    const otherIncomeInput = document.getElementById('other-income');
    const calculateBtn = document.getElementById('calculate-btn');
    const incomeDisplay = document.getElementById('income-display');
    const exemptionDisplay = document.getElementById('exemption-display');
    const deductionDisplay = document.getElementById('deduction-display');
    const netEffectDisplay = document.getElementById('net-effect-display');
    const aishBenefitDisplay = document.getElementById('aish-benefit-display');
    const totalIncomeDisplay = document.getElementById('total-income-display');
    const paydayTrackerBtn = document.getElementById('payday-tracker-btn');
    const calendarContainer = document.getElementById('calendar-container');
    
    // Add adjustment factor
    let adjustmentFactor = 0;
    
    // AISH program constants - Updated with the correct values
    const AISH_MAX_BENEFIT = 1901; // Current monthly AISH benefit amount ($1,901)
    
    // Updated exemption thresholds based on user information
    const EXEMPTION_SINGLE = 1072; // First $1072 is fully exempt for single person
    const PARTIAL_EXEMPTION_LIMIT_SINGLE = 2009; // Income between $1072 and $2009 is reduced at 50%
    const MAX_EXEMPTION_SINGLE = 1541; // Maximum exemption for single person
    
    // Family exemptions
    const EXEMPTION_FAMILY = 2800; // First $2800 is fully exempt for family
    const PARTIAL_EXEMPTION_LIMIT_FAMILY = 3600; // Income between $2800 and $3600 is reduced at 50%
    const MAX_EXEMPTION_FAMILY = 3200; // Maximum exemption for family
    
    // Format currency function
    function formatCurrency(amount) {
        return '$' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
    
    // Round according to AISH rules (if cents are above 50, round up, otherwise round down)
    function aishRounding(amount) {
        const cents = amount % 1;
        if (cents >= 0.5) {
            return Math.ceil(amount);
        } else {
            return Math.floor(amount);
        }
    }
    
    // Calculate AISH benefit based on all income types and household type
    function calculateAISH(employmentIncome, selfEmploymentIncome, otherIncome, householdType) {
        // Calculate total income
        const totalIncome = employmentIncome + selfEmploymentIncome + otherIncome;
        
        let exemption, deduction;
        
        if (householdType === 'single') {
            // Single person calculation
            if (totalIncome <= EXEMPTION_SINGLE) {
                // Income is fully exempt
                exemption = totalIncome;
                deduction = 0;
            } else if (totalIncome <= PARTIAL_EXEMPTION_LIMIT_SINGLE) {
                // Income between $1072 and $2009 is reduced at 50%
                const incomeAboveExemption = totalIncome - EXEMPTION_SINGLE;
                const partialExemption = incomeAboveExemption * 0.5;
                exemption = EXEMPTION_SINGLE + partialExemption;
                
                // Ensure exemption doesn't exceed maximum
                exemption = Math.min(exemption, MAX_EXEMPTION_SINGLE);
                
                deduction = totalIncome - exemption;
            } else {
                // Income above $2009
                // Maximum exemption is $1541, everything above is dollar for dollar
                exemption = MAX_EXEMPTION_SINGLE;
                deduction = totalIncome - exemption;
            }
        } else {
            // Family calculation using same method as single
            if (totalIncome <= EXEMPTION_FAMILY) {
                // Income is fully exempt
                exemption = totalIncome;
                deduction = 0;
            } else if (totalIncome <= PARTIAL_EXEMPTION_LIMIT_FAMILY) {
                // Income between $2800 and $3600 is reduced at 50%
                const incomeAboveExemption = totalIncome - EXEMPTION_FAMILY;
                const partialExemption = incomeAboveExemption * 0.5;
                exemption = EXEMPTION_FAMILY + partialExemption;
                
                // Ensure exemption doesn't exceed maximum
                exemption = Math.min(exemption, MAX_EXEMPTION_FAMILY);
                
                deduction = totalIncome - exemption;
            } else {
                // Income above $3600
                // Maximum exemption is $3200, everything above is dollar for dollar
                exemption = MAX_EXEMPTION_FAMILY;
                deduction = totalIncome - exemption;
            }
        }
        
        // Apply AISH rounding rules
        deduction = aishRounding(deduction);
        
        // Calculate AISH benefit after deduction
        const aishBenefit = Math.max(0, AISH_MAX_BENEFIT - deduction);
        
        // Apply adjustment factor to get adjusted benefit
        const adjustedBenefit = Math.max(0, aishBenefit + adjustmentFactor);
        
        // Calculate total monthly income (all income + AISH benefit)
        const totalMonthlyIncome = totalIncome + adjustedBenefit;
        
        return {
            income: totalIncome,
            exemption: exemption,
            deduction: deduction,
            netEffect: deduction,
            aishBenefit: aishBenefit,
            adjustedBenefit: adjustedBenefit,
            totalIncome: totalMonthlyIncome
        };
    }
    
    // Generate calendar for payday tracking
    function generateCalendar() {
        // Get current date
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        console.log("Generating calendar for", getMonthName(currentMonth), currentYear);
        
        // Create calendar header
        let calendarHTML = `
            <div class="calendar-header">
                <h3>AISH Reporting Period Tracker (15th to 14th)</h3>
                <p>Track your paychecks that fall within the AISH reporting period</p>
            </div>
            <div class="month-selector">
                <button id="prev-month">&lt; Previous</button>
                <span id="current-month-display">${getMonthName(currentMonth)} ${currentYear}</span>
                <button id="next-month">Next &gt;</button>
                <button id="refresh-calendar" class="refresh-btn">🔄 Refresh</button>
                <button id="force-reload" class="reload-btn">⚡ Force Reload</button>
            </div>
            <div class="calendar">
                <div class="calendar-days">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                </div>
                <div class="calendar-dates" id="calendar-dates">
        `;
        
        // Get first day of month and number of days
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Previous month's days
        const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
        
        // Create calendar days
        let dayCount = 1;
        let nextMonthDay = 1;
        
        // Create rows for the calendar
        for (let i = 0; i < 6; i++) {
            calendarHTML += '<div class="calendar-row">';
            
            // Create columns for each day
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDay) {
                    // Previous month days
                    const prevDay = prevMonthDays - (firstDay - j - 1);
                    calendarHTML += `<div class="calendar-date prev-month" data-date="${prevDay}">${prevDay}</div>`;
                } else if (dayCount > daysInMonth) {
                    // Next month days
                    calendarHTML += `<div class="calendar-date next-month" data-date="${nextMonthDay}">${nextMonthDay}</div>`;
                    nextMonthDay++;
                } else {
                    // Current month days
                    const isReportingStart = dayCount === 15;
                    const isReportingEnd = dayCount === 14;
                    const isToday = dayCount === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                    
                    let classes = 'calendar-date current-month';
                    if (isReportingStart) classes += ' reporting-start';
                    if (isReportingEnd) classes += ' reporting-end';
                    if (isToday) classes += ' today';
                    
                    calendarHTML += `
                        <div class="${classes}" data-date="${dayCount}" data-month="${currentMonth}" data-year="${currentYear}">
                            ${dayCount}
                            <div class="payday-indicator" id="payday-${dayCount}"></div>
                            <div class="payday-amount" id="payday-amount-${dayCount}"></div>
                            <div class="payday-note" id="payday-note-${dayCount}"></div>
                            <div class="aish-indicator" id="aish-${dayCount}"></div>
                            <div class="aish-amount" id="aish-amount-${dayCount}"></div>
                            ${isReportingStart ? '<div class="period-marker start-marker">Start</div>' : ''}
                            ${isReportingEnd ? '<div class="period-marker end-marker">End</div>' : ''}
                        </div>
                    `;
                    dayCount++;
                }
            }
            
            calendarHTML += '</div>';
            
            // Stop if we've already displayed all days
            if (dayCount > daysInMonth && i >= 4) break;
        }
        
        calendarHTML += `
                </div>
            </div>
            <div class="payday-form">
                <h4>Add a Payday</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="payday-date">Date:</label>
                        <input type="date" id="payday-date">
                    </div>
                    <div class="form-group">
                        <label for="payday-amount">Amount ($):</label>
                        <input type="number" id="payday-amount" min="0" step="0.01">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="payday-note">Note:</label>
                        <input type="text" id="payday-note" placeholder="Optional note (e.g., Job name, hours worked)">
                    </div>
                </div>
                <div class="form-buttons">
                    <button id="add-payday-btn">Add Payday</button>
                    <button id="edit-payday-btn" disabled>Update Payday</button>
                    <button id="remove-payday-btn" disabled>Remove Payday</button>
                    <button id="clear-form-btn">Clear Form</button>
                </div>
                <div class="clear-all-container">
                    <button id="clear-all-btn" class="clear-all-btn">Clear All Paydays</button>
                </div>
            </div>
            
            <div class="aish-payment-form">
                <h4>Record Actual AISH Payment</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="aish-payment-date">Payment Date:</label>
                        <input type="date" id="aish-payment-date">
                    </div>
                    <div class="form-group">
                        <label for="aish-payment-amount">Actual Amount Received ($):</label>
                        <input type="number" id="aish-payment-amount" min="0" step="0.01">
                    </div>
                </div>
                <div id="per-payment-adjustment" class="adjustment-info" style="display:none;"></div>
                <div class="form-buttons">
                    <button id="add-aish-payment-btn">Record AISH Payment</button>
                    <button id="remove-aish-payment-btn" disabled>Remove Payment</button>
                </div>
                <div class="clear-all-container">
                    <button id="clear-all-aish-btn" class="clear-all-btn">Clear All AISH Payments</button>
                </div>
            </div>
            
            <div class="adjustment-factor-section">
                <h4>Adjustment Factor Calibration</h4>
                <p>If you notice the calculator consistently predicts a different amount than what you actually receive, use this to adjust the calculation.</p>
                <div class="form-row">
                    <div class="form-group">
                        <label for="adjustment-factor">Adjustment Amount ($):</label>
                        <input type="number" id="adjustment-factor" value="${adjustmentFactor}" step="0.01">
                    </div>
                    <div class="form-group" style="align-self: flex-end;">
                        <button id="apply-adjustment-btn">Apply Adjustment</button>
                    </div>
                </div>
                <div class="learning-status">
                    <p class="adjustment-note">This will adjust future calculations by the specified amount.</p>
                    <p class="data-points">Data points: <span id="adjustment-count">0</span></p>
                </div>
            </div>
            
            <div class="adjustment-history-section">
                <h4>Adjustment History</h4>
                <button id="show-history-btn">Show History</button>
                <div id="adjustment-history" class="adjustment-history" style="display:none;">
                    <p class="loading-text">Loading history...</p>
                </div>
            </div>
            
            <div class="reporting-period-summary">
                <h4>Current Reporting Period Summary (15th of Previous Month to 14th of Current)</h4>
                <div class="summary-item">
                    <span>Total Income This Period:</span>
                    <span id="period-income">$0.00</span>
                </div>
                <div class="summary-item">
                    <span>Estimated AISH Benefit:</span>
                    <span id="period-aish">$0.00</span>
                </div>
                <div class="summary-item">
                    <span>With Adjustment Factor:</span>
                    <span id="period-aish-adjusted">$0.00</span>
                </div>
            </div>
            
            <div class="data-management-section">
                <h4>Data Management</h4>
                <p>Your data is automatically saved in your browser. You can also manage it manually.</p>
                
                <div class="data-management-buttons">
                    <button id="export-data-btn">Export All Data</button>
                    <button id="import-data-btn">Import Data</button>
                    <button id="clear-data-btn" class="danger-btn">Clear All Data</button>
                </div>
                <div class="data-export-area" style="display:none;">
                    <textarea id="export-data-text" readonly></textarea>
                    <button id="copy-data-btn">Copy to Clipboard</button>
                    <button id="close-export-btn">Close</button>
                </div>
                <div class="data-import-area" style="display:none;">
                    <p>Paste your previously exported data here:</p>
                    <textarea id="import-data-text" placeholder="Paste JSON data here..."></textarea>
                    <button id="apply-import-btn">Import Data</button>
                    <button id="cancel-import-btn">Cancel</button>
                </div>
                <p class="data-note">All data is stored locally on your device for privacy.</p>
            </div>
        `;
        
        // Set calendar HTML
        calendarContainer.innerHTML = calendarHTML;
        
        // Add event listeners for calendar controls
        document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
        document.getElementById('refresh-calendar').addEventListener('click', refreshCalendar);
        document.getElementById('force-reload').addEventListener('click', forceReloadPage);
        document.getElementById('add-payday-btn').addEventListener('click', addPayday);
        document.getElementById('edit-payday-btn').addEventListener('click', updatePayday);
        document.getElementById('remove-payday-btn').addEventListener('click', removePayday);
        document.getElementById('clear-form-btn').addEventListener('click', clearPaydayForm);
        
        document.getElementById('clear-all-btn').addEventListener('click', clearAllPaydays);
        document.getElementById('clear-all-aish-btn').addEventListener('click', clearAllAishPayments);
        
        // Add button for data point manager
        const dataManagementSection = document.querySelector('.data-management-section');
        if (dataManagementSection) {
            // Add a data point manager button
            const dataPointManagerBtn = document.createElement('button');
            dataPointManagerBtn.id = 'data-point-manager-btn';
            dataPointManagerBtn.className = 'data-point-btn';
            dataPointManagerBtn.textContent = 'Manage Individual Data Points';
            dataPointManagerBtn.addEventListener('click', openDataPointManager);
            
            // Add to the data management buttons
            const dataManagementButtons = dataManagementSection.querySelector('.data-management-buttons');
            if (dataManagementButtons) {
                dataManagementButtons.appendChild(dataPointManagerBtn);
            }
        }
        
        // Add event listeners for data management
        document.getElementById('export-data-btn').addEventListener('click', exportAllData);
        document.getElementById('import-data-btn').addEventListener('click', importData);
        document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
        document.getElementById('copy-data-btn').addEventListener('click', copyExportData);
        document.getElementById('close-export-btn').addEventListener('click', closeExportArea);
        document.getElementById('apply-import-btn').addEventListener('click', applyImportedData);
        document.getElementById('cancel-import-btn').addEventListener('click', cancelImport);
        
        // Add event listeners to calendar dates for selecting days
        document.querySelectorAll('.calendar-date.current-month').forEach(dateElement => {
            dateElement.addEventListener('click', function() {
                selectCalendarDate(this);
            });
        });
        
        // Add event listeners for AISH payment tracking
        document.getElementById('add-aish-payment-btn').addEventListener('click', addAishPayment);
        document.getElementById('remove-aish-payment-btn').addEventListener('click', removeAishPayment);
        document.getElementById('apply-adjustment-btn').addEventListener('click', applyAdjustmentFactor);
        
        // Load saved paydays
        loadPaydays();
        
        // Load AISH payments
        try {
            if (typeof loadAishPayments === 'function') {
                loadAishPayments();
                console.log("AISH payments loaded");
            } else {
                console.log("loadAishPayments function not available");
            }
        } catch (error) {
            console.error("Error loading AISH payments:", error);
        }
        
        // Load adjustment factor from localStorage
        loadAdjustmentFactor();
        
        // Update learning status
        updateLearningStatus();
        document.getElementById('adjustment-count').textContent = localStorage.getItem('adjustmentCount') || '0';
        
        // Update reporting period summary
        updateReportingPeriodSummary();
        
        // Ensure the buttons work correctly after calendar is generated
        console.log("Calendar generated, event listeners added");
    }
    
    // Select a date from the calendar
    function selectCalendarDate(dateElement) {
        // First remove selected class from any previously selected date
        const selectedDates = document.querySelectorAll('.calendar-date.selected');
        selectedDates.forEach(date => {
            date.classList.remove('selected');
        });
        
        // Add selected class to this date
        dateElement.classList.add('selected');
        
        // Get date information
        const day = dateElement.getAttribute('data-date');
        const month = dateElement.getAttribute('data-month');
        const year = dateElement.getAttribute('data-year');
        
        // Create date object - Fix: Convert day to a number to prevent off-by-one error
        const selectedDate = new Date(parseInt(year), parseInt(month), parseInt(day));
        
        // Format date for input field (YYYY-MM-DD)
        const formattedDate = selectedDate.toISOString().split('T')[0];
        
        // Check if there's an AISH payment on this date
        const aishPayments = JSON.parse(localStorage.getItem('aishPayments') || '{}');
        const aishMonthKey = `${year}-${month}`;
        const hasAishPayment = aishPayments[aishMonthKey] && aishPayments[aishMonthKey][day];
        
        // Check if there's a payday on this date
        const paydays = JSON.parse(localStorage.getItem('paydays') || '{}');
        const paydayMonthKey = `${year}-${month}`;
        const hasPayday = paydays[paydayMonthKey] && paydays[paydayMonthKey][day];
        
        // Set date in both forms
        document.getElementById('payday-date').value = formattedDate;
        document.getElementById('aish-payment-date').value = formattedDate;
        
        if (hasAishPayment) {
            // Fill in existing AISH payment details
            document.getElementById('aish-payment-amount').value = aishPayments[aishMonthKey][day].amount;
            document.getElementById('remove-aish-payment-btn').disabled = false;
            
            // Show adjustment information
            const adjustmentInfo = document.getElementById('per-payment-adjustment');
            if (adjustmentInfo && aishPayments[aishMonthKey][day].adjustment !== undefined) {
                const adjustment = aishPayments[aishMonthKey][day].adjustment;
                const adjustmentText = adjustment >= 0 ? 
                    `+${formatCurrency(adjustment)}` : 
                    formatCurrency(adjustment);
                
                adjustmentInfo.textContent = `This payment's adjustment: ${adjustmentText}`;
                adjustmentInfo.style.display = 'block';
            }
            
            console.log("Existing AISH payment selected, remove button enabled");
        } else {
            // Clear AISH payment form
            document.getElementById('aish-payment-amount').value = '';
            document.getElementById('remove-aish-payment-btn').disabled = true;
            
            // Hide adjustment info
            const adjustmentInfo = document.getElementById('per-payment-adjustment');
            if (adjustmentInfo) {
                adjustmentInfo.style.display = 'none';
            }
        }
        
        if (hasPayday) {
            // Fill in existing payday details
            document.getElementById('payday-amount').value = paydays[paydayMonthKey][day].amount;
            document.getElementById('payday-note').value = paydays[paydayMonthKey][day].note || '';
            
            // Enable edit and remove buttons
            document.getElementById('edit-payday-btn').disabled = false;
            document.getElementById('remove-payday-btn').disabled = false;
            document.getElementById('add-payday-btn').disabled = true;
            
            console.log("Existing payday selected, edit/remove buttons enabled");
        } else {
            // Clear payday form for new payday
            document.getElementById('payday-amount').value = '';
            document.getElementById('payday-note').value = '';
            
            // Disable edit and remove buttons
            document.getElementById('edit-payday-btn').disabled = true;
            document.getElementById('remove-payday-btn').disabled = true;
            document.getElementById('add-payday-btn').disabled = false;
            
            console.log("No payday on this date, add button enabled");
        }
    }
    
    // Clear the payday form
    function clearPaydayForm() {
        document.getElementById('payday-date').value = '';
        document.getElementById('payday-amount').value = '';
        document.getElementById('payday-note').value = '';
        document.getElementById('edit-payday-btn').disabled = true;
        document.getElementById('remove-payday-btn').disabled = true;
        document.getElementById('add-payday-btn').disabled = false;
        
        // We no longer deselect the date in the calendar since it might be needed for AISH payments
        // Instead, we'll add a separate function for clearing the selection completely
    }
    
    // Clear the AISH payment form
    function clearAishPaymentForm() {
        document.getElementById('aish-payment-date').value = '';
        document.getElementById('aish-payment-amount').value = '';
        document.getElementById('remove-aish-payment-btn').disabled = true;
        
        // Hide adjustment info
        const adjustmentInfo = document.getElementById('per-payment-adjustment');
        if (adjustmentInfo) {
            adjustmentInfo.style.display = 'none';
        }
    }
    
    // Clear all forms and deselect date
    function clearSelection() {
        // Clear both forms
        clearPaydayForm();
        clearAishPaymentForm();
        
        // Deselect any selected date in the calendar
        const selectedDates = document.querySelectorAll('.calendar-date.selected');
        selectedDates.forEach(date => {
            date.classList.remove('selected');
        });
    }
    
    // Change month in calendar
    function changeMonth(delta) {
        const monthDisplay = document.getElementById('current-month-display');
        const [monthName, year] = monthDisplay.textContent.split(' ');
        
        let newMonth = getMonthNumber(monthName) + delta;
        let newYear = parseInt(year);
        
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        
        monthDisplay.textContent = `${getMonthName(newMonth)} ${newYear}`;
        
        // Regenerate calendar dates
        updateCalendarDates(newMonth, newYear);
        
        // Load saved paydays for the new month
        loadPaydays();
        
        // Also explicitly load AISH payments for the new month
        loadAishPayments();
        
        // Save current view state
        saveViewState();
    }
    
    // Save the current view state (calendar visibility and current month/year)
    function saveViewState() {
        const monthDisplay = document.getElementById('current-month-display');
        const isCalendarVisible = calendarContainer.style.display === 'block';
        
        const viewState = {
            calendarVisible: isCalendarVisible,
            currentMonthYear: monthDisplay.textContent,
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('viewState', JSON.stringify(viewState));
        console.log('View state saved:', viewState);
        
        // Show save notification
        showSaveNotification('View state saved');
    }
    
    // Load the saved view state
    function loadViewState() {
        const savedState = localStorage.getItem('viewState');
        if (savedState) {
            try {
                const viewState = JSON.parse(savedState);
                
                // If calendar was visible, show it
                if (viewState.calendarVisible) {
                    calendarContainer.style.display = 'block';
                    if (paydayTrackerBtn) {
                        paydayTrackerBtn.textContent = 'Hide Payday Tracker';
                    }
                    
                    // Generate calendar
                    generateCalendar();
                    
                    // Set to the saved month/year if available
                    if (viewState.currentMonthYear) {
                        const currentMonthDisplay = document.getElementById('current-month-display');
                        const [savedMonthName, savedYear] = viewState.currentMonthYear.split(' ');
                        const [currentMonthName, currentYear] = currentMonthDisplay.textContent.split(' ');
                        
                        if (savedMonthName !== currentMonthName || savedYear !== currentYear) {
                            // Navigate to the saved month
                            currentMonthDisplay.textContent = viewState.currentMonthYear;
                            
                            const savedMonth = getMonthNumber(savedMonthName);
                            const savedYearNum = parseInt(savedYear);
                            
                            // Regenerate calendar for the saved month/year
                            updateCalendarDates(savedMonth, savedYearNum);
                            loadPaydays();
                            loadAishPayments();
                        }
                    }
                }
                
                console.log('View state loaded from previous session');
            } catch (error) {
                console.error('Error loading saved view state:', error);
            }
        }
    }
    
    // Update calendar dates when month changes
    function updateCalendarDates(month, year) {
        console.log("Updating calendar for", month, year);
        
        const calendarDates = document.getElementById('calendar-dates');
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const today = new Date();
        
        let calendarHTML = '';
        let dayCount = 1;
        let nextMonthDay = 1;
        
        // Create rows for the calendar
        for (let i = 0; i < 6; i++) {
            calendarHTML += '<div class="calendar-row">';
            
            // Create columns for each day
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDay) {
                    // Previous month days
                    const prevDay = prevMonthDays - (firstDay - j - 1);
                    calendarHTML += `<div class="calendar-date prev-month" data-date="${prevDay}">${prevDay}</div>`;
                } else if (dayCount > daysInMonth) {
                    // Next month days
                    calendarHTML += `<div class="calendar-date next-month" data-date="${nextMonthDay}">${nextMonthDay}</div>`;
                    nextMonthDay++;
                } else {
                    // Current month days
                    const isReportingStart = dayCount === 15;
                    const isReportingEnd = dayCount === 14;
                    const isToday = dayCount === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    
                    let classes = 'calendar-date current-month';
                    if (isReportingStart) classes += ' reporting-start';
                    if (isReportingEnd) classes += ' reporting-end';
                    if (isToday) classes += ' today';
                    
                    calendarHTML += `
                        <div class="${classes}" data-date="${dayCount}" data-month="${month}" data-year="${year}">
                            ${dayCount}
                            <div class="payday-indicator" id="payday-${dayCount}"></div>
                            <div class="payday-amount" id="payday-amount-${dayCount}"></div>
                            <div class="payday-note" id="payday-note-${dayCount}"></div>
                            <div class="aish-indicator" id="aish-${dayCount}"></div>
                            <div class="aish-amount" id="aish-amount-${dayCount}"></div>
                            ${isReportingStart ? '<div class="period-marker start-marker">Start</div>' : ''}
                            ${isReportingEnd ? '<div class="period-marker end-marker">End</div>' : ''}
                        </div>
                    `;
                    dayCount++;
                }
            }
            
            calendarHTML += '</div>';
            
            // Stop if we've already displayed all days
            if (dayCount > daysInMonth && i >= 4) break;
        }
        
        calendarDates.innerHTML = calendarHTML;
        
        // Add event listeners to calendar dates for selecting days
        document.querySelectorAll('.calendar-date.current-month').forEach(dateElement => {
            dateElement.addEventListener('click', function() {
                selectCalendarDate(this);
            });
        });
        
        // Explicitly load both paydays and AISH payments for the current month
        setTimeout(() => {
            loadPaydays();
            loadAishPayments();
        }, 50);
    }
    
    // Add a payday to the calendar
    function addPayday() {
        const paydayDate = document.getElementById('payday-date').value;
        const paydayAmount = parseFloat(document.getElementById('payday-amount').value) || 0;
        const paydayNote = document.getElementById('payday-note').value.trim();
        
        if (!paydayDate || paydayAmount <= 0) {
            alert('Please enter a valid date and amount');
            return;
        }
        
        // Fix: Use the input date parts directly to avoid timezone issues
        const [yearStr, monthStr, dayStr] = paydayDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // Adjust month (0-based in JS)
        const day = parseInt(dayStr);
        
        // Save payday to localStorage
        const paydays = JSON.parse(localStorage.getItem('paydays') || '{}');
        const monthKey = `${year}-${month}`;
        
        if (!paydays[monthKey]) {
            paydays[monthKey] = {};
        }
        
        paydays[monthKey][day] = {
            amount: paydayAmount,
            note: paydayNote
        };
        
        localStorage.setItem('paydays', JSON.stringify(paydays));
        
        // Update calendar
        loadPaydays();
        
        // Clear form
        clearPaydayForm();
        
        // Save paydays with enhanced persistence
        savePaydays();
        
        console.log("Payday added:", day, month, year, paydayAmount);
    }
    
    // Update an existing payday
    function updatePayday() {
        const paydayDate = document.getElementById('payday-date').value;
        const paydayAmount = parseFloat(document.getElementById('payday-amount').value) || 0;
        const paydayNote = document.getElementById('payday-note').value.trim();
        
        if (!paydayDate || paydayAmount <= 0) {
            alert('Please enter a valid date and amount');
            return;
        }
        
        // Fix: Use the input date parts directly to avoid timezone issues
        const [yearStr, monthStr, dayStr] = paydayDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // Adjust month (0-based in JS)
        const day = parseInt(dayStr);
        
        // Update payday in localStorage
        const paydays = JSON.parse(localStorage.getItem('paydays') || '{}');
        const monthKey = `${year}-${month}`;
        
        if (!paydays[monthKey]) {
            paydays[monthKey] = {};
        }
        
        paydays[monthKey][day] = {
            amount: paydayAmount,
            note: paydayNote
        };
        
        localStorage.setItem('paydays', JSON.stringify(paydays));
        
        // Update calendar
        loadPaydays();
        
        // Clear form
        clearPaydayForm();
        
        // Save paydays with enhanced persistence
        savePaydays();
        
        console.log("Payday updated:", day, month, year, paydayAmount);
    }
    
    // Remove a payday (with failsafe regeneration)
    function removePayday() {
        const paydayDate = document.getElementById('payday-date').value;
        
        if (!paydayDate) {
            alert('Please select a payday to remove');
            return;
        }
        
        // Fix: Use the input date parts directly to avoid timezone issues
        const [yearStr, monthStr, dayStr] = paydayDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // Adjust month (0-based in JS)
        const day = parseInt(dayStr);
        
        console.log("REMOVING PAYDAY:", day, month, year);
        
        // Get current state
        const monthDisplay = document.getElementById('current-month-display');
        const [currentMonthName, currentYearStr] = monthDisplay.textContent.split(' ');
        const currentMonth = getMonthNumber(currentMonthName);
        const currentYear = parseInt(currentYearStr);
        
        // Check if the payday is in the current month
        if (month !== currentMonth || year !== currentYear) {
            alert("Please navigate to the month containing the payday you want to remove.");
            return;
        }
        
        // Remove payday from localStorage
        let paydays = JSON.parse(localStorage.getItem('paydays') || '{}');
        const monthKey = `${year}-${month}`;
        
        if (paydays[monthKey] && paydays[monthKey][day]) {
            // Store the information for logging
            const removedAmount = paydays[monthKey][day].amount;
            
            // Delete the payday
            delete paydays[monthKey][day];
            localStorage.setItem('paydays', JSON.stringify(paydays));
            
            console.log(`Removed payday amount ${removedAmount} from day ${day}/${month+1}/${year}`);
            
            // Save paydays with enhanced persistence
            savePaydays();
            
            // Direct DOM update - find the specific elements for this day and clear them
            try {
                const paydayIndicator = document.getElementById(`payday-${day}`);
                const paydayAmount = document.getElementById(`payday-amount-${day}`);
                const paydayNote = document.getElementById(`payday-note-${day}`);
                
                if (paydayIndicator) {
                    paydayIndicator.innerHTML = '';
                    paydayIndicator.textContent = '';
                    paydayIndicator.classList.remove('has-payday');
                    console.log("Cleared payday indicator element");
                }
                
                if (paydayAmount) {
                    paydayAmount.innerHTML = '';
                    paydayAmount.textContent = '';
                    console.log("Cleared payday amount element");
                }
                
                if (paydayNote) {
                    paydayNote.innerHTML = '';
                    paydayNote.textContent = '';
                    console.log("Cleared payday note element");
                }
            } catch (e) {
                console.error("Error during direct DOM clearing:", e);
            }
            
            // FAILSAFE: Completely regenerate calendar after a short delay
            setTimeout(() => {
                try {
                    // Save current month display
                    const currentMonthDisplay = document.getElementById('current-month-display').textContent;
                    
                    // Clear and rebuild calendar
                    calendarContainer.innerHTML = '';
                    generateCalendar();
                    
                    // Verify month matches what we had before
                    const newMonthDisplay = document.getElementById('current-month-display').textContent;
                    if (newMonthDisplay !== currentMonthDisplay) {
                        console.log("Adjusting month after regeneration");
                        // If it doesn't match, try to correct by changing months
                        const [targetMonth, targetYear] = currentMonthDisplay.split(' ');
                        const [currentMonth, currentYear] = newMonthDisplay.split(' ');
                        
                        // Find the difference in months
                        const targetMonthNum = getMonthNumber(targetMonth);
                        const currentMonthNum = getMonthNumber(currentMonth);
                        const targetYearNum = parseInt(targetYear);
                        const currentYearNum = parseInt(currentYear);
                        
                        const monthDiff = (targetYearNum - currentYearNum) * 12 + (targetMonthNum - currentMonthNum);
                        
                        // Adjust to the target month
                        for (let i = 0; i < Math.abs(monthDiff); i++) {
                            changeMonth(Math.sign(monthDiff));
                        }
                    }
                } catch (e) {
                    console.error("Error during failsafe calendar regeneration:", e);
                }
            }, 200);
            
            // Update reporting period summary
            updateReportingPeriodSummary();
            
            // Clear form
            clearSelection();
            
            // Delay the alert slightly to allow the DOM to update
            setTimeout(() => {
                alert(`Payday removed from ${currentMonthName} ${day}, ${currentYear}`);
            }, 100);
        } else {
            alert(`No payday found on ${currentMonthName} ${day}, ${currentYear}`);
        }
    }
    
    // Load saved paydays
    function loadPaydays() {
        const monthDisplay = document.getElementById('current-month-display');
        const [monthName, year] = monthDisplay.textContent.split(' ');
        const month = getMonthNumber(monthName);
        
        console.log("Loading paydays for", monthName, year);
        
        // Get paydays from localStorage
        const paydays = JSON.parse(localStorage.getItem('paydays') || '{}');
        const monthKey = `${year}-${month}`;
        const monthPaydays = paydays[monthKey] || {};
        
        // AGGRESSIVELY clear all payday indicators first
        for (let day = 1; day <= 31; day++) {
            const paydayIndicator = document.getElementById(`payday-${day}`);
            const paydayAmount = document.getElementById(`payday-amount-${day}`);
            const paydayNote = document.getElementById(`payday-note-${day}`);
            
            if (paydayIndicator) {
                paydayIndicator.innerHTML = '';
                paydayIndicator.textContent = '';
                paydayIndicator.classList.remove('has-payday');
            }
            
            if (paydayAmount) {
                paydayAmount.innerHTML = '';
                paydayAmount.textContent = '';
            }
            
            if (paydayNote) {
                paydayNote.innerHTML = '';
                paydayNote.textContent = '';
                paydayNote.setAttribute('title', '');
            }
        }
        
        // Add payday indicators
        for (const day in monthPaydays) {
            const paydayIndicator = document.getElementById(`payday-${day}`);
            const paydayAmount = document.getElementById(`payday-amount-${day}`);
            const paydayNote = document.getElementById(`payday-note-${day}`);
            const paydayData = monthPaydays[day];
            
            if (paydayIndicator) {
                paydayIndicator.textContent = '💰';
                paydayIndicator.classList.add('has-payday');
                console.log("Added payday indicator for day", day);
            } else {
                console.log("Could not find payday indicator for day", day);
            }
            
            if (paydayAmount) {
                paydayAmount.textContent = formatCurrency(paydayData.amount);
                console.log("Added payday amount for day", day);
            } else {
                console.log("Could not find payday amount for day", day);
            }
            
            if (paydayNote && paydayData.note) {
                paydayNote.textContent = '📝';
                paydayNote.setAttribute('title', paydayData.note);
                console.log("Added payday note for day", day);
            }
        }
        
        // Update reporting period summary
        updateReportingPeriodSummary();
        
        console.log("Paydays loaded for", monthName, year);
    }
    
    // Update reporting period summary
    function updateReportingPeriodSummary() {
        const monthDisplay = document.getElementById('current-month-display');
        const [monthName, year] = monthDisplay.textContent.split(' ');
        const currentMonth = getMonthNumber(monthName);
        const currentYear = parseInt(year);
        
        // Get paydays from localStorage
        const paydays = JSON.parse(localStorage.getItem('paydays') || '{}');
        
        // Calculate total income in reporting period (15th of previous month to 14th of current month)
        let totalIncome = 0;
        
        // Calculate previous month
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        
        if (prevMonth < 0) {
            prevMonth = 11; // December
            prevYear--;
        }
        
        // Previous month (15th to end of month)
        const prevMonthKey = `${prevYear}-${prevMonth}`;
        const prevMonthPaydays = paydays[prevMonthKey] || {};
        
        for (const day in prevMonthPaydays) {
            if (parseInt(day) >= 15) {
                totalIncome += prevMonthPaydays[day].amount;
            }
        }
        
        // Current month (1st to 14th)
        const currentMonthKey = `${currentYear}-${currentMonth}`;
        const currentMonthPaydays = paydays[currentMonthKey] || {};
        
        for (const day in currentMonthPaydays) {
            if (parseInt(day) <= 14) {
                totalIncome += currentMonthPaydays[day].amount;
            }
        }
        
        // Update summary display
        document.getElementById('period-income').textContent = formatCurrency(totalIncome);
        
        // Calculate estimated AISH benefit
        const results = calculateAISH(totalIncome, 0, 0, 'single');
        document.getElementById('period-aish').textContent = formatCurrency(results.aishBenefit);
        
        // Add adjusted estimate
        const adjustedBenefit = Math.max(0, results.aishBenefit + adjustmentFactor);
        document.getElementById('period-aish-adjusted').textContent = formatCurrency(adjustedBenefit);
        
        console.log("Reporting period summary updated for", getMonthName(prevMonth), "15 -", getMonthName(currentMonth), "14");
        console.log("Total income in period:", totalIncome);
    }
    
    // Helper function to get month name
    function getMonthName(monthIndex) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthIndex];
    }
    
    // Helper function to get month number
    function getMonthNumber(monthName) {
        const months = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
            'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        return months[monthName];
    }
    
    // Handle calculate button click
    calculateBtn.addEventListener('click', function() {
        const employmentIncome = parseFloat(employmentIncomeInput.value) || 0;
        const selfEmploymentIncome = parseFloat(selfEmploymentIncomeInput.value) || 0;
        const otherIncome = parseFloat(otherIncomeInput.value) || 0;
        const householdType = householdTypeSelect.value;
        
        // Load adjustment factor
        loadAdjustmentFactor();
        
        const results = calculateAISH(employmentIncome, selfEmploymentIncome, otherIncome, householdType);
        
        // Update the display
        incomeDisplay.textContent = formatCurrency(results.income);
        exemptionDisplay.textContent = formatCurrency(results.exemption);
        deductionDisplay.textContent = formatCurrency(results.deduction);
        netEffectDisplay.textContent = formatCurrency(results.netEffect);
        aishBenefitDisplay.textContent = formatCurrency(results.aishBenefit);
        
        // Add adjusted benefit display
        const aishBenefitAdjusted = document.getElementById('aish-benefit-adjusted');
        if (aishBenefitAdjusted) {
            aishBenefitAdjusted.textContent = formatCurrency(results.adjustedBenefit);
        }
        
        totalIncomeDisplay.textContent = formatCurrency(results.totalIncome);
        
        // Add debug info to help troubleshoot
        console.log('Employment Income:', employmentIncome);
        console.log('Self-Employment Income:', selfEmploymentIncome);
        console.log('Other Income:', otherIncome);
        console.log('Total Income:', results.income);
        console.log('Household Type:', householdType);
        console.log('Exemption Amount:', results.exemption);
        console.log('Deduction:', results.deduction);
        console.log('AISH Benefit (Before Adjustment):', results.aishBenefit);
        console.log('Adjustment Factor:', adjustmentFactor);
        console.log('Adjusted AISH Benefit:', results.adjustedBenefit);
        console.log('Total Income + AISH:', results.totalIncome);
    });
    
    // Show/hide payday tracker
    if (paydayTrackerBtn) {
        paydayTrackerBtn.addEventListener('click', function() {
            if (calendarContainer.style.display === 'none' || !calendarContainer.style.display) {
                calendarContainer.style.display = 'block';
                paydayTrackerBtn.textContent = 'Hide Payday Tracker';
                generateCalendar();
                
                // Force loading of AISH payments when calendar becomes visible
                setTimeout(() => {
                    loadAishPayments();
                    console.log("Forced loading of AISH payments after calendar became visible");
                }, 300);
                
                console.log("Payday tracker shown");
            } else {
                calendarContainer.style.display = 'none';
                paydayTrackerBtn.textContent = 'Show Payday Tracker';
                console.log("Payday tracker hidden");
            }
            
            // Save view state when toggling calendar visibility
            saveViewState();
        });
    }
    
    // Recalculate when household type changes
    householdTypeSelect.addEventListener('change', function() {
        if (employmentIncomeInput.value || selfEmploymentIncomeInput.value || otherIncomeInput.value) {
            calculateBtn.click();
        }
    });
    
    // Initialize with empty values
    employmentIncomeInput.value = '';
    selfEmploymentIncomeInput.value = '';
    otherIncomeInput.value = '';
    
    // Add console message to indicate script has loaded
    console.log("AISH Calculator script loaded successfully");
    
    // Function to add AISH payment
    function addAishPayment() {
        const paymentDate = document.getElementById('aish-payment-date').value;
        const paymentAmount = parseFloat(document.getElementById('aish-payment-amount').value) || 0;
        
        if (!paymentDate || paymentAmount <= 0) {
            alert('Please enter a valid date and amount');
            return;
        }
        
        // Fix: Use the input date parts directly to avoid timezone issues
        const [yearStr, monthStr, dayStr] = paymentDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // Adjust month (0-based in JS)
        const day = parseInt(dayStr);
        
        console.log("DEBUG: Trying to add AISH payment", {year, month, day, paymentAmount});
        
        // Calculate expected AISH payment for this period
        const expectedPayment = calculateExpectedAISHPayment(month, year);
        
        // Calculate the difference between actual and expected
        const paymentDifference = paymentAmount - expectedPayment;
        
        // Save AISH payment to localStorage with the adjustment amount
        const aishPayments = JSON.parse(localStorage.getItem('aishPayments') || '{}');
        const monthKey = `${year}-${month}`;
        
        console.log("DEBUG: Using month key", monthKey);
        
        if (!aishPayments[monthKey]) {
            aishPayments[monthKey] = {};
        }
        
        aishPayments[monthKey][day] = {
            amount: paymentAmount,
            date: paymentDate,
            expected: expectedPayment,
            adjustment: paymentDifference
        };
        
        // Save to localStorage
        localStorage.setItem('aishPayments', JSON.stringify(aishPayments));
        localStorage.setItem('aishPayments_backup', JSON.stringify(aishPayments));
        console.log("DEBUG: Saved AISH payments to localStorage", aishPayments);
        
        // Show the per-payment adjustment
        const adjustmentInfo = document.getElementById('per-payment-adjustment');
        if (adjustmentInfo) {
            const adjustmentText = paymentDifference >= 0 ? 
                `+${formatCurrency(paymentDifference)}` : 
                formatCurrency(paymentDifference);
            
            adjustmentInfo.textContent = `This payment's adjustment: ${adjustmentText}`;
            adjustmentInfo.style.display = 'block';
        }
        
        console.log(`Added AISH payment: ${paymentAmount}, expected: ${expectedPayment}, adjustment: ${paymentDifference}`);
        
        // Calculate and update adjustment factor
        calculateAdjustmentFactor();
        
        // Update data points count
        if (document.getElementById('adjustment-count')) {
            document.getElementById('adjustment-count').textContent = localStorage.getItem('adjustmentCount') || '0';
        }
        
        // Clear form
        document.getElementById('aish-payment-date').value = '';
        document.getElementById('aish-payment-amount').value = '';
        document.getElementById('remove-aish-payment-btn').disabled = true;
        
        // Update calendar to show AISH payments
        loadAishPayments();
        updateReportingPeriodSummary();
        
        // Save AISH payments and show notification
        saveAishPayments();
        
        console.log("AISH payment added:", day, month, year, paymentAmount);
        
        // Force re-render the calendar after a short delay
        setTimeout(() => {
            loadAishPayments();
            
            // Check if we need to navigate to the month of the added payment
            const currentMonthDisplay = document.getElementById('current-month-display');
            const [currentMonthName, currentYear] = currentMonthDisplay.textContent.split(' ');
            const currentMonth = getMonthNumber(currentMonthName);
            
            // If the payment was added for a different month, offer to navigate there
            if (month !== currentMonth || year !== parseInt(currentYear)) {
                if (confirm(`AISH payment was added for ${getMonthName(month)} ${year}. Do you want to navigate to that month?`)) {
                    // Update month display
                    currentMonthDisplay.textContent = `${getMonthName(month)} ${year}`;
                    
                    // Update calendar for the new month
                    updateCalendarDates(month, year);
                }
            }
            
            alert('AISH payment saved successfully!');
        }, 200);
    }
    
    // Calculate expected AISH payment for a given month
    function calculateExpectedAISHPayment(month, year) {
        // We need to look at income from the reporting period:
        // 15th of previous month to 14th of current month
        
        // Calculate previous month
        let prevMonth = month - 1;
        let prevYear = year;
        
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear--;
        }
        
        // Get paydays from localStorage
        const paydays = JSON.parse(localStorage.getItem('paydays') || '{}');
        
        // Previous month (15th to end of month)
        const prevMonthKey = `${prevYear}-${prevMonth}`;
        const prevMonthPaydays = paydays[prevMonthKey] || {};
        
        // Current month (1st to 14th)
        const currentMonthKey = `${year}-${month}`;
        const currentMonthPaydays = paydays[currentMonthKey] || {};
        
        // Calculate total income in reporting period
        let totalIncome = 0;
        
        // Previous month (15th to end of month)
        for (const day in prevMonthPaydays) {
            if (parseInt(day) >= 15) {
                totalIncome += prevMonthPaydays[day].amount;
            }
        }
        
        // Current month (1st to 14th)
        for (const day in currentMonthPaydays) {
            if (parseInt(day) <= 14) {
                totalIncome += currentMonthPaydays[day].amount;
            }
        }
        
        // Calculate expected AISH benefit
        const results = calculateAISH(totalIncome, 0, 0, 'single');
        return results.aishBenefit;
    }
    
    // Function to remove AISH payment
    function removeAishPayment() {
        const paymentDate = document.getElementById('aish-payment-date').value;
        
        if (!paymentDate) {
            alert('Please select an AISH payment to remove');
            return;
        }
        
        // Fix: Use the input date parts directly to avoid timezone issues
        const [yearStr, monthStr, dayStr] = paymentDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // Adjust month (0-based in JS)
        const day = parseInt(dayStr);
        
        console.log("REMOVING AISH PAYMENT:", day, month, year);
        
        // Get current state
        const monthDisplay = document.getElementById('current-month-display');
        const [currentMonthName, currentYearStr] = monthDisplay.textContent.split(' ');
        const currentMonth = getMonthNumber(currentMonthName);
        const currentYear = parseInt(currentYearStr);
        
        // Check if the payment is in the current month
        if (month !== currentMonth || year !== currentYear) {
            alert("Please navigate to the month containing the AISH payment you want to remove.");
            return;
        }
        
        // Remove AISH payment from localStorage
        const aishPayments = JSON.parse(localStorage.getItem('aishPayments') || '{}');
        const monthKey = `${year}-${month}`;
        
        if (aishPayments[monthKey] && aishPayments[monthKey][day]) {
            // Store payment info for logging
            const removedAmount = aishPayments[monthKey][day].amount;
            
            // Delete the payment
            delete aishPayments[monthKey][day];
            localStorage.setItem('aishPayments', JSON.stringify(aishPayments));
            
            console.log(`Removed AISH payment of ${removedAmount} from day ${day}/${month+1}/${year}`);
            
            // Direct DOM update - find the specific elements for this day and clear them
            try {
                const aishIndicator = document.getElementById(`aish-${day}`);
                const aishAmount = document.getElementById(`aish-amount-${day}`);
                
                if (aishIndicator) {
                    aishIndicator.innerHTML = '';
                    aishIndicator.textContent = '';
                    console.log("Cleared AISH indicator element");
                }
                
                if (aishAmount) {
                    aishAmount.innerHTML = '';
                    aishAmount.textContent = '';
                    console.log("Cleared AISH amount element");
                }
            } catch (e) {
                console.error("Error during direct DOM clearing:", e);
            }
        }
        
        // Recalculate adjustment factor
        calculateAdjustmentFactor();
        
        // Clear all forms and deselect date
        clearSelection();
        
        // Update calendar after a short delay to ensure all changes are applied
        setTimeout(() => {
            // Update calendar
            loadAishPayments();
            updateReportingPeriodSummary();
            
            // Save AISH payments and show notification
            saveAishPayments();
            
            // Show confirmation message
            alert(`AISH payment removed from ${currentMonthName} ${day}, ${currentYear}`);
        }, 100);
    }
    
    // Function to load AISH payments
    function loadAishPayments() {
        const monthDisplay = document.getElementById('current-month-display');
        const [monthName, year] = monthDisplay.textContent.split(' ');
        const month = getMonthNumber(monthName);
        
        console.log("Loading AISH payments for", monthName, year, "Month index:", month);
        
        // Double-check for backup data if primary data is missing
        let aishPayments;
        try {
            aishPayments = JSON.parse(localStorage.getItem('aishPayments') || '{}');
            
            // If no payments but backup exists, restore from backup
            if (Object.keys(aishPayments).length === 0) {
                const backupData = localStorage.getItem('aishPayments_backup');
                if (backupData) {
                    aishPayments = JSON.parse(backupData);
                    localStorage.setItem('aishPayments', backupData);
                    console.log("Restored AISH payments from backup");
                }
            }
        } catch (e) {
            console.error("Error parsing AISH payments:", e);
            aishPayments = {};
        }
        
        const monthKey = `${year}-${month}`;
        const monthPayments = aishPayments[monthKey] || {};
        
        console.log("AISH payments for month key", monthKey, ":", monthPayments);
        
        // Clear previous AISH indicators - AGGRESSIVELY clear all possible days
        for (let day = 1; day <= 31; day++) {
            const aishIndicator = document.getElementById(`aish-${day}`);
            const aishAmount = document.getElementById(`aish-amount-${day}`);
            
            if (aishIndicator) {
                aishIndicator.textContent = '';
                aishIndicator.title = '';
            }
            
            if (aishAmount) {
                aishAmount.textContent = '';
                aishAmount.title = '';
            }
        }
        
        // Debug: Check if any elements are found for this month
        const hasPayments = Object.keys(monthPayments).length > 0;
        console.log(`Found ${Object.keys(monthPayments).length} AISH payments for ${monthName} ${year}`);
        
        // Add AISH payment indicators to calendar
        for (const day in monthPayments) {
            const aishIndicator = document.getElementById(`aish-${day}`);
            const aishAmount = document.getElementById(`aish-amount-${day}`);
            const paymentData = monthPayments[day];
            
            console.log(`Checking day ${day} for AISH indicator elements:`, 
                        aishIndicator ? "Found indicator" : "Missing indicator", 
                        aishAmount ? "Found amount" : "Missing amount");
            
            if (aishIndicator) {
                // Add different emoji if there's an adjustment
                if (paymentData.adjustment) {
                    if (paymentData.adjustment < 0) {
                        aishIndicator.textContent = '💸'; // Less than expected
                        aishIndicator.title = `Adjustment: ${formatCurrency(paymentData.adjustment)}`;
                    } else if (paymentData.adjustment > 0) {
                        aishIndicator.textContent = '💵+'; // More than expected
                        aishIndicator.title = `Adjustment: +${formatCurrency(paymentData.adjustment)}`;
                    } else {
                        aishIndicator.textContent = '💵'; // As expected
                    }
                } else {
                    aishIndicator.textContent = '💵';
                }
                console.log("Added AISH indicator for day", day);
            } else {
                console.log("Could not find AISH indicator for day", day);
            }
            
            if (aishAmount) {
                aishAmount.textContent = formatCurrency(paymentData.amount);
                // Add adjustment info as title
                if (paymentData.adjustment) {
                    const adjustmentText = paymentData.adjustment >= 0 ? 
                        `+${formatCurrency(paymentData.adjustment)}` : 
                        formatCurrency(paymentData.adjustment);
                    aishAmount.title = `Expected: ${formatCurrency(paymentData.expected)}, Adjustment: ${adjustmentText}`;
                }
                console.log("Added AISH amount for day", day);
            } else {
                console.log("Could not find AISH amount for day", day);
            }
        }
        
        // If there were issues with the AISH display, log the current calendar structure
        if (hasPayments) {
            console.log("Calendar structure for debugging:");
            document.querySelectorAll('.calendar-date').forEach((el, i) => {
                const dateNum = el.getAttribute('data-date');
                const hasAishIndicator = document.getElementById(`aish-${dateNum}`);
                const hasAishAmount = document.getElementById(`aish-amount-${dateNum}`);
                console.log(`Calendar date ${dateNum}: ${hasAishIndicator ? 'Has indicator' : 'No indicator'}, ${hasAishAmount ? 'Has amount' : 'No amount'}`);
            });
        }
    }
    
    // Calculate adjustment factor based on AISH payments and income data
    function calculateAdjustmentFactor() {
        // Get AISH payments and payday data
        const aishPayments = JSON.parse(localStorage.getItem('aishPayments') || '{}');
        
        // Go through each month with AISH payments
        let totalDifference = 0;
        let count = 0;
        let adjustments = [];
        
        for (const monthKey in aishPayments) {
            for (const day in aishPayments[monthKey]) {
                const paymentData = aishPayments[monthKey][day];
                
                // If we already calculated the adjustment when adding the payment
                if (paymentData.adjustment !== undefined) {
                    const difference = paymentData.adjustment;
                    
                    if (!isNaN(difference) && Math.abs(difference) < 1000) {  // Sanity check to avoid outliers
                        totalDifference += difference;
                        count++;
                        
                        // Store individual adjustments for weighted calculation
                        adjustments.push({
                            difference: difference,
                            date: new Date(paymentData.date),
                            expected: paymentData.expected,
                            actual: paymentData.amount
                        });
                    }
                } 
                // Legacy handling for payments without pre-calculated adjustment
                else {
                    const actualPayment = paymentData.amount;
                    
                    // Get the month and year
                    const [year, month] = monthKey.split('-').map(Number);
                    
                    // Calculate expected payment
                    const expectedPayment = calculateExpectedAISHPayment(month, year);
                    
                    // Calculate difference
                    const difference = actualPayment - expectedPayment;
                    
                    if (!isNaN(difference) && Math.abs(difference) < 1000) {  // Sanity check to avoid outliers
                        totalDifference += difference;
                        count++;
                        
                        // Store individual adjustments for weighted calculation
                        adjustments.push({
                            difference: difference,
                            date: new Date(paymentData.date),
                            expected: expectedPayment,
                            actual: actualPayment
                        });
                        
                        // Update the payment data with the calculated adjustment
                        aishPayments[monthKey][day].expected = expectedPayment;
                        aishPayments[monthKey][day].adjustment = difference;
                    }
                }
            }
        }
        
        // Save updated payment data with adjustments
        localStorage.setItem('aishPayments', JSON.stringify(aishPayments));
        
        // Calculate weighted average adjustment, giving more weight to recent entries
        if (adjustments.length > 0) {
            // Sort adjustments by date (newest first)
            adjustments.sort((a, b) => b.date - a.date);
            
            let weightedSum = 0;
            let weightSum = 0;
            
            // Give most recent adjustment weight 3, then 2, then 1, etc.
            adjustments.forEach((adjustment, index) => {
                const weight = Math.max(1, 3 - index * 0.5);
                weightedSum += adjustment.difference * weight;
                weightSum += weight;
                
                console.log(`Adjustment from ${adjustment.date.toLocaleDateString()}: ${adjustment.difference} (weight: ${weight})`);
                console.log(`Expected: ${adjustment.expected}, Actual: ${adjustment.actual}`);
            });
            
            // Set adjustment factor using weighted average, rounded to nearest whole number
            adjustmentFactor = Math.round(weightedSum / weightSum);
            
            // Save to localStorage
            localStorage.setItem('adjustmentFactor', adjustmentFactor.toString());
            localStorage.setItem('adjustmentHistory', JSON.stringify(adjustments));
            
            // Save adjustments count
            localStorage.setItem('adjustmentCount', count.toString());
            
            // Update UI
            if (document.getElementById('adjustment-factor')) {
                document.getElementById('adjustment-factor').value = adjustmentFactor;
            }
            
            // Update learning status
            updateLearningStatus();
            
            console.log('Calculated weighted adjustment factor:', adjustmentFactor);
            
            // Update reporting period summary
            updateReportingPeriodSummary();
        }
    }
    
    // Update the learning status
    function updateLearningStatus() {
        const adjustmentCount = parseInt(localStorage.getItem('adjustmentCount') || '0');
        const adjustmentHistory = JSON.parse(localStorage.getItem('adjustmentHistory') || '[]');
        
        // Find the adjustment status element
        const adjustmentNote = document.querySelector('.adjustment-note');
        if (!adjustmentNote) return;
        
        if (adjustmentCount === 0) {
            adjustmentNote.innerHTML = 'No adjustment data yet. Add your actual AISH payments to improve accuracy.';
            return;
        }
        
        // Calculate consistency
        let consistency = 0;
        
        if (adjustmentHistory.length >= 2) {
            const recentAdjustments = adjustmentHistory.slice(0, Math.min(3, adjustmentHistory.length));
            
            // Calculate the standard deviation of recent adjustments
            const mean = recentAdjustments.reduce((sum, a) => sum + a.difference, 0) / recentAdjustments.length;
            const squareDiffs = recentAdjustments.map(a => Math.pow(a.difference - mean, 2));
            const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
            const stdDev = Math.sqrt(avgSquareDiff);
            
            // Determine consistency based on standard deviation
            if (stdDev < 5) {
                consistency = 3; // Very consistent
            } else if (stdDev < 10) {
                consistency = 2; // Fairly consistent
            } else {
                consistency = 1; // Inconsistent
            }
        }
        
        // Set message based on count and consistency
        let message = '';
        if (adjustmentCount === 1) {
            message = 'Learning started. Add more AISH payment data to improve accuracy.';
        } else if (adjustmentCount === 2) {
            message = 'Basic learning in progress. At least one more data point recommended.';
        } else if (adjustmentCount >= 3) {
            if (consistency === 3) {
                message = 'Highly accurate adjustment based on consistent data. ✅';
            } else if (consistency === 2) {
                message = 'Good accuracy with fairly consistent AISH payments.';
            } else {
                message = 'Adjustment is based on somewhat inconsistent data. Add more recent payments.';
            }
        }
        
        adjustmentNote.innerHTML = message;
    }
    
    // Apply custom adjustment factor
    function applyAdjustmentFactor() {
        const newAdjustment = parseFloat(document.getElementById('adjustment-factor').value) || 0;
        
        // Save to localStorage
        localStorage.setItem('adjustmentFactor', newAdjustment.toString());
        adjustmentFactor = newAdjustment;
        
        // Update reporting period summary
        updateReportingPeriodSummary();
        
        console.log('Applied custom adjustment factor:', adjustmentFactor);
    }
    
    // Load adjustment factor from localStorage
    function loadAdjustmentFactor() {
        const savedAdjustment = localStorage.getItem('adjustmentFactor');
        
        if (savedAdjustment !== null) {
            adjustmentFactor = parseFloat(savedAdjustment);
            
            if (document.getElementById('adjustment-factor')) {
                document.getElementById('adjustment-factor').value = adjustmentFactor;
            }
            
            console.log('Loaded adjustment factor:', adjustmentFactor);
        }
    }
    
    // Function to clear all paydays
    function clearAllPaydays() {
        if (confirm("Are you sure you want to delete ALL paydays from the calendar? This cannot be undone.")) {
            // Completely clear paydays from localStorage
            localStorage.removeItem('paydays');
            console.log("All paydays cleared from localStorage");
            
            // HARD REFRESH - Create a brand new calendar
            console.log("Performing hard refresh of calendar");
            
            // Save the current month and year
            const currentMonthDisplay = document.getElementById('current-month-display');
            let [monthName, yearStr] = currentMonthDisplay.textContent.split(' ');
            let currentMonth = getMonthNumber(monthName);
            let currentYear = parseInt(yearStr);
            
            // Remove the entire calendar container content
            calendarContainer.innerHTML = '';
            
            // Regenerate everything from scratch
            generateCalendar();
            
            // If we were on a different month than the current one, go back to that month
            const newMonthDisplay = document.getElementById('current-month-display');
            const [newMonthName, newYearStr] = newMonthDisplay.textContent.split(' ');
            const newMonth = getMonthNumber(newMonthName);
            const newYear = parseInt(newYearStr);
            
            if (newMonth !== currentMonth || newYear !== currentYear) {
                console.log(`Returning to original month: ${monthName} ${yearStr}`);
                
                // Calculate how many months to move
                const monthDiff = (currentYear - newYear) * 12 + (currentMonth - newMonth);
                
                // Change months as needed
                if (monthDiff !== 0) {
                    for (let i = 0; i < Math.abs(monthDiff); i++) {
                        changeMonth(Math.sign(monthDiff));
                    }
                }
            }
            
            // Clear form
            clearPaydayForm();
            
            alert("All paydays have been cleared from the calendar.");
        }
    }
    
    // Function to force refresh the calendar
    function refreshCalendar() {
        console.log("Forcing calendar refresh");
        generateCalendar();
        alert("Calendar refreshed");
    }
    
    // Force reload the entire page
    function forceReloadPage() {
        if (confirm("This will reload the entire application. Continue?")) {
            window.location.reload();
        }
    }
    
    // Function to display adjustment history
    function displayAdjustmentHistory() {
        const historyContainer = document.getElementById('adjustment-history');
        const adjustmentHistory = JSON.parse(localStorage.getItem('adjustmentHistory') || '[]');
        
        if (adjustmentHistory.length === 0) {
            historyContainer.innerHTML = '<p>No adjustment history available yet.</p>';
            return;
        }
        
        // Sort by date, newest first
        adjustmentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let historyHTML = '<table class="history-table">';
        historyHTML += '<thead><tr><th>Date</th><th>Expected</th><th>Actual</th><th>Difference</th></tr></thead><tbody>';
        
        adjustmentHistory.forEach(entry => {
            const date = new Date(entry.date);
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            const differenceClass = entry.difference > 0 ? 'positive' : (entry.difference < 0 ? 'negative' : '');
            
            historyHTML += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${formatCurrency(entry.expected)}</td>
                    <td>${formatCurrency(entry.actual)}</td>
                    <td class="${differenceClass}">${entry.difference > 0 ? '+' : ''}${formatCurrency(entry.difference)}</td>
                </tr>
            `;
        });
        
        historyHTML += '</tbody></table>';
        historyContainer.innerHTML = historyHTML;
    }

    // Initialize calendar with payday tracker initially hidden
    if (calendarContainer) {
        calendarContainer.style.display = 'none';
    }
    
    // Add event listener for Show History button
    document.getElementById('show-history-btn').addEventListener('click', function() {
        const historyContainer = document.getElementById('adjustment-history');
        if (historyContainer.style.display === 'none') {
            displayAdjustmentHistory();
            historyContainer.style.display = 'block';
            this.textContent = 'Hide History';
        } else {
            historyContainer.style.display = 'none';
            this.textContent = 'Show History';
        }
    });

    // Show a save notification
    function showSaveNotification(message) {
        // Check if notification element exists, if not create it
        let notification = document.getElementById('save-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'save-notification';
            notification.className = 'save-notification';
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = message || 'Data saved';
        notification.classList.add('show');
        
        // Hide after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }

    // Save calculator inputs to localStorage
    function saveCalculatorInputs() {
        const calculatorData = {
            householdType: householdTypeSelect.value,
            employmentIncome: employmentIncomeInput.value,
            selfEmploymentIncome: selfEmploymentIncomeInput.value,
            otherIncome: otherIncomeInput.value,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('calculatorData', JSON.stringify(calculatorData));
        console.log('Calculator data saved:', calculatorData);
        
        // Show save notification
        showSaveNotification('Calculator data saved');
    }
    
    // Load calculator inputs from localStorage
    function loadCalculatorInputs() {
        const savedData = localStorage.getItem('calculatorData');
        if (savedData) {
            try {
                const calculatorData = JSON.parse(savedData);
                
                // Restore values
                householdTypeSelect.value = calculatorData.householdType || 'single';
                employmentIncomeInput.value = calculatorData.employmentIncome || '';
                selfEmploymentIncomeInput.value = calculatorData.selfEmploymentIncome || '';
                otherIncomeInput.value = calculatorData.otherIncome || '';
                
                console.log('Calculator data loaded from previous session');
                
                // If we have values, automatically calculate
                if (employmentIncomeInput.value || selfEmploymentIncomeInput.value || otherIncomeInput.value) {
    calculateBtn.click();
                }
            } catch (error) {
                console.error('Error loading saved calculator data:', error);
            }
        }
    }
    
    // Add event listeners to save data when inputs change
    householdTypeSelect.addEventListener('change', saveCalculatorInputs);
    employmentIncomeInput.addEventListener('change', saveCalculatorInputs);
    selfEmploymentIncomeInput.addEventListener('change', saveCalculatorInputs);
    otherIncomeInput.addEventListener('change', saveCalculatorInputs);
    calculateBtn.addEventListener('click', saveCalculatorInputs);
    
    // Initialize with saved values instead of empty values
    loadCalculatorInputs();
    
    // Load view state from storage
    loadViewState();

    // Function to export all data
    function exportAllData() {
        // Collect all data from localStorage
        const exportData = {
            calculatorData: JSON.parse(localStorage.getItem('calculatorData') || '{}'),
            paydays: JSON.parse(localStorage.getItem('paydays') || '{}'),
            aishPayments: JSON.parse(localStorage.getItem('aishPayments') || '{}'),
            adjustmentFactor: localStorage.getItem('adjustmentFactor') || '0',
            adjustmentHistory: JSON.parse(localStorage.getItem('adjustmentHistory') || '[]'),
            adjustmentCount: localStorage.getItem('adjustmentCount') || '0',
            viewState: JSON.parse(localStorage.getItem('viewState') || '{}'),
            exportDate: new Date().toISOString()
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Show the export area
        const exportArea = document.querySelector('.data-export-area');
        const exportText = document.getElementById('export-data-text');
        
        exportArea.style.display = 'block';
        exportText.value = jsonData;
        
        // Add file download option
        const downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonData));
        
        // Create filename with date
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        downloadLink.setAttribute('download', `aish_calculator_data_${dateStr}.json`);
        downloadLink.textContent = 'Download as File';
        downloadLink.className = 'download-btn';
        
        // Replace existing download button if it exists
        const existingDownloadBtn = document.getElementById('download-data-btn');
        if (existingDownloadBtn) {
            existingDownloadBtn.parentNode.replaceChild(downloadLink, existingDownloadBtn);
        } else {
            downloadLink.id = 'download-data-btn';
            exportArea.insertBefore(downloadLink, exportArea.querySelector('#close-export-btn'));
        }
        
        // Show notification
        showSaveNotification('Data ready for export');
    }
    
    // Function to copy export data to clipboard
    function copyExportData() {
        const exportText = document.getElementById('export-data-text');
        exportText.select();
        document.execCommand('copy');
        
        // Show notification
        showSaveNotification('Data copied to clipboard');
    }
    
    // Function to close the export area
    function closeExportArea() {
        const exportArea = document.querySelector('.data-export-area');
        exportArea.style.display = 'none';
    }
    
    // Function to clear all data
    function clearAllData() {
        if (confirm("WARNING: This will delete ALL your saved data including paydays, AISH payments, and calculator settings. This cannot be undone. Are you sure you want to continue?")) {
            // Clear all relevant localStorage items
            localStorage.removeItem('calculatorData');
            localStorage.removeItem('paydays');
            localStorage.removeItem('aishPayments');
            localStorage.removeItem('adjustmentFactor');
            localStorage.removeItem('adjustmentHistory');
            localStorage.removeItem('adjustmentCount');
            localStorage.removeItem('viewState');
            
            // Reset UI
            resetUI();
            
            // Show notification
            showSaveNotification('All data has been cleared');
            
            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    }
    
    // Function to reset the UI to default state
    function resetUI() {
        // Reset calculator
        householdTypeSelect.value = 'single';
        employmentIncomeInput.value = '';
        selfEmploymentIncomeInput.value = '';
        otherIncomeInput.value = '';
        
        // Reset results
        incomeDisplay.textContent = '$0.00';
        exemptionDisplay.textContent = '$0.00';
        deductionDisplay.textContent = '$0.00';
        netEffectDisplay.textContent = '$0.00';
        aishBenefitDisplay.textContent = '$0.00';
        totalIncomeDisplay.textContent = '$0.00';
        
        // Hide calendar if visible
        if (calendarContainer) {
            calendarContainer.style.display = 'none';
        }
        
        if (paydayTrackerBtn) {
            paydayTrackerBtn.textContent = 'Show Payday Tracker';
        }
        
        // Reset adjustment factor
        adjustmentFactor = 0;
        if (document.getElementById('adjustment-factor')) {
            document.getElementById('adjustment-factor').value = '0';
        }
    }

    // Function to save AISH payments with stronger persistence
    function saveAishPayments() {
        const aishPayments = localStorage.getItem('aishPayments');
        if (aishPayments) {
            try {
                // Double-check the data is valid JSON
                const parsedData = JSON.parse(aishPayments);
                
                // Force a sync save to localStorage
                localStorage.setItem('aishPayments', JSON.stringify(parsedData));
                
                // Also save a backup copy with a different key
                localStorage.setItem('aishPayments_backup', JSON.stringify(parsedData));
                
                console.log('AISH payments saved successfully with backup:', parsedData);
                showSaveNotification('AISH payments saved');
                return true;
            } catch (e) {
                console.error('Error saving AISH payments:', e);
                return false;
            }
        }
        return false;
    }
    
    // Enhanced payday saving function
    function savePaydays() {
        const paydays = localStorage.getItem('paydays');
        if (paydays) {
            try {
                // Double-check the data is valid JSON
                const parsedData = JSON.parse(paydays);
                
                // Force a sync save to localStorage
                localStorage.setItem('paydays', JSON.stringify(parsedData));
                
                // Also save a backup copy with a different key
                localStorage.setItem('paydays_backup', JSON.stringify(parsedData));
                
                console.log('Paydays saved successfully with backup:', parsedData);
                showSaveNotification('Paydays saved');
                return true;
            } catch (e) {
                console.error('Error saving paydays:', e);
                return false;
            }
        }
        return false;
    }
    
    // Add window event listener to ensure data is saved before page unload
    window.addEventListener('beforeunload', function() {
        console.log('Page unloading - saving all data');
        saveCalculatorInputs();
        saveViewState();
        saveAishPayments();
        savePaydays();
    });

    // Function to ensure AISH payments are loaded
    function loadSavedAishPayments() {
        const savedAishPayments = localStorage.getItem('aishPayments');
        if (savedAishPayments) {
            console.log("Found saved AISH payments:", JSON.parse(savedAishPayments));
            
            // Make sure calendar is visible to display AISH payments
            const calendarContainer = document.getElementById('calendar-container');
            const paydayTrackerBtn = document.getElementById('payday-tracker-btn');
            
            if (calendarContainer && (calendarContainer.style.display === 'none' || !calendarContainer.style.display)) {
                calendarContainer.style.display = 'block';
                if (paydayTrackerBtn) {
                    paydayTrackerBtn.textContent = 'Hide Payday Tracker';
                }
                console.log("Calendar was hidden, making it visible for AISH payments");
                generateCalendar();
            } else {
                console.log("Calendar is already visible, refreshing for AISH payments");
                generateCalendar();
            }
            
            // Load AISH payments into calendar
            setTimeout(() => {
                loadAishPayments();
                // Update adjustment factor which is derived from AISH payments
                loadAdjustmentFactor();
                // Show notification
                showSaveNotification('AISH payments restored');
            }, 500);
            
            return true;
        }
        return false;
    }
    
    // Add a call to loadSavedAishPayments at script load
    loadSavedAishPayments();

    // Function to show import data interface
    function importData() {
        const importArea = document.querySelector('.data-import-area');
        importArea.style.display = 'block';
        
        // Hide export area if visible
        const exportArea = document.querySelector('.data-export-area');
        exportArea.style.display = 'none';
    }
    
    // Function to cancel import
    function cancelImport() {
        const importArea = document.querySelector('.data-import-area');
        importArea.style.display = 'none';
        document.getElementById('import-data-text').value = '';
    }
    
    // Function to apply imported data
    function applyImportedData() {
        const importText = document.getElementById('import-data-text').value.trim();
        
        if (!importText) {
            alert('Please paste your exported data first');
            return;
        }
        
        try {
            // Parse the imported data
            const importedData = JSON.parse(importText);
            
            // Validate that it contains expected fields
            if (!importedData.paydays && !importedData.aishPayments) {
                alert('Invalid data format. Could not find paydays or AISH payments data.');
                return;
            }
            
            // Confirm before overwriting existing data
            if (localStorage.getItem('paydays') || localStorage.getItem('aishPayments')) {
                if (!confirm('This will overwrite your existing paydays and AISH payments. Continue?')) {
                    return;
                }
            }
            
            // Import paydays if available
            if (importedData.paydays) {
                localStorage.setItem('paydays', JSON.stringify(importedData.paydays));
                console.log('Paydays imported:', importedData.paydays);
            }
            
            // Import AISH payments if available
            if (importedData.aishPayments) {
                localStorage.setItem('aishPayments', JSON.stringify(importedData.aishPayments));
                console.log('AISH payments imported:', importedData.aishPayments);
            }
            
            // Import adjustment factor and history if available
            if (importedData.adjustmentFactor) {
                localStorage.setItem('adjustmentFactor', importedData.adjustmentFactor);
                adjustmentFactor = parseFloat(importedData.adjustmentFactor);
                console.log('Adjustment factor imported:', adjustmentFactor);
            }
            
            if (importedData.adjustmentHistory) {
                localStorage.setItem('adjustmentHistory', JSON.stringify(importedData.adjustmentHistory));
                console.log('Adjustment history imported:', importedData.adjustmentHistory);
            }
            
            if (importedData.adjustmentCount) {
                localStorage.setItem('adjustmentCount', importedData.adjustmentCount);
                console.log('Adjustment count imported:', importedData.adjustmentCount);
            }
            
            // Close import area
            cancelImport();
            
            // Refresh the calendar to show imported data
            refreshCalendar();
            
            // Show notification
            showSaveNotification('Data imported successfully');
            
            // Update adjustment factor display
            if (document.getElementById('adjustment-factor')) {
                document.getElementById('adjustment-factor').value = adjustmentFactor;
            }
            
            // Update adjustment count display
            if (document.getElementById('adjustment-count')) {
                document.getElementById('adjustment-count').textContent = localStorage.getItem('adjustmentCount') || '0';
            }
            
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Error importing data. Make sure you pasted the exported data correctly.');
        }
    }

    // New function to check and debug AISH payments in the current month
    function checkAishPayments() {
        const monthDisplay = document.getElementById('current-month-display');
        const [monthName, year] = monthDisplay.textContent.split(' ');
        const month = getMonthNumber(monthName);
        
        // Get AISH payments from localStorage
        const aishPayments = JSON.parse(localStorage.getItem('aishPayments') || '{}');
        const monthKey = `${year}-${month}`;
        const monthPayments = aishPayments[monthKey] || {};
        
        // Count payments
        const numPayments = Object.keys(monthPayments).length;
        
        // Create message
        let debugMessage = `AISH Payments for ${monthName} ${year} (Month ${month}):\n\n`;
        
        if (numPayments === 0) {
            debugMessage += `No AISH payments found for this month.\n\n`;
        } else {
            debugMessage += `Found ${numPayments} payment(s):\n\n`;
            
            for (const day in monthPayments) {
                const paymentData = monthPayments[day];
                debugMessage += `Day ${day}: $${paymentData.amount}\n`;
                
                // Check if DOM elements exist
                const aishIndicator = document.getElementById(`aish-${day}`);
                const aishAmount = document.getElementById(`aish-amount-${day}`);
                
                debugMessage += `  - Indicator element: ${aishIndicator ? "Found" : "MISSING"}\n`;
                debugMessage += `  - Amount element: ${aishAmount ? "Found" : "MISSING"}\n\n`;
            }
        }
        
        // Check all localStorage data
        debugMessage += `\nAll AISH Data in localStorage:\n`;
        for (const key in aishPayments) {
            const daysWithPayments = Object.keys(aishPayments[key]).length;
            debugMessage += `Month key ${key}: ${daysWithPayments} payment(s)\n`;
        }
        
        // Force a reload of AISH payments
        loadAishPayments();
        
        // Show debug info
        alert(debugMessage);
    }

    // Add file upload option for import
    const importDataBtn = document.getElementById('import-data-btn');
    if (importDataBtn) {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'file-upload';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Add event listener to the original import button
        importDataBtn.addEventListener('click', function(e) {
            // Show the normal import dialog
            importData();
            
            // Add file upload button if it doesn't exist
            const importArea = document.querySelector('.data-import-area');
            if (!document.getElementById('file-upload-btn')) {
                const uploadBtn = document.createElement('button');
                uploadBtn.id = 'file-upload-btn';
                uploadBtn.textContent = 'Import from File';
                uploadBtn.className = 'upload-btn';
                uploadBtn.addEventListener('click', function() {
                    fileInput.click();
                });
                
                // Add before the Cancel button
                importArea.insertBefore(uploadBtn, document.getElementById('cancel-import-btn'));
            }
        });
        
        // Handle file selection
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('import-data-text').value = e.target.result;
                };
                reader.readAsText(this.files[0]);
            }
        });
    }

    // Function to clear all AISH payments
    function clearAllAishPayments() {
        if (confirm("Are you sure you want to delete ALL AISH payments? This cannot be undone.")) {
            // Completely clear AISH payments from localStorage
            localStorage.removeItem('aishPayments');
            localStorage.removeItem('aishPayments_backup');
            console.log("All AISH payments cleared from localStorage");
            
            // Clear adjustment factor and history
            localStorage.removeItem('adjustmentFactor');
            localStorage.removeItem('adjustmentHistory');
            localStorage.removeItem('adjustmentCount');
            adjustmentFactor = 0;
            
            if (document.getElementById('adjustment-factor')) {
                document.getElementById('adjustment-factor').value = '0';
            }
            
            if (document.getElementById('adjustment-count')) {
                document.getElementById('adjustment-count').textContent = '0';
            }
            
            // HARD REFRESH - Reload the calendar
            console.log("Performing hard refresh of calendar");
            
            // Save the current month and year
            const currentMonthDisplay = document.getElementById('current-month-display');
            let [monthName, yearStr] = currentMonthDisplay.textContent.split(' ');
            let currentMonth = getMonthNumber(monthName);
            let currentYear = parseInt(yearStr);
            
            // Remove the entire calendar container content
            calendarContainer.innerHTML = '';
            
            // Regenerate everything from scratch
            generateCalendar();
            
            // If we were on a different month than the current one, go back to that month
            const newMonthDisplay = document.getElementById('current-month-display');
            const [newMonthName, newYearStr] = newMonthDisplay.textContent.split(' ');
            const newMonth = getMonthNumber(newMonthName);
            const newYear = parseInt(newYearStr);
            
            if (newMonth !== currentMonth || newYear !== currentYear) {
                console.log(`Returning to original month: ${monthName} ${yearStr}`);
                
                // Calculate how many months to move
                const monthDiff = (currentYear - newYear) * 12 + (currentMonth - newMonth);
                
                // Change months as needed
                if (monthDiff !== 0) {
                    for (let i = 0; i < Math.abs(monthDiff); i++) {
                        changeMonth(Math.sign(monthDiff));
                    }
                }
            }
            
            // Clear form
            clearAishPaymentForm();
            
            // Update reporting period summary
            updateReportingPeriodSummary();
            
            alert("All AISH payments have been cleared.");
        }
    }
    
    // Function to open the data point manager
    function openDataPointManager() {
        // Create data point manager window
        window.open('test-storage.html', '_blank');
    }
}); 