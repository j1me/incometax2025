// Currency formatting utility
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Format number without currency symbol
function formatNumber(amount) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount);
}

// Format number with commas (Indian format)
function formatNumberWithCommas(number) {
  return new Intl.NumberFormat('en-IN').format(number);
}

// Remove commas and convert to number
function parseNumberWithCommas(str) {
  return parseFloat(str.replace(/,/g, '')) || 0;
}

// Quick select button handler
function setIncome(value) {
  const incomeInput = document.getElementById('income');
  incomeInput.value = formatNumberWithCommas(value);
  checkIncomeThreshold();
}

// Format input value with commas as user types
function formatInputValue(input) {
  // Store cursor position
  const cursorPosition = input.selectionStart;
  const originalLength = input.value.length;
  
  // Remove non-digit characters and format
  let value = input.value.replace(/[^\d]/g, '');
  value = parseInt(value) || 0;
  const formattedValue = formatNumberWithCommas(value);
  input.value = formattedValue;

  // Adjust cursor position based on added commas
  const lengthDiff = formattedValue.length - originalLength;
  const newPosition = cursorPosition + lengthDiff;
  input.setSelectionRange(newPosition, newPosition);
}

// Toggle deductions field visibility based on income
function checkIncomeThreshold() {
  const incomeInput = document.getElementById('income');
  const incomeVal = parseNumberWithCommas(incomeInput.value);
  const deductionsContainer = document.getElementById('deductionsContainer');
  const deductionsInput = document.getElementById('deductions');
  
  if (incomeVal < 1200000) {
    deductionsContainer.style.display = 'none';
    deductionsInput.value = ''; // Clear deductions when hidden
  } else {
    deductionsContainer.style.display = 'block';
    if (!deductionsInput.value) {
      deductionsInput.value = '0'; // Set default value
    }
  }
}

// Input validation
function validateInputs(income, deductions) {
  if (isNaN(income) || income < 0) {
    throw new Error("Please enter a valid positive income amount.");
  }
  
  if (deductions < 0) {
    throw new Error("Deductions cannot be negative.");
  }

  if (deductions > income) {
    throw new Error("Deductions cannot be more than income.");
  }

  return true;
}

// New regime tax calculation
function calculateNewRegimeTax(income) {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, income - standardDeduction);
  let tax = 0;
  let breakdown = [];

  breakdown.push({
    label: 'Gross Income',
    amount: income
  });
  
  breakdown.push({
    label: 'Standard Deduction',
    amount: -standardDeduction
  });

  breakdown.push({
    label: 'Taxable Income',
    amount: taxableIncome
  });

  const slabs = [
    { limit: 400000, rate: 0.05, start: 400000 },
    { limit: 400000, rate: 0.10, start: 800000 },
    { limit: 400000, rate: 0.15, start: 1200000 },
    { limit: 400000, rate: 0.20, start: 1600000 },
    { limit: 400000, rate: 0.25, start: 2000000 },
    { limit: Infinity, rate: 0.30, start: 2400000 }
  ];

  let remainingIncome = taxableIncome;
  let slabStart = 400000; // Starting point for taxation

  if (remainingIncome <= slabStart) {
    breakdown.push({
      label: 'Tax on income up to ₹4,00,000 @ 0%',
      amount: 0
    });
    return { tax: 0, breakdown };
  }

  remainingIncome = Math.max(0, taxableIncome - slabStart);

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;
    
    const taxableInSlab = Math.min(remainingIncome, slab.limit);
    const taxInSlab = taxableInSlab * slab.rate;
    
    if (taxableInSlab > 0) {
      breakdown.push({
        label: `Tax on ${formatNumber(taxableInSlab)} @ ${slab.rate * 100}% (${formatNumber(slab.start)} to ${slab.limit === Infinity ? 'above' : formatNumber(slab.start + slab.limit)})`,
        amount: taxInSlab
      });
    }
    
    tax += taxInSlab;
    remainingIncome -= taxableInSlab;
  }

  // Apply rebate under Section 87A for taxable income up to 12,00,000
  if (taxableIncome <= 1200000) {
    breakdown.push({
      label: 'Rebate under Section 87A (income up to ₹12,00,000)',
      amount: -tax
    });
    tax = 0;
  }

  return { tax, breakdown };
}

// Old regime tax calculation
function calculateOldRegimeTax(income, deductions) {
  const standardDeduction = 50000;
  const taxableIncome = Math.max(0, income - standardDeduction - deductions);
  let tax = 0;
  let breakdown = [];

  breakdown.push({
    label: 'Gross Income',
    amount: income
  });

  breakdown.push({
    label: 'Standard Deduction',
    amount: -standardDeduction
  });

  breakdown.push({
    label: 'Other Deductions',
    amount: -deductions
  });

  breakdown.push({
    label: 'Taxable Income',
    amount: taxableIncome
  });

  if (taxableIncome <= 250000) {
    breakdown.push({
      label: 'Tax on income up to ₹2,50,000 @ 0%',
      amount: 0
    });
    return { tax: 0, breakdown };
  }

  if (taxableIncome > 250000) {
    const taxableAmount = Math.min(250000, taxableIncome - 250000);
    const taxInSlab = taxableAmount * 0.05;
    tax += taxInSlab;
    breakdown.push({
      label: `Tax on ${formatNumber(taxableAmount)} @ 5% (₹2.5L to ₹5L)`,
      amount: taxInSlab
    });
  }

  if (taxableIncome > 500000) {
    const taxableAmount = Math.min(500000, taxableIncome - 500000);
    const taxInSlab = taxableAmount * 0.20;
    tax += taxInSlab;
    breakdown.push({
      label: `Tax on ${formatNumber(taxableAmount)} @ 20% (₹5L to ₹10L)`,
      amount: taxInSlab
    });
  }

  if (taxableIncome > 1000000) {
    const taxableAmount = taxableIncome - 1000000;
    const taxInSlab = taxableAmount * 0.30;
    tax += taxInSlab;
    breakdown.push({
      label: `Tax on ${formatNumber(taxableAmount)} @ 30% (Above ₹10L)`,
      amount: taxInSlab
    });
  }

  return { tax, breakdown };
}

function renderBreakdown(breakdown, containerId) {
  const container = document.getElementById(containerId);
  let html = '';

  // First, render all rows
  for (const row of breakdown) {
    html += `
      <div class="breakdown-row">
        <span class="label">${row.label}</span>
        <span class="amount">${formatCurrency(row.amount)}</span>
      </div>
    `;
  }

  // For total tax liability, we only want to sum the tax amounts (not income or deductions)
  const taxableIncomeIndex = breakdown.findIndex(row => row.label === 'Taxable Income');
  const taxRows = breakdown.slice(taxableIncomeIndex + 1);
  const totalTax = taxRows.reduce((sum, row) => sum + row.amount, 0);

  html += `
    <div class="breakdown-row total">
      <span class="label">Total Tax Liability</span>
      <span class="amount">${formatCurrency(Math.max(0, totalTax))}</span>
    </div>
  `;

  container.innerHTML = html;
}

function toggleOldRegimeBreakdown() {
  const details = document.getElementById('oldRegimeBreakdownDetails');
  const toggleText = document.getElementById('oldRegimeToggleText');
  const toggleIcon = document.getElementById('oldRegimeToggleIcon');
  
  if (details.classList.contains('collapsed')) {
    details.classList.remove('collapsed');
    toggleText.textContent = 'Hide breakdown';
    toggleIcon.textContent = '▲';
  } else {
    details.classList.add('collapsed');
    toggleText.textContent = 'Show breakdown';
    toggleIcon.textContent = '▼';
  }
}

// Main calculation function
function calculateTax() {
  try {
    // Clear previous results and errors
    document.getElementById('errorMsg').style.display = 'none';
    document.getElementById('result').style.display = 'none';

    // Get and validate inputs
    const income = parseNumberWithCommas(document.getElementById('income').value);
    const deductions = parseNumberWithCommas(document.getElementById('deductions').value);

    validateInputs(income, deductions);

    // Calculate taxes under both regimes
    const { tax: taxNew, breakdown: breakdownNew } = calculateNewRegimeTax(income);
    const { tax: taxOld, breakdown: breakdownOld } = calculateOldRegimeTax(income, deductions);

    // Display results
    document.getElementById('newRegimeTax').innerHTML = `
      <strong>New Regime Tax:</strong> ${formatCurrency(taxNew)}
    `;

    document.getElementById('oldRegimeTax').innerHTML = `
      <strong>Old Regime Tax:</strong> ${formatCurrency(taxOld)}
    `;

    // Render breakdowns
    renderBreakdown(breakdownNew, 'newRegimeBreakdownDetails');
    renderBreakdown(breakdownOld, 'oldRegimeBreakdownDetails');

    const recommendationElem = document.getElementById('recommendation');
    if (taxNew < taxOld) {
      recommendationElem.innerHTML = `
        <strong>💡 Recommendation:</strong> Choose the <span style="color: #4caf50">New Tax Regime</span><br>
        <small>You save ${formatCurrency(taxOld - taxNew)} annually</small>
      `;
    } else if (taxOld < taxNew) {
      recommendationElem.innerHTML = `
        <strong>💡 Recommendation:</strong> Choose the <span style="color: #4caf50">Old Tax Regime</span><br>
        <small>You save ${formatCurrency(taxNew - taxOld)} annually</small>
      `;
    } else {
      recommendationElem.innerHTML = `
        <strong>💡 Note:</strong> Both tax regimes result in the same tax liability
      `;
    }

    // Show results after calculation
    document.getElementById('result').style.display = 'block';
  } catch (error) {
    displayError(error.message);
  }
}

// Error display function
function displayError(message) {
  const errorElem = document.getElementById('errorMsg');
  errorElem.innerText = message;
  errorElem.style.display = 'block';
  document.getElementById('result').style.display = 'none';
}

// Add event listeners for input formatting
document.addEventListener('DOMContentLoaded', function() {
  const incomeInput = document.getElementById('income');
  const deductionsInput = document.getElementById('deductions');

  incomeInput.addEventListener('input', function() {
    formatInputValue(this);
    checkIncomeThreshold();
  });

  deductionsInput.addEventListener('input', function() {
    formatInputValue(this);
  });
}); 