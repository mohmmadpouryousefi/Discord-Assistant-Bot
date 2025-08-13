/**
 * City Autocomplete System for Weather Commands
 * Provides smart city suggestions based on user input
 */

// Popular cities database with search-friendly names
const POPULAR_CITIES = [
  // Iran
  { name: "Tehran", country: "Iran", searchTerms: ["tehran", "teh", "te"] },
  { name: "Isfahan", country: "Iran", searchTerms: ["isfahan", "esf", "is"] },
  { name: "Shiraz", country: "Iran", searchTerms: ["shiraz", "shi", "sh"] },
  { name: "Mashhad", country: "Iran", searchTerms: ["mashhad", "mash", "ma"] },
  { name: "Tabriz", country: "Iran", searchTerms: ["tabriz", "tab", "ta"] },

  // Major World Cities
  { name: "London", country: "UK", searchTerms: ["london", "lon", "lo"] },
  { name: "Paris", country: "France", searchTerms: ["paris", "par", "pa"] },
  { name: "Vienna", country: "Austria", searchTerms: ["vienna", "vie", "vi"] },
  { name: "Venice", country: "Italy", searchTerms: ["venice", "ven", "ve"] },
  {
    name: "Vancouver",
    country: "Canada",
    searchTerms: ["vancouver", "van", "va"],
  },
  { name: "Berlin", country: "Germany", searchTerms: ["berlin", "ber", "be"] },
  {
    name: "Barcelona",
    country: "Spain",
    searchTerms: ["barcelona", "bar", "ba"],
  },
  {
    name: "Bangkok",
    country: "Thailand",
    searchTerms: ["bangkok", "ban", "ba"],
  },
  { name: "Beijing", country: "China", searchTerms: ["beijing", "bei", "be"] },
  {
    name: "Budapest",
    country: "Hungary",
    searchTerms: ["budapest", "bud", "bu"],
  },
  {
    name: "Brussels",
    country: "Belgium",
    searchTerms: ["brussels", "bru", "br"],
  },

  // Americas
  {
    name: "New York",
    country: "USA",
    searchTerms: ["new york", "newyork", "ny", "ne"],
  },
  {
    name: "Los Angeles",
    country: "USA",
    searchTerms: ["los angeles", "la", "lo"],
  },
  { name: "Chicago", country: "USA", searchTerms: ["chicago", "chi", "ch"] },
  { name: "Miami", country: "USA", searchTerms: ["miami", "mia", "mi"] },
  { name: "Toronto", country: "Canada", searchTerms: ["toronto", "tor", "to"] },
  {
    name: "Montreal",
    country: "Canada",
    searchTerms: ["montreal", "mon", "mo"],
  },

  // Asia
  { name: "Tokyo", country: "Japan", searchTerms: ["tokyo", "tok", "to"] },
  {
    name: "Seoul",
    country: "South Korea",
    searchTerms: ["seoul", "seo", "se"],
  },
  {
    name: "Singapore",
    country: "Singapore",
    searchTerms: ["singapore", "sin", "si"],
  },
  {
    name: "Hong Kong",
    country: "Hong Kong",
    searchTerms: ["hong kong", "hongkong", "hk", "ho"],
  },
  {
    name: "Shanghai",
    country: "China",
    searchTerms: ["shanghai", "sha", "sh"],
  },
  { name: "Mumbai", country: "India", searchTerms: ["mumbai", "mum", "mu"] },
  { name: "Delhi", country: "India", searchTerms: ["delhi", "del", "de"] },

  // Middle East
  { name: "Dubai", country: "UAE", searchTerms: ["dubai", "dub", "du"] },
  {
    name: "Abu Dhabi",
    country: "UAE",
    searchTerms: ["abu dhabi", "abudhabi", "abu", "ab"],
  },
  {
    name: "Riyadh",
    country: "Saudi Arabia",
    searchTerms: ["riyadh", "riy", "ri"],
  },
  { name: "Doha", country: "Qatar", searchTerms: ["doha", "doh", "do"] },
  {
    name: "Kuwait City",
    country: "Kuwait",
    searchTerms: ["kuwait", "kuw", "ku"],
  },
  {
    name: "Istanbul",
    country: "Turkey",
    searchTerms: ["istanbul", "ist", "is"],
  },
  { name: "Ankara", country: "Turkey", searchTerms: ["ankara", "ank", "an"] },

  // Europe
  { name: "Rome", country: "Italy", searchTerms: ["rome", "rom", "ro"] },
  { name: "Madrid", country: "Spain", searchTerms: ["madrid", "mad", "ma"] },
  {
    name: "Amsterdam",
    country: "Netherlands",
    searchTerms: ["amsterdam", "ams", "am"],
  },
  {
    name: "Stockholm",
    country: "Sweden",
    searchTerms: ["stockholm", "sto", "st"],
  },
  { name: "Oslo", country: "Norway", searchTerms: ["oslo", "osl", "os"] },
  {
    name: "Copenhagen",
    country: "Denmark",
    searchTerms: ["copenhagen", "cop", "co"],
  },
  {
    name: "Zurich",
    country: "Switzerland",
    searchTerms: ["zurich", "zur", "zu"],
  },
  {
    name: "Geneva",
    country: "Switzerland",
    searchTerms: ["geneva", "gen", "ge"],
  },
  {
    name: "Prague",
    country: "Czech Republic",
    searchTerms: ["prague", "pra", "pr"],
  },
  { name: "Warsaw", country: "Poland", searchTerms: ["warsaw", "war", "wa"] },
  { name: "Athens", country: "Greece", searchTerms: ["athens", "ath", "at"] },
  { name: "Lisbon", country: "Portugal", searchTerms: ["lisbon", "lis", "li"] },

  // Africa & Oceania
  { name: "Cairo", country: "Egypt", searchTerms: ["cairo", "cai", "ca"] },
  {
    name: "Cape Town",
    country: "South Africa",
    searchTerms: ["cape town", "capetown", "cape", "ca"],
  },
  {
    name: "Sydney",
    country: "Australia",
    searchTerms: ["sydney", "syd", "sy"],
  },
  {
    name: "Melbourne",
    country: "Australia",
    searchTerms: ["melbourne", "mel", "me"],
  },
  {
    name: "Auckland",
    country: "New Zealand",
    searchTerms: ["auckland", "auc", "au"],
  },
];

class CityAutocomplete {
  constructor() {
    this.cities = POPULAR_CITIES;
  }

  /**
   * Find city suggestions based on user input
   * @param {string} input - User's partial input
   * @param {number} maxResults - Maximum number of suggestions to return
   * @returns {Array} Array of suggested cities
   */
  findSuggestions(input, maxResults = 6) {
    if (!input || input.length < 2) {
      return [];
    }

    const searchTerm = input.toLowerCase().trim();
    const suggestions = [];

    // Find exact matches first
    for (const city of this.cities) {
      if (city.name.toLowerCase().startsWith(searchTerm)) {
        suggestions.push({
          ...city,
          matchType: "exact",
          priority: 1,
        });
      }
    }

    // Find partial matches in search terms
    for (const city of this.cities) {
      // Skip if already added as exact match
      if (suggestions.some((s) => s.name === city.name)) continue;

      for (const term of city.searchTerms) {
        if (term.startsWith(searchTerm)) {
          suggestions.push({
            ...city,
            matchType: "partial",
            priority: 2,
          });
          break;
        }
      }
    }

    // Find fuzzy matches (contains the search term)
    for (const city of this.cities) {
      // Skip if already added
      if (suggestions.some((s) => s.name === city.name)) continue;

      if (city.name.toLowerCase().includes(searchTerm)) {
        suggestions.push({
          ...city,
          matchType: "fuzzy",
          priority: 3,
        });
      }
    }

    // Sort by priority and return limited results
    return suggestions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxResults);
  }

  /**
   * Create Telegram inline keyboard for city suggestions
   * @param {Array} suggestions - Array of city suggestions
   * @returns {Object} Telegram keyboard object
   */
  createSuggestionKeyboard(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      return createBackButton();
    }

    const buttons = [];

    // Create rows of 2 buttons each
    for (let i = 0; i < suggestions.length; i += 2) {
      const row = [];

      // First button in row
      const city1 = suggestions[i];
      row.push({
        text: `🌍 ${city1.name}, ${city1.country}`,
        callback_data: `weather_check:${city1.name}`,
      });

      // Second button in row (if exists)
      if (i + 1 < suggestions.length) {
        const city2 = suggestions[i + 1];
        row.push({
          text: `🌍 ${city2.name}, ${city2.country}`,
          callback_data: `weather_check:${city2.name}`,
        });
      }

      buttons.push(row);
    }

    // Add back button
    buttons.push([{ text: "🔙 بازگشت به منو", callback_data: "back_to_menu" }]);

    return {
      reply_markup: {
        inline_keyboard: buttons,
      },
    };
  }

  /**
   * Get popular cities for a specific region
   * @param {string} region - Region name (iran, europe, asia, etc.)
   * @returns {Array} Array of cities in the region
   */
  getCitiesByRegion(region) {
    const regionMaps = {
      iran: this.cities.filter((c) => c.country === "Iran"),
      europe: this.cities.filter((c) =>
        [
          "UK",
          "France",
          "Germany",
          "Italy",
          "Spain",
          "Netherlands",
          "Sweden",
          "Norway",
          "Denmark",
          "Switzerland",
          "Czech Republic",
          "Poland",
          "Greece",
          "Portugal",
          "Austria",
          "Belgium",
          "Hungary",
        ].includes(c.country)
      ),
      asia: this.cities.filter((c) =>
        [
          "Japan",
          "South Korea",
          "Singapore",
          "Hong Kong",
          "China",
          "India",
          "Thailand",
        ].includes(c.country)
      ),
      america: this.cities.filter((c) => ["USA", "Canada"].includes(c.country)),
      middle_east: this.cities.filter((c) =>
        ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Turkey"].includes(c.country)
      ),
    };

    return regionMaps[region] || [];
  }
}

// Helper function to create back button (imported from main file)
function createBackButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 بازگشت به منو", callback_data: "back_to_menu" }],
      ],
    },
  };
}

module.exports = CityAutocomplete;
