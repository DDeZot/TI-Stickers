// ConfigModal.jsx
import React, { useState, useEffect } from 'react';
import { configManager } from './Config';
import './ConfigModal.css';

export function ConfigModal({ isOpen, onClose, onConfigChange }) {
  const [config, setConfig] = useState(null);
  const [ignoredSheetsInput, setIgnoredSheetsInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      const currentConfig = configManager.loadConfig();
      setConfig(JSON.parse(JSON.stringify(currentConfig)));
      setIgnoredSheetsInput(currentConfig.ignoredSheets?.join(', ') || '');
    }
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const handleSave = () => {
    const ignoredSheets = ignoredSheetsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s);

    const updatedConfig = {
      ...config,
      ignoredSheets,
      output: {
        ...config.output,
        fields: {
          ...config.output?.fields,
          showName: config.output?.fields?.showName !== false,
          showInventory: config.output?.fields?.showInventory !== false,
          showPeriod: config.output?.fields?.showPeriod !== false,
          showDone: config.output?.fields?.showDone !== false,
          showNext: config.output?.fields?.showNext !== false,
          showEngineer: config.output?.fields?.showEngineer !== false,
        },
      },
    };

    configManager.saveConfig(updatedConfig);
    setConfig(updatedConfig);
    if (onConfigChange) onConfigChange(updatedConfig);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Сбросить все настройки к стандартным?')) {
      const defaultConfig = configManager.resetConfig();
      setConfig(defaultConfig);
      setIgnoredSheetsInput(defaultConfig.ignoredSheets?.join(', ') || '');
      if (onConfigChange) onConfigChange(defaultConfig);
    }
  };

  const updateValidation = (key, value) => {
    setConfig({
      ...config,
      validation: {
        ...config.validation,
        [key]: value,
      },
    });
  };

  const updateErrorHandling = (key, value) => {
    setConfig({
      ...config,
      errorHandling: {
        ...config.errorHandling,
        [key]: value,
      },
    });
  };

  const updateOutput = (key, value) => {
    setConfig({
      ...config,
      output: {
        ...config.output,
        [key]: value,
      },
    });
  };

  const updateField = (key, value) => {
    setConfig({
      ...config,
      output: {
        ...config.output,
        fields: {
          ...config.output?.fields,
          [key]: value,
        },
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Настройки парсера</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Игнорируемые листы */}
          <div className="config-section">
            <h3>Игнорируемые листы</h3>
            <p className="config-hint">Листы, которые будут пропущены при парсинге (через запятую)</p>
            <input
              type="text"
              className="config-input"
              value={ignoredSheetsInput}
              onChange={(e) => setIgnoredSheetsInput(e.target.value)}
              placeholder="Первые 24, BUG, Первые 48"
            />
          </div>

          {/* Валидация */}
          <div className="config-section">
            <h3>Валидация</h3>
            <div className="config-row">
              <label>
                <input
                  type="checkbox"
                  checked={config.validation?.requireName !== false}
                  onChange={(e) => updateValidation('requireName', e.target.checked)}
                />
                Обязательно наличие названия
              </label>
            </div>
            <div className="config-row">
              <label>
                <input
                  type="checkbox"
                  checked={config.validation?.requireInventory !== false}
                  onChange={(e) => updateValidation('requireInventory', e.target.checked)}
                />
                Обязательно наличие инвентарного номера
              </label>
            </div>
            <div className="config-row">
              <label>
                <input
                  type="checkbox"
                  checked={config.validation?.requirePeriod !== false}
                  onChange={(e) => updateValidation('requirePeriod', e.target.checked)}
                />
                Обязательно наличие периодичности ТО
              </label>
            </div>
            <div className="config-row">
              <label>
                <input
                  type="checkbox"
                  checked={config.validation?.autoCalculateNextTO !== false}
                  onChange={(e) => updateValidation('autoCalculateNextTO', e.target.checked)}
                />
                Автоматически рассчитывать следующее ТО
              </label>
            </div>
          </div>

          {/* Обработка ошибок */}
          <div className="config-section">
            <h3>Обработка ошибок</h3>
            <div className="config-row">
              <label>
                <input
                  type="checkbox"
                  checked={config.errorHandling?.showWarnings !== false}
                  onChange={(e) => updateErrorHandling('showWarnings', e.target.checked)}
                />
                Показывать предупреждения
              </label>
            </div>
            <div className="config-row">
              <label>
                <input
                  type="checkbox"
                  checked={config.errorHandling?.showErrors !== false}
                  onChange={(e) => updateErrorHandling('showErrors', e.target.checked)}
                />
                Показывать ошибки
              </label>
            </div>
            <div className="config-row">
              <label>
                Максимум предупреждений:
                <input
                  type="number"
                  className="config-number"
                  min="0"
                  max="500"
                  value={config.errorHandling?.maxWarnings || 100}
                  onChange={(e) => updateErrorHandling('maxWarnings', parseInt(e.target.value) || 0)}
                />
              </label>
            </div>
          </div>

          {/* PDF вывод */}
          <div className="config-section">
            <h3>PDF вывод</h3>

            <div className="config-row">
              <label>
                Колонок на странице:
                <input
                  type="number"
                  className="config-number"
                  min="1"
                  max="5"
                  value={config.output?.colsPerRow || 3}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 3;
                    updateOutput('colsPerRow', Math.max(1, Math.min(5, val)));
                  }}
                />
              </label>
            </div>

            <div className="config-row">
              <label>
                Отступ между колонками (pt):
                <input
                  type="number"
                  className="config-number"
                  min="0"
                  max="50"
                  value={config.output?.gap || 10}
                  onChange={(e) => updateOutput('gap', parseInt(e.target.value) || 10)}
                />
              </label>
            </div>

            <div className="config-row">
              <label>
                Тема таблицы:
                <select
                  className="config-select"
                  value={config.output?.theme || 'grid'}
                  onChange={(e) => updateOutput('theme', e.target.value)}
                >
                  <option value="grid">Сетка</option>
                  <option value="striped">Полосатая</option>
                  <option value="plain">Простая</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '12px' }}>
              <span className="config-fields-label">Отображаемые поля:</span>
              <div className="config-fields-grid">
                <div className="config-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.output?.fields?.showName !== false}
                      onChange={(e) => updateField('showName', e.target.checked)}
                    />
                    Наименование
                  </label>
                </div>
                <div className="config-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.output?.fields?.showInventory !== false}
                      onChange={(e) => updateField('showInventory', e.target.checked)}
                    />
                    Инв. номер
                  </label>
                </div>
                <div className="config-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.output?.fields?.showPeriod !== false}
                      onChange={(e) => updateField('showPeriod', e.target.checked)}
                    />
                    Периодичность ТО
                  </label>
                </div>
                <div className="config-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.output?.fields?.showDone !== false}
                      onChange={(e) => updateField('showDone', e.target.checked)}
                    />
                    Проведено ТО
                  </label>
                </div>
                <div className="config-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.output?.fields?.showNext !== false}
                      onChange={(e) => updateField('showNext', e.target.checked)}
                    />
                    Следующее ТО
                  </label>
                </div>
                <div className="config-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.output?.fields?.showEngineer !== false}
                      onChange={(e) => updateField('showEngineer', e.target.checked)}
                    />
                    Инженер
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-reset" onClick={handleReset}>
            🔄 Сбросить
          </button>
          <button className="btn-cancel" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-save" onClick={handleSave}>
            💾 Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}