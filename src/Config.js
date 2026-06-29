// Config.js
import { DEFAULT_CONFIG } from './defaultConfig';

class ConfigManager {
  constructor() {
    this.config = null;
    this.configKey = 'excelParserConfig';
    this.defaultConfig = DEFAULT_CONFIG;
  }

  /**
   * Загружает конфигурацию из localStorage
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem(this.configKey);
      if (saved) {
        this.config = JSON.parse(saved);
        return this.config;
      }
    } catch (error) {
      console.warn('Ошибка загрузки конфига:', error);
    }
    
    this.config = this.getDefaultConfig();
    return this.config;
  }

  /**
   * Сохраняет конфигурацию в localStorage
   */
  saveConfig(config) {
    try {
      localStorage.setItem(this.configKey, JSON.stringify(config));
      this.config = config;
      return true;
    } catch (error) {
      console.error('Ошибка сохранения конфига:', error);
      return false;
    }
  }

  /**
   * Возвращает дефолтную конфигурацию
   */
  getDefaultConfig() {
    return JSON.parse(JSON.stringify(this.defaultConfig));
  }

  /**
   * Сбрасывает конфигурацию к дефолтной
   */
  resetConfig() {
    this.config = this.getDefaultConfig();
    this.saveConfig(this.config);
    return this.config;
  }

  /**
   * Получает значение по ключу
   */
  get(key) {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config?.[key] ?? this.defaultConfig?.[key];
  }

  /**
   * Устанавливает значение
   */
  set(key, value) {
    if (!this.config) {
      this.loadConfig();
    }
    this.config[key] = value;
    this.saveConfig(this.config);
  }
}

// Создаем единственный экземпляр
export const configManager = new ConfigManager();