import * as XLSX from 'xlsx';
import Equipment from './Equipment';

const monthMap = {
  январь: 0,
  февраль: 1,
  март: 2,
  апрель: 3,
  май: 4,
  июнь: 5,
  июль: 6,
  август: 7,
  сентябрь: 8,
  октябрь: 9,
  ноябрь: 10,
  декабрь: 11,
};

function parseDate(monthStr, yearStr) {
  if (!monthStr || !yearStr) return null;
  const monthLower = monthStr.trim().toLowerCase();
  const month = monthMap[monthLower];
  const year = parseInt(yearStr, 10);
  if (month === undefined || isNaN(year)) return null;
  return new Date(year, month, 1);
}

function formatDate(date) {
  if (!date) return '';
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()} г.`;
}

function addPeriod(date, periodStr) {
  if (!date || !periodStr) return date;
  const period = periodStr.trim().toLowerCase();

  const match = period.match(/(\d+)\s*(год|года|лет|месяц|месяцев|месяца)/);
  if (!match) return date;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const newDate = new Date(date.getTime());

  if (['год', 'года', 'лет'].includes(unit)) {
    newDate.setFullYear(newDate.getFullYear() + value);
  } else if (['месяц', 'месяцев', 'месяца'].includes(unit)) {
    newDate.setMonth(newDate.getMonth() + value);
  }
  return newDate;
}

const requiredHeaders = [
  'Наименование оборудования',
  'Инвентарный номер',
  'Периодичность ТО',
  'График ТО',
  'Год сейчас',
];

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

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (!rows.length) {
          reject(new Error('Первый лист пустой.'));
          return;
        }

        const headers = rows[0];
        if (!headers || headers.length < requiredHeaders.length) {
          reject(new Error('Заголовки отсутствуют или неполные.'));
          return;
        }

        for (let i = 0; i < requiredHeaders.length; i++) {
          if (
            !headers[i] ||
            headers[i].toString().trim().toLowerCase() !== requiredHeaders[i].toLowerCase()
          ) {
            reject(
              new Error(
                `Неверный формат заголовков. Ожидалось "${requiredHeaders[i]}" на позиции ${i + 1}, найдено "${headers[i]}".`
              )
            );
            return;
          }
        }

        const equipments = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 7) continue;

          const name = row[0] || '';
          const inventoryNumber = row[1] || '';
          const maintenancePeriod = row[2] || '';
          const monthStr = row[3] || '';
          const yearStr = row[4] || '';
          const engineer = row[6] || '';

          const date = parseDate(monthStr, yearStr);
          const maintenanceDone = date ? formatDate(date) : '';

          const nextDate = date ? addPeriod(date, maintenancePeriod) : null;
          const maintenanceNext = nextDate ? formatDate(nextDate) : '';

          const equipment = new Equipment(
            name,
            inventoryNumber,
            maintenancePeriod,
            maintenanceDone,
            maintenanceNext,
            engineer
          );

          equipments.push(equipment);
        }

        resolve(equipments);
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
