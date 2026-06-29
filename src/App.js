// App.js
import React, { useState } from 'react';
import { parseExcelFile } from './Parser';
import { generatePdf } from './PdfConverter';
import './App.css'

function App() {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);

  const handleFileChange = (e) => {
    setError('');
    setWarnings([]);
    setEquipments([]);
    setSummary(null);
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
    setWarnings([]);
    setEquipments([]);
    setSummary(null);

    try {
      const result = await parseExcelFile(file);

      if (!result.equipments || result.equipments.length === 0) {
        setError('Файл пустой или не содержит данных.');
        setLoading(false);
        return;
      }

      setEquipments(result.equipments);
      setWarnings(result.warnings || []);
      setSummary(result.summary);
      
      if (result.errors && result.errors.length > 0) {
        setError(`Найдены критические ошибки:\n${result.errors.join('\n')}`);
      }
      
      setLoading(false);
    } catch (err) {
      let errorMessage = err.toString();
      if (errorMessage.includes('Error: ')) {
        errorMessage = errorMessage.replace('Error: ', '');
      }
      setError(errorMessage);
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
          Все листы будут обработаны. Проверка формата и заголовков выполняется при конвертации.
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
        
        {summary && (
          <div id="summary" style={{ marginTop: '16px', padding: '12px', background: '#f0f0f0', borderRadius: '4px' }}>
            <b>Статистика:</b>
            <div>Обработано листов: {summary.sheetsProcessed}, валидных листов: {summary.validSheets}</div>
            <div>Всего записей: {summary.totalRecords}</div>
            {summary.ignoredSheets.length > 0 && (
              <div>Пропущено служебных листов: {summary.ignoredSheets.join(', ')}</div>
            )}
            {warnings.length > 0 && (
              <div style={{ color: '#856404', marginTop: '8px' }}>
                <b>Предупреждений: {warnings.length}</b>
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div id="error" style={{ marginTop: '12px', padding: '12px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
            <b>Ошибка:</b>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', marginBottom: 0 }}>{error}</pre>
          </div>
        )}
        
        {warnings.length > 0 && (
          <div id="warnings" style={{ marginTop: '12px', padding: '12px', background: '#fff3cd', color: '#856404', borderRadius: '4px', border: '1px solid #ffc107' }}>
            <b>Предупреждения ({warnings.length}):</b>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', marginBottom: 0 }}>{warnings.join('\n')}</pre>
          </div>
        )}
        
        {equipments.length > 0 && (
          <div id="preview" style={{ marginTop: '12px', padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
            <b>Данные успешно загружены. Кол-во записей: {equipments.length}</b>
          </div>
        )}
      </div>
    </>
  );
}

export default App;