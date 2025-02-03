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

// Add debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle income input changes
function handleIncomeChange(input) {
  formatInputValue(input);
  updateClearButton(input);
  checkIncomeThreshold();
  debouncedCalculateTax();
}

// Handle deductions input changes
function handleDeductionsChange(input) {
  formatInputValue(input);
  updateClearButton(input);
  debouncedCalculateTax();
}

// Quick select button handler
function setIncome(value) {
  const incomeInput = document.getElementById('income');
  incomeInput.value = formatNumberWithCommas(value);
  updateClearButton(incomeInput);
  checkIncomeThreshold();
  calculateTax(); // Immediate calculation for button clicks
}

// Format input value with commas as user types
function formatInputValue(input) {
  // Store cursor position
  const cursorPosition = input.selectionStart;
  const originalLength = input.value.length;
  
  // Remove non-digit characters and format
  let value = input.value.replace(/[^\d]/g, '');
  value = parseInt(value) || 0;
  
  // Only show formatted value if it's not zero
  const formattedValue = value === 0 ? '' : formatNumberWithCommas(value);
  input.value = formattedValue;

  // Adjust cursor position based on added commas
  if (formattedValue) {
    const lengthDiff = formattedValue.length - originalLength;
    const newPosition = cursorPosition + lengthDiff;
    input.setSelectionRange(newPosition, newPosition);
  }
}

function updateClearButton(input) {
  const clearButton = document.getElementById(`clear${input.id.charAt(0).toUpperCase() + input.id.slice(1)}`);
  // Only show clear button if input has a non-zero value
  const value = input.value.trim();
  clearButton.style.display = (value && value !== '0') ? 'flex' : 'none';
}

// Toggle deductions field visibility based on income
function checkIncomeThreshold() {
  const incomeInput = document.getElementById('income');
  const incomeVal = parseNumberWithCommas(incomeInput.value);
  const deductionsContainer = document.getElementById('deductionsContainer');
  const deductionsInput = document.getElementById('deductions');
  
  if (incomeVal < 1200000) {
    deductionsContainer.style.display = 'none';
    deductionsInput.value = '';
    updateClearButton(deductionsInput);
    calculateTax(); // Recalculate when deductions are reset
  } else {
    deductionsContainer.style.display = 'block';
    if (!deductionsInput.value) {
      deductionsInput.value = '';
      updateClearButton(deductionsInput);
    }
    updateBreakEvenHint(incomeVal);
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

// Create debounced version of calculateTax
const debouncedCalculateTax = debounce(() => {
  calculateTax();
}, 300);

// Main calculation function
function calculateTax() {
  try {
    // Clear previous errors
    document.getElementById('errorMsg').style.display = 'none';

    // Get and validate inputs
    const income = parseNumberWithCommas(document.getElementById('income').value);
    const deductions = parseNumberWithCommas(document.getElementById('deductions').value || '0');

    // Don't show results for empty input
    if (!income) {
      document.getElementById('result').style.display = 'none';
      return;
    }

    validateInputs(income, deductions);

    // Calculate taxes under both regimes
    const { tax: taxNew, breakdown: breakdownNew } = calculateNewRegimeTax(income);
    const { tax: taxOld, breakdown: breakdownOld } = calculateOldRegimeTax(income, deductions);

    // Display results
    const newRegimeTax = document.getElementById('newRegimeTax');
    const oldRegimeTax = document.getElementById('oldRegimeTax');
    const newRegimeBox = newRegimeTax.closest('.tax-box');
    const oldRegimeBox = oldRegimeTax.closest('.tax-box');

    // Reset classes
    newRegimeBox.classList.remove('highlighted');
    oldRegimeBox.classList.remove('highlighted');
    newRegimeTax.classList.remove('better');
    oldRegimeTax.classList.remove('better');

    // Display tax amounts
    newRegimeTax.innerHTML = formatCurrency(taxNew);
    oldRegimeTax.innerHTML = formatCurrency(taxOld);

    // Calculate and display effective tax rates
    const effectiveRateNew = (taxNew / income) * 100;
    const effectiveRateOld = (taxOld / income) * 100;
    
    document.getElementById('newRegimeRate').innerHTML = `Effective Rate: ${effectiveRateNew.toFixed(1)}%`;
    document.getElementById('oldRegimeRate').innerHTML = `Effective Rate: ${effectiveRateOld.toFixed(1)}%`;

    // Show/hide download button based on input
    const downloadButtons = document.querySelectorAll('.download-button');
    downloadButtons.forEach(button => {
      if (income > 0) {
        button.style.display = 'flex';
      } else {
        button.style.display = 'none';
      }
    });

    // Highlight better option
    const recommendationElem = document.getElementById('recommendation');
    if (taxNew < taxOld) {
      newRegimeBox.classList.add('highlighted');
      newRegimeTax.classList.add('better');
      recommendationElem.innerHTML = `
        <strong>💡 Recommendation:</strong> Choose the <span style="color: #4caf50">New Tax Regime</span><br>
        <small>You save ${formatCurrency(taxOld - taxNew)} annually</small>
      `;
    } else if (taxOld < taxNew) {
      oldRegimeBox.classList.add('highlighted');
      oldRegimeTax.classList.add('better');
      recommendationElem.innerHTML = `
        <strong>💡 Recommendation:</strong> Choose the <span style="color: #4caf50">Old Tax Regime</span><br>
        <small>You save ${formatCurrency(taxNew - taxOld)} annually</small>
      `;
    } else {
      recommendationElem.innerHTML = `
        <strong>💡 Note:</strong> Both tax regimes result in the same tax liability
      `;
    }

    // Render breakdowns
    renderBreakdown(breakdownNew, 'newRegimeBreakdownDetails');
    renderBreakdown(breakdownOld, 'oldRegimeBreakdownDetails');

    // Update break-even hint after tax calculation
    if (income >= 1200000) {
      updateBreakEvenHint(income);
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

// Calculate break-even deductions
function calculateBreakEvenDeductions(income) {
  // Binary search to find break-even point
  let left = 0;
  let right = income;
  const epsilon = 1; // Acceptable difference in rupees

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const { tax: oldTax } = calculateOldRegimeTax(income, mid);
    const { tax: newTax } = calculateNewRegimeTax(income);

    if (Math.abs(oldTax - newTax) < epsilon) {
      return mid;
    }

    if (oldTax > newTax) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return left;
}

// Update break-even hint
function updateBreakEvenHint(income) {
  const breakEvenHint = document.getElementById('breakEvenHint');
  const { tax: newTax } = calculateNewRegimeTax(income);
  const { tax: oldTax } = calculateOldRegimeTax(income, 0);

  if (newTax === 0 && oldTax === 0) {
    breakEvenHint.innerHTML = '';
    return;
  }

  if (newTax < oldTax) {
    const breakEvenAmount = calculateBreakEvenDeductions(income);
    if (breakEvenAmount > income) {
      breakEvenHint.innerHTML = 'Old regime tax will always be higher for this income.';
      return;
    }
    breakEvenHint.innerHTML = `💡 You need deductions of <span class="deduction-amount">₹${formatNumberWithCommas(breakEvenAmount)}</span> to have same tax in both regimes. Click to apply.`;
    breakEvenHint.onclick = () => {
      const deductionsInput = document.getElementById('deductions');
      deductionsInput.value = formatNumberWithCommas(breakEvenAmount);
      updateClearButton(deductionsInput);
      calculateTax();
    };
  } else {
    breakEvenHint.innerHTML = '';
  }
}

// Add event listeners for input formatting
document.addEventListener('DOMContentLoaded', function() {
  const incomeInput = document.getElementById('income');
  const deductionsInput = document.getElementById('deductions');

  incomeInput.addEventListener('input', function() {
    handleIncomeChange(this);
  });

  deductionsInput.addEventListener('input', function() {
    handleDeductionsChange(this);
  });
}); 