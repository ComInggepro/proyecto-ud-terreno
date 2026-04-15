// GOOGLE APPS SCRIPT — Proyecto UD · INGGEPRO v6
// Corregido: orden de columnas y formato de fechas

const SHEET_NAME = 'Diagnostico-Rehabilitacion UD';
const DRIVE_FOLDER_ID = '1q1U13Nu0kyGrImoW1GsVJaO6NPIksnTH';

const HEADERS = [
  'N°','Zona','Localidad','Plan','Origen','Recurso',
  'Fecha Solicitud','ODS','ID Servicio','Direccion',
  'Estado Cliente','Estado ITV','Fecha Ejecucion','Ano','Mes','N Visita',
  'Comentario Hallazgo','Hallazgo','Solucion','Ficha','Comentario',
  'Ubicacion UD','Materialidad','Largo Shape','Largo UD','Ubicacion Falla',
  'Diametro',
  'URL Foto Entorno','URL Foto Spray','URL Foto Monitor 1','URL Foto Monitor 2',
  'ID Registro','Fecha Registro','Analista Completado'
];

function limpiarFecha(val) {
  if (!val) return '';
  var s = String(val).trim();
  // Si ya es YYYY-MM-DD, retornar directo
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Si es objeto Date de JS como string, parsear
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    var yr = d.getFullYear();
    var mo = String(d.getMonth()+1).padStart(2,'0');
    var dy = String(d.getDate()).padStart(2,'0');
    return yr+'-'+mo+'-'+dy;
  }
  return s;
}

function subirFotoDrive(base64Data, nombreArchivo) {
  try {
    if (!base64Data || base64Data.length < 100) return '';
    var partes = base64Data.split(',');
    var datos = partes.length > 1 ? partes[1] : partes[0];
    var tipo = base64Data.indexOf('image/png') > -1 ? 'image/png' : 'image/jpeg';
    var blob = Utilities.newBlob(Utilities.base64Decode(datos), tipo, nombreArchivo);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var archivo = folder.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?export=view&id=' + archivo.getId();
  } catch(err) {
    console.log('Error foto Drive: ' + err.message);
    return '';
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Acción especial: borrar todos los registros
    if (data._action === 'borrarTodo' && data._clave === 'INGGEPRO2026') {
      var sheetB = getOrCreateSheet();
      var lastRow = sheetB.getLastRow();
      if (lastRow > 1) {
        sheetB.deleteRows(2, lastRow - 1);
      }
      return jsonResponse({ok:true, action:'borrado', filas: lastRow-1});
    }

    // Acción especial: eliminar un registro por ID
    if (data._action === 'eliminar' && data._id) {
      var sheetE = getOrCreateSheet();
      var rowE = findRow(sheetE, data._id);
      if (rowE > 0) {
        sheetE.deleteRow(rowE);
        return jsonResponse({ok:true, action:'eliminado', id: data._id});
      }
      return jsonResponse({ok:false, error:'Registro no encontrado'});
    }

    var sheet = getOrCreateSheet();
    var recId = String(data._id || '');
    if (!recId) return jsonResponse({ok:false, error:'Sin ID'});

    var existingRow = findRow(sheet, recId);
    var a = data.analista || {};
    var fecha = limpiarFecha(data.fechaEjecucion || data._ts);
    var hoy = limpiarFecha(new Date().toISOString());

    // Subir fotos a Drive solo si vienen en base64
    var urlEntorno='', urlSpray='', urlMon1='', urlMon2='';

    if (existingRow > 0) {
      var existing = sheet.getRange(existingRow, 1, 1, HEADERS.length).getValues()[0];
      var iUrlE = HEADERS.indexOf('URL Foto Entorno');
      urlEntorno = existing[iUrlE] || '';
      urlSpray   = existing[iUrlE+1] || '';
      urlMon1    = existing[iUrlE+2] || '';
      urlMon2    = existing[iUrlE+3] || '';
    }

    if (a.fotoEntorno  && a.fotoEntorno.length  > 100) urlEntorno = subirFotoDrive(a.fotoEntorno,  'entorno_'+recId+'.jpg');
    if (a.fotoSpray    && a.fotoSpray.length    > 100) urlSpray   = subirFotoDrive(a.fotoSpray,    'spray_'+recId+'.jpg');
    if (a.fotoMonitor1 && a.fotoMonitor1.length > 100) urlMon1    = subirFotoDrive(a.fotoMonitor1, 'mon1_'+recId+'.jpg');
    if (a.fotoMonitor2 && a.fotoMonitor2.length > 100) urlMon2    = subirFotoDrive(a.fotoMonitor2, 'mon2_'+recId+'.jpg');

    var row = [
      data.eb_n        || '',   // N°
      data.eb_zona     || '',   // Zona
      data.eb_loc      || '',   // Localidad
      data.eb_plan     || '',   // Plan
      data.eb_origen   || '',   // Origen
      data.eb_recurso  || '',   // Recurso
      limpiarFecha(data.eb_fecha) || '', // Fecha Solicitud
      data.eb_ods      || '',   // ODS
      data.eb_id       || '',   // ID Servicio
      data.eb_dir      || '',   // Direccion
      data.estadoCliente || '', // Estado Cliente
      data.estadoITV   || '',   // Estado ITV
      fecha            || '',   // Fecha Ejecucion
      data.ano         || '',   // Ano
      data.mes         || '',   // Mes
      data.nvisita     || '',   // N Visita
      a.comentHallazgo || '',   // Comentario Hallazgo
      a.hallazgo       || '',   // Hallazgo
      a.solucion       || '',   // Solucion
      a.ficha          || '',   // Ficha
      a.comentario     || '',   // Comentario
      data.ubicUD      || '',   // Ubicacion UD
      data.materialidad|| '',   // Materialidad
      data.largoShape  || '',   // Largo Shape
      data.largoUD     || '',   // Largo UD
      data.ubicFalla   || '',   // Ubicacion Falla
      data.diametro    || '',   // Diametro
      urlEntorno,               // URL Foto Entorno
      urlSpray,                 // URL Foto Spray
      urlMon1,                  // URL Foto Monitor 1
      urlMon2,                  // URL Foto Monitor 2
      recId,                    // ID Registro
      hoy,                      // Fecha Registro
      a.hallazgo ? 'Si' : 'No'  // Analista Completado
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return jsonResponse({ok:true, id:recId, urls:{entorno:urlEntorno,spray:urlSpray,mon1:urlMon1,mon2:urlMon2}});
  } catch(err) {
    return jsonResponse({ok:false, error:err.message});
  }
}

function doGet(e) {
  try {
    var params  = e.parameter || {};
    var callback = params.callback || '';
    var sheet   = getOrCreateSheet();
    var data    = sheet.getDataRange().getValues();

    if (data.length <= 1) return respond({ok:true, data:[], total:0}, callback);

    var headers = data[0];
    var todos = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var id  = String(row[headers.indexOf('ID Registro')] || '').trim();
      if (!id) continue;
      var rec = {};
      for (var j = 0; j < headers.length; j++) {
        var val = row[j];
        // Limpiar fechas que Google Sheets convierte a objetos Date
        if (val instanceof Date) {
          var yr = val.getFullYear();
          var mo = String(val.getMonth()+1).padStart(2,'0');
          var dy = String(val.getDate()).padStart(2,'0');
          val = yr+'-'+mo+'-'+dy;
        }
        rec[headers[j]] = val !== undefined && val !== null ? String(val) : '';
      }
      todos.push(rec);
    }
    return respond({ok:true, data:todos, total:todos.length}, callback);
  } catch(err) {
    return respond({ok:false, error:err.message}, (e.parameter||{}).callback||'');
  }
}

function respond(obj, callback) {
  var json = JSON.stringify(obj);
  var mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  var out  = ContentService.createTextOutput(callback ? callback+'('+json+')' : json);
  out.setMimeType(mime);
  return out;
}

function getOrCreateSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    var h = sheet.getRange(1, 1, 1, HEADERS.length);
    h.setBackground('#0d3b6e');
    h.setFontColor('#ffffff');
    h.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  return sheet;
}

function findRow(sheet, recId) {
  if (!recId) return -1;
  var data   = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol  = headers.indexOf('ID Registro');
  if (idCol < 0) return -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(recId).trim()) return i + 1;
  }
  return -1;
}

function jsonResponse(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
