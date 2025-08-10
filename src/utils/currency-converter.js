const https = require("https");
const config = require("../config");
const logger = require("./logger");

/**
 * Currency Exchange Rate Fetcher
 * Fetches live exchange rates and converts to Iranian Rials (IRR)
 * Uses currencylayer.com API with professional data
 */

class CurrencyConverter {
  constructor() {
    // Currencylayer API configuration
    this.apiKey = "efb895966703e656b0155a066fd894f0";
    this.baseUrl = "https://api.currencylayer.com/live";
    this.baseCurrency = "USD"; // Currencylayer uses USD as base
    this.targetCurrency = "IRR"; // Iranian Rial

    // Supported currencies for conversion
    this.supportedCurrencies = [
      "USD", // US Dollar
      "EUR", // Euro
      "GBP", // British Pound
      "CAD", // Canadian Dollar
      "AUD", // Australian Dollar
      "JPY", // Japanese Yen
      "CHF", // Swiss Franc
      "CNY", // Chinese Yuan
      "AED", // UAE Dirham
      "SAR", // Saudi Riyal
      "KWD", // Kuwaiti Dinar
      "QAR", // Qatari Riyal
      "TRY", // Turkish Lira
      "IRR", // Iranian Rial
    ];
  }

  /**
   * Fetch exchange rates from currencylayer API
   * @returns {Promise<Object>} Exchange rates data
   */
  async fetchExchangeRates() {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}?access_key=${this.apiKey}&format=1`;

      logger.info(
        `Fetching exchange rates from: ${url.replace(this.apiKey, "[API_KEY]")}`
      );

      const request = https.get(url, (response) => {
        let data = "";

        // Collect data chunks
        response.on("data", (chunk) => {
          data += chunk;
        });

        // Handle response completion
        response.on("end", () => {
          try {
            if (response.statusCode === 200) {
              const exchangeData = JSON.parse(data);

              // Check if API request was successful
              if (exchangeData.success) {
                logger.info(
                  "✅ Successfully fetched exchange rates from currencylayer"
                );
                resolve(exchangeData);
              } else {
                const errorMsg = exchangeData.error
                  ? `${exchangeData.error.code}: ${exchangeData.error.info}`
                  : "Unknown API error";
                reject(new Error(`Currencylayer API error: ${errorMsg}`));
              }
            } else {
              reject(
                new Error(`API returned status code: ${response.statusCode}`)
              );
            }
          } catch (error) {
            reject(
              new Error(`Failed to parse JSON response: ${error.message}`)
            );
          }
        });
      });

      // Handle request errors
      request.on("error", (error) => {
        logger.error(`Request failed: ${error.message}`);
        reject(new Error(`Network request failed: ${error.message}`));
      });

      // Set timeout (10 seconds)
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error("Request timeout - API took too long to respond"));
      });
    });
  }

  /**
   * Convert currency amounts to Iranian Rials
   * @param {Object} quotes - Currencylayer quotes object (e.g., {"USDIRR": 42000, "USDEUR": 0.85})
   * @param {Array} currencies - Array of currency codes to convert
   * @param {number} amount - Amount to convert (default: 1)
   * @returns {Object} Conversion results
   */
  convertToIranianRials(
    quotes,
    currencies = this.supportedCurrencies,
    amount = 1
  ) {
    const conversions = {};
    const irrRate = quotes.USDIRR || quotes["USD" + this.targetCurrency];

    if (!irrRate) {
      throw new Error("Iranian Rial (IRR) rate not found in API response");
    }

    currencies.forEach((currency) => {
      if (currency === "USD") {
        // USD is the base currency in currencylayer
        conversions[currency] = {
          originalAmount: amount,
          convertedAmount: amount * irrRate,
          rate: irrRate,
          formatted: this.formatCurrency(amount * irrRate, "IRR"),
        };
      } else {
        const currencyRate = quotes[`USD${currency}`];
        if (currencyRate) {
          // Convert: amount * (IRR rate / currency rate)
          const convertedAmount = amount * (irrRate / currencyRate);
          conversions[currency] = {
            originalAmount: amount,
            convertedAmount: convertedAmount,
            rate: irrRate / currencyRate,
            formatted: this.formatCurrency(convertedAmount, "IRR"),
          };
        } else {
          logger.warn(`⚠️ Currency ${currency} not found in API response`);
        }
      }
    });

    return conversions;
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, currency) {
    const options = {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    };

    try {
      return new Intl.NumberFormat("fa-IR", options).format(amount);
    } catch (error) {
      // Fallback formatting if locale not supported
      return `${amount.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      })} ${currency}`;
    }
  }

  /**
   * Display exchange rates in a user-friendly format
   * @param {Object} conversions - Conversion results
   * @param {string} baseCurrency - Base currency used
   */
  displayExchangeRates(conversions, baseCurrency = "USD") {
    console.log("\n" + "=".repeat(60));
    console.log("💱 LIVE EXCHANGE RATES TO IRANIAN RIAL (IRR)");
    console.log("=".repeat(60));
    console.log(`📅 Date: ${new Date().toLocaleDateString("fa-IR")}`);
    console.log(`🕐 Time: ${new Date().toLocaleTimeString("fa-IR")}`);
    console.log(`💰 Base: 1 unit of each currency\n`);

    // Sort currencies for better display
    const sortedCurrencies = Object.keys(conversions).sort();

    sortedCurrencies.forEach((currency) => {
      const conversion = conversions[currency];
      const flag = this.getCurrencyFlag(currency);
      const name = this.getCurrencyName(currency);

      console.log(`${flag} ${currency} (${name})`);
      console.log(`   💵 1 ${currency} = ${conversion.formatted}`);
      console.log(
        `   📊 Rate: ${conversion.rate.toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}`
      );
      console.log("");
    });

    console.log("=".repeat(60));
    console.log("📡 Data source: currencylayer.com");
    console.log("⚡ Professional API with real-time rates");
    console.log("=".repeat(60) + "\n");
  }

  /**
   * Get currency flag emoji
   * @param {string} currency - Currency code
   * @returns {string} Flag emoji
   */
  getCurrencyFlag(currency) {
    const flags = {
      USD: "🇺🇸",
      EUR: "🇪🇺",
      GBP: "🇬🇧",
      CAD: "🇨🇦",
      AUD: "🇦🇺",
      JPY: "🇯🇵",
      CHF: "🇨🇭",
      CNY: "🇨🇳",
      AED: "🇦🇪",
      SAR: "🇸🇦",
      KWD: "🇰🇼",
      QAR: "🇶🇦",
      TRY: "🇹🇷",
      IRR: "🇮🇷",
    };
    return flags[currency] || "🏳️";
  }

  /**
   * Get currency full name
   * @param {string} currency - Currency code
   * @returns {string} Currency name
   */
  getCurrencyName(currency) {
    const names = {
      USD: "US Dollar",
      EUR: "Euro",
      GBP: "British Pound",
      CAD: "Canadian Dollar",
      AUD: "Australian Dollar",
      JPY: "Japanese Yen",
      CHF: "Swiss Franc",
      CNY: "Chinese Yuan",
      AED: "UAE Dirham",
      SAR: "Saudi Riyal",
      KWD: "Kuwaiti Dinar",
      QAR: "Qatari Riyal",
      TRY: "Turkish Lira",
    };
    return names[currency] || "Unknown Currency";
  }

  /**
   * Main function to get and display exchange rates
   * @param {Array} currencies - Optional array of specific currencies
   * @param {number} amount - Amount to convert (default: 1)
   */
  async getExchangeRates(currencies = null, amount = 1) {
    try {
      logger.info("🚀 Starting currency exchange rate fetch...");

      // Fetch rates from API
      const ratesData = await this.fetchExchangeRates();

      // Use provided currencies or default supported ones
      const targetCurrencies = currencies || this.supportedCurrencies;

      // Convert to Iranian Rials using currencylayer quotes format
      const conversions = this.convertToIranianRials(
        ratesData.quotes,
        targetCurrencies,
        amount
      );

      // Display results
      this.displayExchangeRates(conversions);

      logger.info("✅ Exchange rate fetch completed successfully");
      return conversions;
    } catch (error) {
      logger.error(`❌ Exchange rate fetch failed: ${error.message}`);
      console.error("\n❌ Error fetching exchange rates:");
      console.error(`   ${error.message}`);
      console.error("\n💡 Possible solutions:");
      console.error("   • Check your internet connection");
      console.error("   • Try again in a few minutes");
      console.error("   • Verify the API service is operational\n");

      throw error;
    }
  }

  /**
   * Get specific currency conversion
   * @param {string} fromCurrency - Source currency
   * @param {number} amount - Amount to convert
   * @returns {Promise<Object>} Conversion result
   */
  async convertCurrency(fromCurrency, amount = 1) {
    try {
      const ratesData = await this.fetchExchangeRates();
      const conversions = this.convertToIranianRials(
        ratesData.quotes,
        [fromCurrency],
        amount
      );
      return conversions[fromCurrency];
    } catch (error) {
      logger.error(`Failed to convert ${fromCurrency}: ${error.message}`);
      throw error;
    }
  }
}

// CLI Usage
async function main() {
  const converter = new CurrencyConverter();

  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Default: show all supported currencies
    await converter.getExchangeRates();
  } else if (args.length === 1) {
    // Single currency or amount
    const arg = args[0].toUpperCase();
    if (converter.supportedCurrencies.includes(arg)) {
      await converter.getExchangeRates([arg]);
    } else {
      const amount = parseFloat(args[0]);
      if (!isNaN(amount)) {
        await converter.getExchangeRates(null, amount);
      } else {
        console.error("❌ Invalid currency code or amount");
      }
    }
  } else if (args.length === 2) {
    // Currency and amount
    const currency = args[0].toUpperCase();
    const amount = parseFloat(args[1]);

    if (converter.supportedCurrencies.includes(currency) && !isNaN(amount)) {
      await converter.getExchangeRates([currency], amount);
    } else {
      console.error("❌ Invalid currency code or amount");
    }
  } else {
    console.log("Usage:");
    console.log(
      "  node currency-converter.js                    # All currencies, 1 unit each"
    );
    console.log(
      "  node currency-converter.js USD               # Specific currency, 1 unit"
    );
    console.log(
      "  node currency-converter.js 100               # All currencies, specific amount"
    );
    console.log(
      "  node currency-converter.js USD 100           # Specific currency and amount"
    );
  }
}

// Export for use in other modules
module.exports = CurrencyConverter;

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logger.error("Script execution failed:", error);
    process.exit(1);
  });
}
