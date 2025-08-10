const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");

const BASE_URL = config.apis.weather.baseUrl + "/forecast.json";
const FORECAST_DAYS = 3;

async function getWeatherForecast(location) {
  if (!location || typeof location !== "string") {
    throw new Error("Location must be a valid string");
  }

  if (!config.apis.weather.key) {
    throw new Error("Weather API key is not configured");
  }

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        key: config.apis.weather.key,
        q: location,
        days: FORECAST_DAYS,
      },
      timeout: config.apis.weather.timeout,
    });

    // Extract location data from the response
    const city = response.data.location.name;
    const country = response.data.location.country;
    const region = response.data.location.region;
    const localTime = response.data.location.localtime;

    // Extract current weather data
    const currentTemp = response.data.current.temp_c;
    const condition = response.data.current.condition.text;
    const humidity = response.data.current.humidity;
    const windSpeed = response.data.current.wind_kph;

    // You can either return the raw data or formatted data
    const formattedData = {
      location: {
        city,
        country,
        region,
        localTime,
      },
      current: {
        temperature: currentTemp,
        condition,
        humidity,
        windSpeed,
      },
      forecast: response.data.forecast.forecastday,
    };

    return formattedData; // or return response.data for raw data
  } catch (error) {
    if (error.response) {
      // API returned an error response
      logger.error("Weather API Error:", error.response.data);
      throw new Error(
        `Weather API Error: ${
          error.response.data.error?.message || "Unknown error"
        }`
      );
    } else if (error.request) {
      // Network error
      logger.error("Network Error:", error.message);
      throw new Error("Unable to connect to weather service");
    } else {
      logger.error("Error fetching weather forecast:", error.message);
      throw error;
    }
  }
}

module.exports = {
  getWeatherForecast,
};
