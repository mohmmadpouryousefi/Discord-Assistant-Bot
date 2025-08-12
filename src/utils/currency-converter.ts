import https from "https";
import config from "../config";
import logger from "./logger";

/**
 * Exchange rate data structure
 */
interface ExchangeRatesResponse {
  success: boolean;
  terms?: string;
  privacy?: string;
  timestamp?: number;
  source?: string;
  quotes?: { [key: string]: number };
  error?: {
    code: number;
    info: string;
  };
}

/**
 * Currency conversion result
 */
interface ConversionResult {
  success: boolean;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
  timestamp: Date;
  formattedAmount?: string;
  error?: string;
}

/**
 * Currency Exchange Rate Fetcher
 * Fetches live exchange rates and converts to Iranian Rials (IRR)
 * Uses currencylayer.com API with professional data
 */
class CurrencyConverter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly baseCurrency: string;
  private readonly targetCurrency: string;
  public readonly supportedCurrencies: string[];

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
   * @returns {Promise<ExchangeRatesResponse>} Exchange rates data
   */
  async fetchExchangeRates(): Promise<ExchangeRatesResponse> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}?access_key=${this.apiKey}&format=1`;

      logger.info(
        `Fetching exchange rates from: ${url.replace(this.apiKey, "[API_KEY]")}`
      );

      const request = https.get(url, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const parsedData: ExchangeRatesResponse = JSON.parse(data);

            if (parsedData.success) {
              logger.info("Exchange rates fetched successfully");
              resolve(parsedData);
            } else {
              const errorMsg = parsedData.error
                ? `API Error: ${parsedData.error.info} (Code: ${parsedData.error.code})`
                : "Unknown API error";
              logger.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            logger.error("Failed to parse exchange rates response:", error);
            reject(error);
          }
        });
      });

      request.on("error", (error) => {
        logger.error("HTTP request failed:", error);
        reject(error);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        const timeoutError = new Error("Exchange rates request timeout");
        logger.error(timeoutError.message);
        reject(timeoutError);
      });
    });
  }

  /**
   * Convert amount from one currency to Iranian Rial
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @returns {Promise<ConversionResult>} Conversion result
   */
  async convertToIRR(amount: number, fromCurrency: string): Promise<ConversionResult> {
    try {
      fromCurrency = fromCurrency.toUpperCase();

      // Validate input
      if (!this.supportedCurrencies.includes(fromCurrency)) {
        throw new Error(`Unsupported currency: ${fromCurrency}`);
      }

      if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      // If already IRR, return as-is
      if (fromCurrency === "IRR") {
        return {
          success: true,
          fromCurrency,
          toCurrency: "IRR",
          amount,
          convertedAmount: amount,
          exchangeRate: 1,
          timestamp: new Date(),
          formattedAmount: this.formatPersianNumber(amount),
        };
      }

      // Fetch current exchange rates
      const ratesData = await this.fetchExchangeRates();

      if (!ratesData.quotes) {
        throw new Error("No exchange rates data available");
      }

      // Get IRR rate (USD to IRR)
      const usdToIrrRate = ratesData.quotes["USDIRR"];
      if (!usdToIrrRate) {
        throw new Error("IRR exchange rate not available");
      }

      let convertedAmount: number;
      let exchangeRate: number;

      if (fromCurrency === "USD") {
        // Direct USD to IRR conversion
        convertedAmount = amount * usdToIrrRate;
        exchangeRate = usdToIrrRate;
      } else {
        // Convert other currency to USD first, then to IRR
        const fromCurrencyToUsdKey = `USD${fromCurrency}`;
        const fromCurrencyToUsdRate = ratesData.quotes[fromCurrencyToUsdKey];

        if (!fromCurrencyToUsdRate) {
          throw new Error(`Exchange rate for ${fromCurrency} not available`);
        }

        // Convert to USD first, then to IRR
        const usdAmount = amount / fromCurrencyToUsdRate;
        convertedAmount = usdAmount * usdToIrrRate;
        exchangeRate = usdToIrrRate / fromCurrencyToUsdRate;
      }

      const result: ConversionResult = {
        success: true,
        fromCurrency,
        toCurrency: "IRR",
        amount,
        convertedAmount: Math.round(convertedAmount),
        exchangeRate,
        timestamp: new Date(),
        formattedAmount: this.formatPersianNumber(Math.round(convertedAmount)),
      };

      logger.info(
        `Converted ${amount} ${fromCurrency} to ${result.convertedAmount} IRR`
      );

      return result;
    } catch (error) {
      logger.error("Currency conversion failed:", error);
      return {
        success: false,
        fromCurrency,
        toCurrency: "IRR",
        amount,
        convertedAmount: 0,
        exchangeRate: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get exchange rate for a specific currency pair
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<number>} Exchange rate
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      const ratesData = await this.fetchExchangeRates();

      if (!ratesData.quotes) {
        throw new Error("No exchange rates data available");
      }

      fromCurrency = fromCurrency.toUpperCase();
      toCurrency = toCurrency.toUpperCase();

      if (fromCurrency === toCurrency) {
        return 1;
      }

      // Handle USD as base currency
      if (fromCurrency === "USD") {
        const rateKey = `USD${toCurrency}`;
        return ratesData.quotes[rateKey] || 0;
      }

      if (toCurrency === "USD") {
        const rateKey = `USD${fromCurrency}`;
        const rate = ratesData.quotes[rateKey];
        return rate ? 1 / rate : 0;
      }

      // Cross-currency conversion through USD
      const fromRateKey = `USD${fromCurrency}`;
      const toRateKey = `USD${toCurrency}`;

      const fromRate = ratesData.quotes[fromRateKey];
      const toRate = ratesData.quotes[toRateKey];

      if (!fromRate || !toRate) {
        throw new Error("Exchange rates not available for the requested currencies");
      }

      return toRate / fromRate;
    } catch (error) {
      logger.error("Failed to get exchange rate:", error);
      return 0;
    }
  }

  /**
   * Format number with Persian/Farsi digits and thousand separators
   * @param {number} number - Number to format
   * @returns {string} Formatted Persian number
   */
  formatPersianNumber(number: number): string {
    // Persian/Farsi digit mapping
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

    // Add thousand separators
    const formatted = number.toLocaleString();

    // Convert to Persian digits
    return formatted.replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
  }

  /**
   * Get all supported currencies with their names
   * @returns {Object} Currency codes and names
   */
  getSupportedCurrencies(): { [key: string]: string } {
    return {
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
      IRR: "Iranian Rial",
    };
  }

  /**
   * Get current timestamp in Persian format
   * @returns {string} Persian formatted date and time
   */
  getPersianTimestamp(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    };

    return now.toLocaleDateString("fa-IR", options);
  }
}

// Export singleton instance
const currencyConverter = new CurrencyConverter();
export default currencyConverter;

// Also export the class for direct instantiation if needed
export { CurrencyConverter };
export type { ConversionResult, ExchangeRatesResponse };
