// Parser.js - обновленная версия с использованием Config
import * as XLSX from 'xlsx';
import Equipment from './Equipment';
import { configManager } from './Config';

// ============================================================
// ЗАГРУЗКА КОНФИГУРАЦИИ
// ============================================================

const config = configManager.loadConfig();

// ============================================================
// КОНСТАНТЫ ИЗ КОНФИГА
// ============================================================

const MONTH_NAMES = config.output.monthNames;

const MONTH_MAP = {};
MONTH_NAMES.forEach((name, index) => {
  MONTH_MAP[name.toLowerCase()] = index;
});

const REQUIRED_HEADERS = [
  'Наименование оборудования',
  'Инвентарный номер',
  'Периодичность ТО',
  'График ТО',
  'Год сейчас',
];

const HEADER_VARIATIONS = config.headerVariations;
const IGNORED_SHEETS = config.ignoredSheets;
const PERIOD_UNITS = config.periodUnits;
const HEADER_SEARCH_LIMIT = config.validation.headerSearchLimit;
const MATCH_THRESHOLD = config.validation.matchThreshold;
const SHOW_WARNINGS = config.errorHandling.showWarnings;
const SHOW_ERRORS = config.errorHandling.showErrors;
const MAX_WARNINGS = config.errorHandling.maxWarnings;

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ
// ============================================================

/**
 * Основная функция парсинга Excel файла
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error('Передан не файл.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (!e.target || !e.target.result) {
          reject(new Error('Не удалось прочитать файл.'));
          return;
        }

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames.length) {
          reject(new Error('Файл не содержит ни одного листа.'));
          return;
        }

        const allEquipments = [];
        const allErrors = [];
        const allWarnings = [];
        const ignoredSheets = [];
        let sheetsProcessed = 0;
        let validSheets = 0;

        for (const sheetName of workbook.SheetNames) {
          if (isIgnoredSheet(sheetName)) {
            ignoredSheets.push(sheetName);
            continue;
          }

          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false,
            defval: ''
          });

          if (!rows.length) {
            allErrors.push(`Лист "${sheetName}": Пустой лист`);
            continue;
          }

          const result = processSheet(rows, sheetName);
          sheetsProcessed++;

          if (SHOW_ERRORS && result.errors.length > 0) {
            allErrors.push(...result.errors);
          }

          if (SHOW_WARNINGS && result.warnings.length > 0) {
            const limitedWarnings = result.warnings.slice(0, MAX_WARNINGS);
            allWarnings.push(...limitedWarnings);
            if (result.warnings.length > MAX_WARNINGS) {
              allWarnings.push(`... и ещё ${result.warnings.length - MAX_WARNINGS} предупреждений`);
            }
          }

          if (result.equipments.length > 0) {
            allEquipments.push(...result.equipments);
            validSheets++;
          }
        }

        if (sheetsProcessed === 0 && ignoredSheets.length > 0) {
          reject(new Error(`Все листы являются служебными: ${ignoredSheets.join(', ')}`));
          return;
        }

        if (sheetsProcessed === 0) {
          reject(new Error('Не удалось обработать ни одного листа'));
          return;
        }

        if (allEquipments.length === 0) {
          if (allErrors.length > 0) {
            reject(new Error(`Найдены критические ошибки:\n${allErrors.join('\n')}`));
          } else {
            reject(new Error('Не найдено ни одной записи с данными во всем файле'));
          }
          return;
        }

        resolve({
          equipments: allEquipments,
          warnings: allWarnings,
          errors: allErrors,
          summary: {
            sheetsProcessed,
            validSheets,
            ignoredSheets,
            totalRecords: allEquipments.length,
          },
        });
      } catch (error) {
        reject(new Error('Ошибка при обработке файла: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// ============================================================
// ОБРАБОТКА ЛИСТА
// ============================================================

function processSheet(rows, sheetName) {
  const headerInfo = findHeaderRow(rows);

  if (!headerInfo) {
    return {
      valid: false,
      errors: [`Лист "${sheetName}": Не удалось найти строку с заголовками`],
      warnings: [],
      equipments: [],
    };
  }

  const { rowIndex, headerIndices, foundHeaders } = headerInfo;

  const missingHeaders = REQUIRED_HEADERS.filter((h) => !foundHeaders.includes(h));
  if (missingHeaders.length > 0) {
    return {
      valid: false,
      errors: [`Лист "${sheetName}": Не найдены обязательные колонки: ${missingHeaders.join(', ')}`],
      warnings: [],
      equipments: [],
    };
  }

  const equipments = [];
  const allWarnings = [];
  const allErrors = [];
  let hasData = false;

  let lastDataRow = rowIndex;
  for (let i = rows.length - 1; i > rowIndex; i--) {
    if (!isEmptyRow(rows[i])) {
      lastDataRow = i;
      break;
    }
  }

  for (let i = rowIndex + 1; i <= lastDataRow; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;

    const name = getCellValue(row, headerIndices['Наименование оборудования']);
    const invNumber = getCellValue(row, headerIndices['Инвентарный номер']);

    if (!name && !invNumber) continue;

    hasData = true;

    const result = validateRow(row, headerIndices, i, sheetName);
    allWarnings.push(...result.warnings);
    allErrors.push(...result.errors);

    const equipment = extractEquipmentData(row, headerIndices);
    equipments.push(equipment);
  }

  if (!hasData) {
    return {
      valid: false,
      errors: [`Лист "${sheetName}": Не найдено данных после заголовков`],
      warnings: [],
      equipments: [],
    };
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    equipments,
  };
}

// ============================================================
// ИЗВЛЕЧЕНИЕ ДАННЫХ
// ============================================================

function extractEquipmentData(row, headerIndices) {
  const name = getCellValue(row, headerIndices['Наименование оборудования']);
  const inventoryNumber = getCellValue(row, headerIndices['Инвентарный номер']);
  const maintenancePeriod = getCellValue(row, headerIndices['Периодичность ТО']);
  const monthStr = getCellValue(row, headerIndices['График ТО']);
  const yearStr = getCellValue(row, headerIndices['Год сейчас']);
  const nextMonthStr = getCellValue(row, headerIndices['Месяц следующее ТО']);
  const nextYearStr = getCellValue(row, headerIndices['Год следующий']);
  const engineer = getCellValue(row, headerIndices['Инженер']);

  const date = parseDate(monthStr, yearStr);
  const maintenanceDone = date ? formatDate(date) : '';

  let maintenanceNext = '';

  if (nextMonthStr && nextYearStr) {
    const nextDate = parseDate(nextMonthStr, nextYearStr);
    maintenanceNext = nextDate ? formatDate(nextDate) : '';
  } else if (date && maintenancePeriod && config.validation.autoCalculateNextTO) {
    const nextDate = addPeriod(date, maintenancePeriod);
    maintenanceNext = nextDate ? formatDate(nextDate) : '';
  }

  return new Equipment(
    name,
    inventoryNumber,
    maintenancePeriod,
    maintenanceDone,
    maintenanceNext,
    engineer
  );
}

// ============================================================
// ВАЛИДАЦИЯ
// ============================================================

function validateRow(row, headerIndices, rowIndex, sheetName) {
  const allWarnings = [];
  const allErrors = [];

  const name = getCellValue(row, headerIndices['Наименование оборудования']);
  const inventoryNumber = getCellValue(row, headerIndices['Инвентарный номер']);
  const maintenancePeriod = getCellValue(row, headerIndices['Периодичность ТО']);
  const monthStr = getCellValue(row, headerIndices['График ТО']);
  const yearStr = getCellValue(row, headerIndices['Год сейчас']);
  const nextMonthStr = getCellValue(row, headerIndices['Месяц следующее ТО']);
  const nextYearStr = getCellValue(row, headerIndices['Год следующий']);

  if (config.validation.requireName && !name) {
    allErrors.push(`Лист "${sheetName}", строка ${rowIndex + 1}: Отсутствует наименование оборудования`);
  }

  if (config.validation.requireInventory && !inventoryNumber) {
    allErrors.push(`Лист "${sheetName}", строка ${rowIndex + 1}: Отсутствует инвентарный номер`);
  }

  const dateErrors = validateTODate(monthStr, yearStr, rowIndex, sheetName);
  allErrors.push(...dateErrors);

  const periodResult = validatePeriod(maintenancePeriod, rowIndex, sheetName);
  allWarnings.push(...periodResult.warnings);
  allErrors.push(...periodResult.errors);

  const nextResult = validateNextTO(
    nextMonthStr,
    nextYearStr,
    maintenancePeriod,
    monthStr,
    yearStr,
    rowIndex,
    sheetName
  );
  allWarnings.push(...nextResult.warnings);
  allErrors.push(...nextResult.errors);

  return { warnings: allWarnings, errors: allErrors };
}

function validateTODate(monthStr, yearStr, rowIndex, sheetName) {
  const errors = [];

  if (config.validation.requireTOMonth && !monthStr) {
    errors.push(`Лист "${sheetName}", строка ${rowIndex + 1}: Отсутствует месяц проведения ТО`);
  }

  if (config.validation.requireTOYear && !yearStr) {
    errors.push(`Лист "${sheetName}", строка ${rowIndex + 1}: Отсутствует год проведения ТО`);
  }

  if (monthStr && yearStr) {
    const date = parseDate(monthStr, yearStr);
    if (!date) {
      errors.push(
        `Лист "${sheetName}", строка ${rowIndex + 1}: Некорректная дата проведения ТО (месяц: "${monthStr}", год: "${yearStr}")`
      );
    }
  }

  return errors;
}

function validatePeriod(maintenancePeriod, rowIndex, sheetName) {
  const warnings = [];
  const errors = [];

  if (config.validation.requirePeriod && !maintenancePeriod) {
    errors.push(`Лист "${sheetName}", строка ${rowIndex + 1}: Отсутствует периодичность ТО`);
    return { warnings, errors };
  }

  if (maintenancePeriod) {
    const period = parsePeriod(maintenancePeriod);
    if (!period) {
      warnings.push(
        `Лист "${sheetName}", строка ${rowIndex + 1}: Некорректный формат периодичности ТО ("${maintenancePeriod}", ожидается например "12 мес" или "1 год")`
      );
    }
  }

  return { warnings, errors };
}

function validateNextTO(
  nextMonthStr,
  nextYearStr,
  maintenancePeriod,
  monthStr,
  yearStr,
  rowIndex,
  sheetName
) {
  const warnings = [];
  const errors = [];

  const hasNextTO = nextMonthStr && nextYearStr;
  const hasPeriod = maintenancePeriod && monthStr && yearStr;

  if (!hasNextTO && !hasPeriod) {
    warnings.push(
      `Лист "${sheetName}", строка ${rowIndex + 1}: Отсутствует информация о следующем ТО (будет рассчитано автоматически по периодичности)`
    );
  }

  if (hasNextTO) {
    const nextDate = parseDate(nextMonthStr, nextYearStr);
    if (!nextDate) {
      errors.push(
        `Лист "${sheetName}", строка ${rowIndex + 1}: Некорректная дата следующего ТО (месяц: "${nextMonthStr}", год: "${nextYearStr}")`
      );
    }
  }

  return { warnings, errors };
}

// ============================================================
// ПОИСК ЗАГОЛОВКОВ
// ============================================================

function findHeaderRow(rows) {
  const maxRowsToCheck = Math.min(rows.length, HEADER_SEARCH_LIMIT);

  for (let i = 0; i < maxRowsToCheck; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    let foundCount = 0;
    const headerIndices = {};
    const foundHeaders = [];

    for (const expected of REQUIRED_HEADERS) {
      const index = findColumnIndex(row, expected);
      if (index !== -1) {
        foundCount++;
        headerIndices[expected] = index;
        foundHeaders.push(expected);
      }
    }

    const nextMonthIndex = findColumnIndex(row, 'Месяц следующее ТО');
    if (nextMonthIndex !== -1) {
      headerIndices['Месяц следующее ТО'] = nextMonthIndex;
    }

    const nextYearIndex = findColumnIndex(row, 'Год следующий');
    if (nextYearIndex !== -1) {
      headerIndices['Год следующий'] = nextYearIndex;
    }

    const engineerIndex = findColumnIndex(row, 'Инженер');
    if (engineerIndex !== -1) {
      headerIndices['Инженер'] = engineerIndex;
    }

    if (foundCount >= REQUIRED_HEADERS.length - 1) {
      return {
        rowIndex: i,
        headerIndices,
        headers: row,
        foundHeaders,
      };
    }
  }

  return null;
}

function findColumnIndex(headers, expectedHeader) {
  const normalizedExpected = normalizeText(expectedHeader);
  const variations = HEADER_VARIATIONS[expectedHeader] || [normalizedExpected];

  let bestMatchIndex = -1;
  let bestMatchScore = 0;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!header) continue;

    const normalizedHeader = normalizeText(header);
    if (!normalizedHeader) continue;

    let score = 0;

    if (normalizedHeader === normalizedExpected) {
      score = 100;
    } else {
      for (const variation of variations) {
        const normalizedVariation = normalizeText(variation);

        if (normalizedHeader === normalizedVariation) {
          score = 95;
          break;
        }

        if (normalizedHeader.includes(normalizedVariation)) {
          score = Math.max(score, 85);
        }

        if (normalizedVariation.includes(normalizedHeader)) {
          score = Math.max(score, 75);
        }

        const similarity = getSimilarity(normalizedHeader, normalizedVariation);
        if (similarity >= 80) {
          score = Math.max(score, similarity);
        }

        const words = normalizedHeader.split(' ');
        for (const word of words) {
          if (word.length > 2) {
            if (normalizedVariation.includes(word)) {
              score = Math.max(score, 65);
            }
            const wordSimilarity = getSimilarity(word, normalizedVariation);
            if (wordSimilarity >= 70) {
              score = Math.max(score, wordSimilarity * 0.7);
            }
          }
        }
      }
    }

    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestMatchIndex = i;
    }
  }

  return bestMatchScore >= MATCH_THRESHOLD ? bestMatchIndex : -1;
}

// ============================================================
// РАБОТА С ДАТАМИ
// ============================================================

function parseDate(monthStr, yearStr) {
  if (!monthStr || !yearStr) return null;
  const monthLower = monthStr.trim().toLowerCase();
  const month = MONTH_MAP[monthLower];
  const year = parseInt(yearStr, 10);
  if (month === undefined || isNaN(year)) return null;
  return new Date(year, month, 1);
}

function formatDate(date) {
  if (!date) return '';
  const suffix = config.output.dateFormat || 'г.';
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()} ${suffix}`;
}

function parsePeriod(periodStr) {
  if (!periodStr) return null;

  const normalized = periodStr.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*([а-я]+)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const unitType = PERIOD_UNITS[unit];
  if (!unitType) return null;

  return {
    value,
    unit: unitType,
    label: `${value} ${unit}`,
  };
}

function addPeriod(date, periodStr) {
  if (!date || !periodStr) return date;

  const period = parsePeriod(periodStr);
  if (!period) return date;

  const newDate = new Date(date.getTime());

  if (period.unit === 'year') {
    newDate.setFullYear(newDate.getFullYear() + period.value);
  } else if (period.unit === 'month') {
    newDate.setMonth(newDate.getMonth() + period.value);
  }

  return newDate;
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ
// ============================================================

function normalizeText(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^а-яa-z0-9\s]/g, '');
}

function levenshteinDistance(str1, str2) {
  const a = str1.toLowerCase();
  const b = str2.toLowerCase();

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function getSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return Math.round((1 - distance / maxLength) * 100);
}

function isEmptyRow(row) {
  if (!row) return true;
  return row.every((cell) => !cell || cell.toString().trim() === '');
}

function isIgnoredSheet(sheetName) {
  return IGNORED_SHEETS.some((name) => sheetName.includes(name) || sheetName === name);
}

function getCellValue(row, index) {
  if (index === undefined || index === -1) return '';
  const value = row[index];
  return value ? value.toString().trim() : '';
}