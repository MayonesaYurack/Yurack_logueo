class TaladroApp {
  constructor() {
    this.requestPermissions()
      .then(() => {
        this.app = document.getElementById('app');
        this.codes = JSON.parse(localStorage.getItem('taladroCodeList')) || [];
        this.tramos = JSON.parse(localStorage.getItem('taladroTramos')) || {};
        this.renderMainPage();
      })
      .catch(error => {
        console.error('Permission request failed:', error);
        alert('No se pudieron obtener los permisos necesarios. Algunas funciones pueden estar limitadas.');
        this.app = document.getElementById('app');
        this.codes = JSON.parse(localStorage.getItem('taladroCodeList')) || [];
        this.tramos = JSON.parse(localStorage.getItem('taladroTramos')) || {};
        this.renderMainPage();
      });
  }

  async requestPermissions() {
    return new Promise((resolve, reject) => {
      // Check if we're running in a Cordova environment
      if (window.cordova) {
        // Request permissions
        cordova.plugins.permissions.requestPermissions([
          cordova.plugins.permissions.WRITE_EXTERNAL_STORAGE,
          cordova.plugins.permissions.READ_EXTERNAL_STORAGE,
          cordova.plugins.permissions.ACCESS_WIFI_STATE,
          cordova.plugins.permissions.CHANGE_WIFI_STATE
        ], (status) => {
          if (status.hasPermission) {
            console.log('Permissions granted');
            resolve();
          } else {
            console.warn('Permissions not granted');
            reject(new Error('Permissions not granted'));
          }
        }, (error) => {
          console.error('Permission request error', error);
          reject(error);
        });
      } else {
        // If not in Cordova, resolve immediately
        console.log('Not in mobile environment, skipping permissions');
        resolve();
      }
    });
  }

  renderMainPage() {
    this.app.innerHTML = `
      <div class="container">
        <h1>Código de Taladro</h1>
        <form id="add-code-form">
          <div class="form-group">
            <input type="text" id="code-input" placeholder="Ingresar nuevo código" required>
          </div>
          <button type="submit" class="btn">Agregar Código</button>
        </form>
        <ul id="code-list">
          ${this.codes.map((code, index) => `
            <li class="list-item" data-code="${code}">
              ${code}
              <div>
                <button class="btn btn-delete" data-index="${index}">Borrar</button>
              </div>
            </li>
          `).join('')}
        </ul>
        <button class="btn export-btn">Exportar a Excel</button>
      </div>
    `;

    // Event Listeners
    const form = this.app.querySelector('#add-code-form');
    const codeInput = this.app.querySelector('#code-input');
    const codeList = this.app.querySelector('#code-list');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newCode = codeInput.value.trim();
      if (newCode && !this.codes.includes(newCode)) {
        this.codes.push(newCode);
        this.saveCodesLocalStorage();
        this.renderMainPage();
        codeInput.value = '';
      }
    });

    codeList.addEventListener('click', (e) => {
      const codeElement = e.target.closest('.list-item');
      const deleteBtn = e.target.closest('.btn-delete');

      if (deleteBtn) {
        const index = deleteBtn.dataset.index;
        this.codes.splice(index, 1);
        this.saveCodesLocalStorage();
        this.renderMainPage();
      } else if (codeElement) {
        const code = codeElement.dataset.code;
        this.renderTramoPage(code);
      }
    });

    // Export button with new dialog
    const exportBtn = this.app.querySelector('.export-btn');
    exportBtn.addEventListener('click', () => this.showExportDialog());
  }

  renderTramoPage(code) {
    const tramos = this.tramos[code] || [];
    const lastTramo = tramos.length > 0 ? tramos[tramos.length - 1].profundidadFinal : 0;
    
    this.app.innerHTML = `
      <div class="container">
        <button class="back-btn" id="back-btn">←</button>
        <button class="add-btn" id="add-tramo-btn">+</button>
        <h1>Tramos de ${code}</h1>

        <div id="tramos-list">
          ${tramos.map((tramo, index) => `
            <div class="tramo-details">
              <p>Profundidad: ${tramo.profundidadInicio} - ${tramo.profundidadFinal}</p>
              <p>Tipo de Roca: ${tramo.tipoRoca}</p>
              ${tramo.image ? `
                <div class="image-container">
                  <img src="${tramo.image}" class="tramo-image" alt="Imagen del Tramo">
                  ${tramo.imageDescription ? `
                    <p class="image-description">${tramo.imageDescription}</p>
                  ` : ''}
                </div>
              ` : ''}
              <div>
                <button class="btn btn-view" data-index="${index}">Ver</button>
                <button class="btn btn-edit" data-index="${index}">Editar</button>
                <button class="btn btn-delete" data-index="${index}">Borrar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const backBtn = this.app.querySelector('#back-btn');
    const addTramoBtn = this.app.querySelector('#add-tramo-btn');
    const tramosList = this.app.querySelector('#tramos-list');

    // Botón de retorno
    backBtn.addEventListener('click', () => this.renderMainPage());

    // Botón de agregar tramo
    addTramoBtn.addEventListener('click', () => this.renderTramoForm(code));

    // Borrar, editar o ver tramo
    tramosList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete');
      const editBtn = e.target.closest('.btn-edit');
      const viewBtn = e.target.closest('.btn-view');
      
      if (deleteBtn) {
        const index = deleteBtn.dataset.index;
        this.tramos[code].splice(index, 1);
        this.saveTramoLocalStorage();
        this.renderTramoPage(code);
      } else if (editBtn) {
        const index = editBtn.dataset.index;
        this.renderTramoForm(code, tramos[index], index);
      } else if (viewBtn) {
        const index = viewBtn.dataset.index;
        this.renderTramoDetails(code, tramos[index]);
      }
    });
  }

  renderTramoDetails(code, tramo) {
    this.app.innerHTML = `
      <div class="container">
        <button class="back-btn" id="back-btn">←</button>
        <h1>Detalles del Tramo de ${code}</h1>

        <div class="tramo-details-view">
          <div class="detail-group">
            <strong>Profundidad Inicio:</strong> 
            <span>${tramo.profundidadInicio} m</span>
          </div>
          <div class="detail-group">
            <strong>Profundidad Final:</strong> 
            <span>${tramo.profundidadFinal} m</span>
          </div>
          <div class="detail-group">
            <strong>Tipo de Roca:</strong> 
            <span>${tramo.tipoRoca}</span>
          </div>
          ${tramo.tamanoGrano && tramo.tipoRoca === 'Brecha' ? `
            <div class="detail-group">
              <strong>Tamaño de Grano:</strong> 
              <span>${tramo.tamanoGrano}</span>
            </div>
          ` : ''}
          <div class="detail-group">
            <strong>Contacto Superior:</strong> 
            <span>${tramo.contactoSuperior}</span>
          </div>
          <div class="detail-group">
            <strong>Contacto Inferior:</strong> 
            <span>${tramo.contactoInferior}</span>
          </div>
          <div class="detail-group">
            <strong>Zr-TiO2:</strong> 
            <span>${tramo.zrTiO2 || 'N/A'}</span>
          </div>
          <div class="detail-group">
            <strong>AI:</strong> 
            <span>${tramo.ai || 'N/A'}</span>
          </div>
          <div class="detail-group">
            <strong>CPPI:</strong> 
            <span>${tramo.cppi || 'N/A'}</span>
          </div>
          <div class="detail-group">
            <strong>Moteado:</strong> 
            <span>${tramo.moteado || 'N/A'}</span>
          </div>
          <div class="detail-group">
            <strong>Magnetismo:</strong> 
            <span>${tramo.magnetismo}</span>
          </div>
          <div class="detail-group">
            <strong>Tipo de Alteración:</strong> 
            <span>${tramo.tipoAlteracion || 'N/A'}</span>
          </div>
          <div class="detail-group">
            <strong>Porcentaje de Pirita:</strong> 
            <span>${tramo.porcentajePirita || 'N/A'}%</span>
          </div>
          <div class="detail-group">
            <strong>Forma de Mineralización:</strong> 
            <span>${tramo.formaMin}</span>
          </div>
          <div class="detail-group">
            <strong>Mineralización:</strong> 
            <span>${tramo.mineralizacion || 'N/A'}</span>
          </div>
          <div class="detail-group">
            <strong>Descripción:</strong> 
            <span>${tramo.descripcion || 'N/A'}</span>
          </div>

          ${tramo.image ? `
            <div class="detail-group image-section">
              <strong>Imagen:</strong>
              <div class="image-container">
                <img src="${tramo.image}" class="tramo-image" alt="Imagen del Tramo">
                ${tramo.imageDescription ? `
                  <p class="image-description">${tramo.imageDescription}</p>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const backBtn = this.app.querySelector('#back-btn');
    
    // Botón de retorno
    backBtn.addEventListener('click', () => this.renderTramoPage(code));
  }

  renderTramoForm(code, tramo = null, index = null) {
    const tramos = this.tramos[code] || [];
    const lastTramo = tramos.length > 0 ? tramos[tramos.length - 1].profundidadFinal : 0;
    
    this.app.innerHTML = `
      <div class="container">
        <button class="back-btn" id="back-btn">←</button>
        <h1>${tramo ? 'Editar' : 'Agregar'} Tramo para ${code}</h1>
        <form id="tramo-form">
          <div class="form-group">
            <label>Profundidad Inicio</label>
            <input type="number" id="profundidad-inicio" step="0.1" 
                   value="${tramo ? tramo.profundidadInicio : lastTramo}" 
                   readonly required>
          </div>
          <div class="form-group">
            <label>Profundidad Final *</label>
            <input type="number" id="profundidad-final" step="0.1" 
                   value="${tramo ? tramo.profundidadFinal : ''}" 
                   required>
          </div>
          <div class="form-group">
            <label>Tipo de Roca *</label>
            <select id="tipo-roca" required>
              <option value="">Seleccionar</option>
              <option value="Basalto/Andesita" 
                      ${tramo && tramo.tipoRoca === 'Basalto/Andesita' ? 'selected' : ''}>
                Basalto/Andesita
              </option>
              <option value="Andesita" 
                      ${tramo && tramo.tipoRoca === 'Andesita' ? 'selected' : ''}>
                Andesita
              </option>
              <option value="Dacita/Riodacita" 
                      ${tramo && tramo.tipoRoca === 'Dacita/Riodacita' ? 'selected' : ''}>
                Dacita/Riodacita
              </option>
              <option value="Riodacita/Dacita" 
                      ${tramo && tramo.tipoRoca === 'Riodacita/Dacita' ? 'selected' : ''}>
                Riodacita/Dacita
              </option>
              <option value="Riolita" 
                      ${tramo && tramo.tipoRoca === 'Riolita' ? 'selected' : ''}>
                Riolita
              </option>
              <option value="Dique" 
                      ${tramo && tramo.tipoRoca === 'Dique' ? 'selected' : ''}>
                Dique
              </option>
              <option value="Brecha" 
                      ${tramo && tramo.tipoRoca === 'Brecha' ? 'selected' : ''}>
                Brecha
              </option>
            </select>
          </div>
          <div class="form-group checkbox-group" id="tamano-grano-group" 
               style="display:${tramo && tramo.tipoRoca === 'Brecha' ? 'block' : 'none'};">
            <label>Tamaño de Grano</label>
            <div>
              ${['Muy fino (<2mm)', 'Fino (2-4mm)', 'Medio (4-20mm)', 
                 'Grueso (2-6cm)', 'Muy grueso (>6cm)']
                 .map(size => `
                 <label>
                   <input type="checkbox" name="tamano-grano" value="${size}"
                          ${tramo && tramo.tamanoGrano && 
                           tramo.tamanoGrano.includes(size) ? 'checked' : ''}>
                   ${size}
                 </label>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label>Contacto Superior</label>
            <input type="text" id="contacto-superior" 
                   value="${tramo ? tramo.contactoSuperior || '' : ''}" 
                   placeholder="Ej. 45° o Irregular">
          </div>
          <div class="form-group">
            <label>Contacto Inferior</label>
            <input type="text" id="contacto-inferior" 
                   value="${tramo ? tramo.contactoInferior || '' : ''}" 
                   placeholder="Ej. 30° o Irregular">
          </div>
          <div class="form-group">
            <label>Imagen (opcional)</label>
            <input type="file" id="tramo-image" accept="image/*">
            ${tramo && tramo.image ? `
              <img src="${tramo.image}" class="tramo-image" alt="Imagen del Tramo">
            ` : ''}
          </div>
          <div class="form-group">
            <label>Descripción de la Imagen (opcional)</label>
            <textarea id="image-description">${tramo && tramo.imageDescription ? tramo.imageDescription : ''}</textarea>
          </div>
          <div class="form-group">
            <label>Zr-TiO2</label>
            <input type="text" id="zr-tio2" value="${tramo ? tramo.zrTiO2 || '' : ''}">
          </div>
          <div class="form-group">
            <label>AI</label>
            <input type="text" id="ai" value="${tramo ? tramo.ai || '' : ''}">
          </div>
          <div class="form-group">
            <label>CPPI</label>
            <input type="text" id="cppi" value="${tramo ? tramo.cppi || '' : ''}">
          </div>
          <div class="form-group">
            <label>Moteado</label>
            <select id="moteado">
              <option value="n/a" 
                      ${!tramo || !tramo.moteado || tramo.moteado === 'n/a' ? 'selected' : ''}>
                N/A
              </option>
              <option value="claro" 
                      ${tramo && tramo.moteado === 'claro' ? 'selected' : ''}>
                Claro
              </option>
              <option value="oscuro" 
                      ${tramo && tramo.moteado === 'oscuro' ? 'selected' : ''}>
                Oscuro
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Magnetismo</label>
            <select id="magnetismo">
              ${[0, 1, 2, 3].map(val => `
                <option value="${val}" 
                        ${tramo && tramo.magnetismo === val.toString() ? 'selected' : ''}>
                  ${val}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tipo de Alteración</label>
            <input type="text" id="tipo-alteracion" 
                   value="${tramo ? tramo.tipoAlteracion || '' : ''}">
          </div>
          <div class="form-group">
            <label>Porcentaje de Pirita</label>
            <input type="number" id="porcentaje-pirita" min="0" max="100" 
                   value="${tramo ? tramo.porcentajePirita || '' : ''}">
          </div>
          <div class="form-group checkbox-group" id="forma-min-group">
            <label>Forma Min</label>
            <div class="checkbox-options">
              ${['Venillas', 'Vetas', 'Diseminado', 'Parches', 'Masivo']
                .map(forma => `
                <label>
                  <input type="checkbox" name="forma-min" value="${forma}"
                         ${tramo && (tramo.formaMin || '').split(', ').includes(forma) ? 'checked' : ''}>
                  ${forma}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label>Mineralización</label>
            <input type="text" id="mineralizacion" 
                   value="${tramo ? tramo.mineralizacion || '' : ''}">
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea id="descripcion">${tramo ? tramo.descripcion || '' : ''}</textarea>
          </div>
          <button type="submit" class="btn">
            ${tramo ? 'Actualizar' : 'Agregar'} Tramo
          </button>
        </form>
      </div>
    `;

    const backBtn = this.app.querySelector('#back-btn');
    const form = this.app.querySelector('#tramo-form');
    const tipoRocaSelect = this.app.querySelector('#tipo-roca');
    const tamanoGranoGroup = this.app.querySelector('#tamano-grano-group');
    const imageInput = this.app.querySelector('#tramo-image');

    // Mostrar/ocultar tamaño de grano
    tipoRocaSelect.addEventListener('change', (e) => {
      tamanoGranoGroup.style.display = e.target.value === 'Brecha' ? 'block' : 'none';
    });

    // Botón de retorno
    backBtn.addEventListener('click', () => this.renderTramoPage(code));

    // Manejar imagen
    let imageDataUrl = tramo ? tramo.image : null;
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          imageDataUrl = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    // Agregar/Editar tramo
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Validar campos obligatorios
      const profundidadFinal = document.getElementById('profundidad-final').value;
      const tipoRoca = document.getElementById('tipo-roca').value;

      if (!profundidadFinal || !tipoRoca) {
        alert('Profundidad Final y Tipo de Roca son campos obligatorios');
        return;
      }

      // Recoger tamaños de grano seleccionados
      const tamanoGranoCheckboxes = document.querySelectorAll('input[name="tamano-grano"]:checked');
      const tamanoGrano = Array.from(tamanoGranoCheckboxes)
          .map(cb => cb.value)
          .join(', ');

      const formaMinCheckboxes = document.querySelectorAll('input[name="forma-min"]:checked');
      const selectedFormaMin = Array.from(formaMinCheckboxes)
        .map(cb => cb.value)
        .join(', ');

      const profundidadInicio = document.getElementById('profundidad-inicio').value;
      const newTramo = {
        profundidadInicio,
        profundidadFinal,
        tipoRoca,
        tamanoGrano: tipoRoca === 'Brecha' ? tamanoGrano : '',
        formaMin: selectedFormaMin,
        contactoSuperior: document.getElementById('contacto-superior').value || '',
        contactoInferior: document.getElementById('contacto-inferior').value || '',  
        zrTiO2: document.getElementById('zr-tio2').value || '',
        ai: document.getElementById('ai').value || '',
        cppi: document.getElementById('cppi').value || '',
        moteado: document.getElementById('moteado').value || '',
        magnetismo: document.getElementById('magnetismo').value || '',  
        tipoAlteracion: document.getElementById('tipo-alteracion').value || '',
        porcentajePirita: document.getElementById('porcentaje-pirita').value || '',
        mineralizacion: document.getElementById('mineralizacion').value || '',
        descripcion: document.getElementById('descripcion').value || '',
        image: imageDataUrl,
        imageDescription: document.getElementById('image-description').value
      };

      if (!this.tramos[code]) {
        this.tramos[code] = [];
      }

      if (index !== null) {
        // Editar tramo existente
        this.tramos[code][index] = newTramo;
      } else {
        // Agregar nuevo tramo
        this.tramos[code].push(newTramo);
      }

      this.saveTramoLocalStorage();
      this.renderTramoPage(code);
    });
  }

  showExportDialog() {
    // Create a dialog for code selection
    const dialog = document.createElement('div');
    dialog.classList.add('export-dialog');
    dialog.innerHTML = `
      <div class="export-dialog-content">
        <h2>Seleccionar Códigos para Exportar</h2>
        <form id="export-form">
          <div class="codes-selection">
            ${this.codes.map(code => `
              <label>
                <input type="checkbox" name="export-codes" value="${code}">
                ${code}
              </label>
            `).join('')}
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-export">Exportar</button>
          </div>
        </form>
      </div>
    `;

    // Append dialog to app
    this.app.appendChild(dialog);

    const exportForm = dialog.querySelector('#export-form');
    const cancelBtn = dialog.querySelector('.btn-cancel');

    // Cancel button closes the dialog
    cancelBtn.addEventListener('click', () => {
      this.app.removeChild(dialog);
    });

    // Handle export submission
    exportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get selected codes
      const selectedCodes = Array.from(
        dialog.querySelectorAll('input[name="export-codes"]:checked')
      ).map(input => input.value);

      // Remove dialog
      this.app.removeChild(dialog);

      // Proceed with export of selected codes
      this.exportToExcel(selectedCodes);
    });
  }

  exportToExcel(selectedCodes = null) {
    try {
      const workbook = XLSX.utils.book_new();

      // Determine codes to export
      const codesToExport = selectedCodes && selectedCodes.length > 0 
        ? selectedCodes 
        : this.codes;

      // Flag to track if any data was exported
      let hasExportedData = false;

      // Create a sheet for each selected code
      codesToExport.forEach(code => {
        const tramos = this.tramos[code] || [];
        
        // Prepare data for Excel with safe access and default values
        const excelData = tramos.map(tramo => ({
          'Código de Taladro': code || '',
          'Profundidad Inicio (m)': tramo.profundidadInicio || '0',
          'Profundidad Final (m)': tramo.profundidadFinal || '',
          'Tipo de Roca': tramo.tipoRoca || '',
          'Tamaño de Grano': tramo.tamanoGrano || '',
          'Descripción': tramo.descripcion || '',
          'Zr-TiO2': tramo.zrTiO2 || '',
          'AI': tramo.ai || '',
          'CPPI': tramo.cppi || '',
          'Tipo de Alteración': tramo.tipoAlteracion || '',
          'Magnetismo': tramo.magnetismo || '',
          'Forma de Mineralización': tramo.formaMin || '',
          'Porcentaje de Pirita': tramo.porcentajePirita || '',
          'Contacto Superior (°)': tramo.contactoSuperior || '',
          'Contacto Inferior (°)': tramo.contactoInferior || '',
          'Descripción de la Imagen': tramo.imageDescription || '',
          'Imagen': tramo.image ? 'Sí' : 'No'
        }));

        // Only create worksheet if there's data for this code
        if (excelData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(excelData);
          XLSX.utils.book_append_sheet(workbook, worksheet, code || 'Sin Nombre');
          hasExportedData = true;
        }
      });

      // Check if any worksheets were added
      if (!hasExportedData) {
        alert('No hay datos para exportar');
        return;
      }

      // Create Excel file
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

      // Check if we're on a mobile device and use appropriate method
      if (window.cordova) {
        // Use Cordova plugin to write file
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        
        window.requestFileSystem(window.TEMPORARY, excelBuffer.byteLength, (fs) => {
          fs.root.getFile('Taladros_Exportados.xlsx', { create: true }, (fileEntry) => {
            fileEntry.createWriter((fileWriter) => {
              const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              
              fileWriter.onwriteend = () => {
                // Use FileOpener plugin to open the file
                if (window.cordova.plugins.fileOpener2) {
                  window.cordova.plugins.fileOpener2.open(
                    fileEntry.toURL(),
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    {
                      error: () => {
                        alert('No se pudo abrir el archivo');
                      },
                      success: () => {
                        alert('Archivo exportado y abierto');
                      }
                    }
                  );
                } else {
                  alert('Archivo exportado en: ' + fileEntry.toURL());
                }
              };
              
              fileWriter.onerror = (e) => {
                console.error('Error escribiendo archivo', e);
                alert('Error al exportar archivo');
              };
              
              fileWriter.write(blob);
            });
          }, (error) => {
            console.error('Error creando archivo', error);
            alert('No se pudo crear el archivo');
          });
        }, (error) => {
          console.error('Error de sistema de archivos', error);
          alert('Error en el sistema de archivos');
        });
      } else if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/iOS/i)) {
        // For mobile web browsers
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Taladros_Exportados.xlsx';
        link.click();
      } else {
        // Default browser download
        XLSX.writeFile(workbook, 'Taladros_Exportados.xlsx');
      }
    } catch (error) {
      console.error('Error en exportación:', error);
      alert('Hubo un error al exportar los datos. Por favor, inténtelo de nuevo.');
    }
  }

  saveCodesLocalStorage() {
    localStorage.setItem('taladroCodeList', JSON.stringify(this.codes));
  }

  saveTramoLocalStorage() {
    localStorage.setItem('taladroTramos', JSON.stringify(this.tramos));
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Check if Cordova is loaded before initializing
  if (window.cordova) {
    document.addEventListener('deviceready', () => {
      new TaladroApp();
    }, false);
  } else {
    new TaladroApp();
  }
});