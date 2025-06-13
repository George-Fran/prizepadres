
const express = require('express');
const fileUpload = require('express-fileupload');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dayjs = require('dayjs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(express.static('public'));

const PADRES_FILE = path.join(__dirname, 'padres.xlsx');
const REGISTRO_FILE = path.join(__dirname, 'registro.xlsx');

function cargarPadres() {
  const wb = xlsx.readFile(PADRES_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws);

  // Asume que la columna es 'DNI' en la cabecera
  return data.map(row => String(row['DNI']).trim());
}

function buscarNombrePorDni(dni) {
  const wb = xlsx.readFile(PADRES_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws);

  const persona = data.find(row => String(row['DNI']).trim() === dni);
  return persona ? persona['ApellidosNombres'] : '';
}

function guardarRegistro(dni) {
  const fecha = dayjs().format('YYYY-MM-DD');
  const hora = dayjs().format('HH:mm:ss');
  const nombre = buscarNombrePorDni(dni);

  let registros = [];
  if (fs.existsSync(REGISTRO_FILE)) {
    const wb = xlsx.readFile(REGISTRO_FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    registros = xlsx.utils.sheet_to_json(ws);
  }

  registros.push({ Fecha: fecha, Hora: hora, DNI: dni, Nombre: nombre });
  const ws = xlsx.utils.json_to_sheet(registros);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Registros');
  xlsx.writeFile(wb, REGISTRO_FILE);
}


app.post('/registrar', (req, res) => {
  const { dni } = req.body;
  if (!dni) return res.status(400).json({ ok: false, msg: 'DNI requerido' });

  const lista = cargarPadres();
  if (!lista.includes(String(dni))) {
    return res.json({ ok: false, msg: 'Tú no eres padre' });
  }

  guardarRegistro(dni);
  res.json({ ok: true, msg: 'Registro exitoso' });
});

app.get('/descargar', (req, res) => {
  if (!fs.existsSync(REGISTRO_FILE)) return res.status(404).send('No hay registros aún');
  res.download(REGISTRO_FILE);
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
