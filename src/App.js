import React, { useState } from 'react';
import { parseExcelFile } from './Parser';
import { generatePdf } from './PdfConverter';
import Equipment from './Equipment';
import './App.css'

function App() {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [equipments, setEquipments] = useState([]);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setError('');
    setEquipments([]);
    const selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;

    if (!selectedFile) {
      setFileName('');
      setFile(null);
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
      setError('Пожалуйста, загрузите файл в формате .xlsx или .xls');
      setFileName('');
      setFile(null);
      return;
    }

    setFileName(selectedFile.name);
    setFile(selectedFile);
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setEquipments([]);

    try {
      const parsedEquipments = await parseExcelFile(file);

      if (!parsedEquipments || parsedEquipments.length === 0) {
        setError('Файл пустой или не содержит данных.');
        setLoading(false);
        return;
      }

      setEquipments(parsedEquipments);
      setLoading(false);
    } catch (err) {
      setError('Ошибка при обработке файла: ' + err.toString());
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!equipments || equipments.length === 0) {
      setError('Нет данных для генерации PDF');
      return;
    }
    try {
      generatePdf(equipments, 'equipment_report.pdf');
    } catch (err) {
      setError('Ошибка при генерации PDF: ' + err.toString());
    }
  };

  return (
    <>
      <div className="container">
        <h2>Конвертер Excel в PDF (3 × 7)</h2>
        <div className="desc">
          Загрузите Excel-файл (.xlsx или .xls).<br />
          Вся проверка формата и заголовков выполняется при конвертации.
        </div>
        <label className="file-label" htmlFor="excelFile">
          Выберите Excel-файл:
        </label>
        <input type="file" id="excelFile" accept=".xlsx,.xls" onChange={handleFileChange} />
        <div id="fileName">{fileName}</div>
        <button id="convertBtn" disabled={!file || loading} onClick={handleConvert}>
          Конвертировать
        </button>
        <button id="downloadPdfBtn" disabled={!equipments.length} onClick={handleDownloadPdf}>
          Скачать PDF
        </button>
        {loading && <div id="loading" className="loading">Обработка файла, пожалуйста, подождите...</div>}
        {error && <div id="error">{error}</div>}
        {equipments.length > 0 && (
          <div id="preview">
            <b>Данные успешно загружены. Кол-во записей: {equipments.length}</b>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
