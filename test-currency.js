#!/usr/bin/env node

/**
 * Currency Exchange Rate Test Script
 *
 * This script demonstrates the currency converter functionality
 * Run: node test-currency.js
 */

const CurrencyConverter = require("./src/utils/currency-converter");

async function testCurrencyConverter() {
  console.log("🚀 Testing Currency Converter...\n");

  const converter = new CurrencyConverter();

  try {
    // Test 1: Get all major currencies
    console.log("📊 Test 1: All Major Currencies to IRR");
    console.log("-".repeat(50));
    await converter.getExchangeRates();

    console.log("\n📊 Test 2: Specific Currency (USD)");
    console.log("-".repeat(50));
    await converter.getExchangeRates(["USD"], 100);

    console.log("\n📊 Test 3: European Currencies");
    console.log("-".repeat(50));
    await converter.getExchangeRates(["EUR", "GBP", "CHF"], 50);

    console.log("\n📊 Test 4: Middle Eastern Currencies");
    console.log("-".repeat(50));
    await converter.getExchangeRates(["AED", "SAR", "KWD", "QAR"], 10);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testCurrencyConverter();
}
