/**
 * Personal Reminder System
 * Allows users to set, view, and manage personal reminders
 * Supports natural language time parsing and flexible scheduling
 */

const cron = require("node-cron");
const logger = require("./logger");

class ReminderSystem {
  constructor() {
    // Singleton pattern - return existing instance if already created
    if (ReminderSystem.instance) {
      return ReminderSystem.instance;
    }

    this.reminders = new Map(); // In-memory storage (will upgrade to database later)
    this.reminderCounter = 1;
    this.scheduledTasks = new Map();
    this.onReminderTrigger = null;

    // Start cleanup task - runs every hour to remove old reminders
    this.startCleanupTask();

    // Store the instance
    ReminderSystem.instance = this;
  }

  /**
   * Set callback function for reminder notifications
   * @param {Function} callback - Function to call when reminder triggers
   */
  setReminderCallback(callback) {
    this.onReminderTrigger = callback;
  }

  /**
   * Parse natural language time into Date object
   * @param {string} timeString - User input like "5m", "2h", "tomorrow", "5pm"
   * @returns {Date|null} Parsed date or null if invalid
   */
  parseTime(timeString) {
    const now = new Date();
    const input = timeString.toLowerCase().trim();

    // Handle relative time (5m, 2h, 3d, etc.)
    const relativeMatch = input.match(
      /^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)$/
    );
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2];

      const date = new Date(now);

      if (["m", "min", "mins", "minute", "minutes"].includes(unit)) {
        date.setMinutes(date.getMinutes() + amount);
      } else if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) {
        date.setHours(date.getHours() + amount);
      } else if (["d", "day", "days"].includes(unit)) {
        date.setDate(date.getDate() + amount);
      } else if (["w", "week", "weeks"].includes(unit)) {
        date.setDate(date.getDate() + amount * 7);
      }

      return date;
    }

    // Handle specific times today (5pm, 14:30, etc.)
    const timeMatch = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]) || 0;
      const period = timeMatch[3];

      // Handle 12-hour format
      if (period === "pm" && hours !== 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;

      // For 24-hour format without am/pm, validate hours
      if (!period && (hours < 0 || hours > 23)) {
        return null; // Invalid hour
      }

      const date = new Date(now);
      date.setHours(hours, minutes, 0, 0);

      // Debug log to check what's happening
      logger.info(`Parsing time: ${input} -> ${date.toLocaleString()} (now: ${now.toLocaleString()})`);

      // If time has passed today, set for tomorrow
      if (date <= now) {
        date.setDate(date.getDate() + 1);
        logger.info(`Time has passed, setting for tomorrow: ${date.toLocaleString()}`);
      }

      return date;
    }

    // Handle common phrases
    const phraseMap = {
      tomorrow: () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0); // Default to 9 AM
        return date;
      },
      "next week": () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 7);
        return date;
      },
      tonight: () => {
        const date = new Date(now);
        date.setHours(20, 0, 0, 0); // 8 PM
        return date;
      },
    };

    if (phraseMap[input]) {
      return phraseMap[input]();
    }

    // Try to parse as ISO date string
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime()) && date > now) {
        return date;
      }
    } catch (error) {
      // Invalid date format
    }

    return null;
  }

  /**
   * Create a new reminder
   * @param {string} userId - User ID
   * @param {string} message - Reminder message
   * @param {string} timeString - Time specification
   * @param {string} platform - 'discord' or 'telegram'
   * @param {string} channelId - Channel/Chat ID where to send reminder
   * @returns {Object} Result object with success/error info
   */
  createReminder(
    userId,
    message,
    timeString,
    platform = "discord",
    channelId = null
  ) {
    try {
      const reminderTime = this.parseTime(timeString);

      if (!reminderTime) {
        return {
          success: false,
          error:
            'Invalid time format. Try: "5m", "2h", "tomorrow", "5pm", etc.',
        };
      }

      if (reminderTime <= new Date()) {
        return {
          success: false,
          error: "Reminder time must be in the future",
        };
      }

      const reminderId = this.reminderCounter++;
      const reminder = {
        id: reminderId,
        userId,
        message: message.trim(),
        reminderTime,
        platform,
        channelId,
        createdAt: new Date(),
        completed: false,
      };

      // Store reminder
      this.reminders.set(reminderId, reminder);

      // Schedule the reminder
      this.scheduleReminder(reminder);

      logger.info(`Reminder created: ID ${reminderId} for user ${userId}`);

      return {
        success: true,
        reminder,
        timeUntil: this.getTimeUntilString(reminderTime),
      };
    } catch (error) {
      logger.error("Error creating reminder:", error);
      return {
        success: false,
        error: "Failed to create reminder",
      };
    }
  }

  /**
   * Schedule a reminder using setTimeout
   * @param {Object} reminder - Reminder object
   */
  scheduleReminder(reminder) {
    const delay = reminder.reminderTime.getTime() - Date.now();

    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        this.triggerReminder(reminder);
      }, delay);

      this.scheduledTasks.set(reminder.id, timeoutId);
    }
  }

  /**
   * Trigger a reminder (called when time is reached)
   * @param {Object} reminder - Reminder object
   */
  async triggerReminder(reminder) {
    try {
      // Mark as completed
      reminder.completed = true;

      // Remove from scheduled tasks
      this.scheduledTasks.delete(reminder.id);

      // Send reminder notification (will be implemented in the bot files)
      if (this.onReminderTrigger) {
        await this.onReminderTrigger(reminder);
      }

      logger.info(
        `Reminder ${reminder.id} triggered for user ${reminder.userId}`
      );

      // Clean up old completed reminder after 24 hours
      setTimeout(() => {
        this.reminders.delete(reminder.id);
      }, 24 * 60 * 60 * 1000);
    } catch (error) {
      logger.error(`Error triggering reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Get user's active reminders
   * @param {string} userId - User ID
   * @returns {Array} Array of active reminders
   */
  getUserReminders(userId) {
    const userReminders = [];

    for (const [id, reminder] of this.reminders) {
      if (reminder.userId === userId && !reminder.completed) {
        userReminders.push(reminder);
      }
    }

    return userReminders.sort((a, b) => a.reminderTime - b.reminderTime);
  }

  /**
   * Cancel a reminder
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID (for security)
   * @returns {boolean} Success status
   */
  cancelReminder(reminderId, userId) {
    const reminder = this.reminders.get(reminderId);

    if (!reminder || reminder.userId !== userId) {
      return false;
    }

    // Clear scheduled task
    const timeoutId = this.scheduledTasks.get(reminderId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledTasks.delete(reminderId);
    }

    // Remove reminder
    this.reminders.delete(reminderId);

    logger.info(`Reminder ${reminderId} cancelled by user ${userId}`);
    return true;
  }

  /**
   * Get human-readable time until reminder
   * @param {Date} reminderTime - Target time
   * @returns {string} Human readable time difference
   */
  getTimeUntilString(reminderTime) {
    const now = new Date();
    const diff = reminderTime.getTime() - now.getTime();

    // Debug log
    logger.info(`Time calculation: reminder=${reminderTime.toLocaleString()}, now=${now.toLocaleString()}, diff=${diff}ms`);

    if (diff <= 0) return "now";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

    if (parts.length === 0) return "less than a minute";
    
    const result = parts.join(", ");
    logger.info(`Time until string: ${result} (days=${days}, hours=${hours}, minutes=${minutes})`);
    
    return result;
  }

  /**
   * Format reminder time for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatReminderTime(date) {
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleDateString("en-US", options);
  }

  /**
   * Start background cleanup task
   */
  startCleanupTask() {
    // Run every hour to clean up old completed reminders
    cron.schedule("0 * * * *", () => {
      let cleaned = 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const [id, reminder] of this.reminders) {
        if (reminder.completed && reminder.reminderTime.getTime() < oneDayAgo) {
          this.reminders.delete(id);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} old reminders`);
      }
    });
  }

  /**
   * Get system statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    let active = 0;
    let completed = 0;

    for (const [id, reminder] of this.reminders) {
      if (reminder.completed) {
        completed++;
      } else {
        active++;
      }
    }

    return {
      totalReminders: this.reminders.size,
      activeReminders: active,
      completedReminders: completed,
      scheduledTasks: this.scheduledTasks.size,
    };
  }

  /**
   * Restore reminders on bot restart
   * This would typically load from database
   */
  restoreReminders() {
    // In a real implementation, this would load from database
    // and reschedule active reminders
    logger.info("Reminder system initialized");
  }
}

module.exports = ReminderSystem;
