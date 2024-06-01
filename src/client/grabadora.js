const recordButton = document.getElementById('record');
const stopButton = document.getElementById('stop');
const listaArchivos = document.getElementById('lista-archivos');
const recordingIndicator = document.getElementById('recording-indicator');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');
let mediaRecorder;
let audioChunks = [];
let audioElement = null;
let archivoAEliminar;
let updateIntervalId;

// Intervalo de tiempo para actualizar la lista de archivos (en milisegundos)
const updateInterval = 5000; // 5 segundos

recordButton.addEventListener('click', () => {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      recordButton.disabled = true;
      stopButton.disabled = false;
      recordingIndicator.classList.remove('d-none');

      mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks);
        const formData = new FormData();
        formData.append('archivo', audioBlob, 'grabacion.wav');
        fetch('/api/archivos', {
          method: 'POST',
          body: formData
        }).then(() => {
          actualizarListaArchivos();
        });
        audioChunks = [];
        recordingIndicator.classList.add('d-none');
      });
    });
});

stopButton.addEventListener('click', () => {
  mediaRecorder.stop();
  recordButton.disabled = false;
  stopButton.disabled = true;
  recordingIndicator.classList.add('d-none');
});

function actualizarListaArchivos() {
  fetch('/api/archivos')
    .then(response => response.json())
    .then(archivos => {
      listaArchivos.innerHTML = '';
      archivos.forEach(archivo => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

        const span = document.createElement('span');
        span.textContent = archivo.name;
        span.classList.add('nombre-archivo');
        li.appendChild(span);

        const btnGroup = document.createElement('div');
        btnGroup.classList.add('btn-group');

        const btnReproducir = document.createElement('button');
        btnReproducir.innerHTML = '<i class="fas fa-play"></i>';
        btnReproducir.classList.add('btn', 'btn-success', 'ml-2');
        btnReproducir.addEventListener('click', () => {
          if (audioElement && !audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement = null;
          }
          fetch(`/api/archivos/${archivo.id}`)
            .then(response => response.blob())
            .then(blob => {
              const url = URL.createObjectURL(blob);
              audioElement = new Audio(url);
              audioElement.play();
              span.textContent = `${archivo.name} (Reproduciendo...)`;
              audioElement.addEventListener('ended', () => {
                span.textContent = archivo.name;
              });
            });
        });
        btnGroup.appendChild(btnReproducir);

        const btnPausar = document.createElement('button');
        btnPausar.innerHTML = '<i class="fas fa-pause"></i>';
        btnPausar.classList.add('btn', 'btn-warning', 'ml-2');
        btnPausar.addEventListener('click', () => {
          if (audioElement && !audioElement.paused) {
            audioElement.pause();
            span.textContent = `${archivo.name} (Pausado)`;
          }
        });
        btnGroup.appendChild(btnPausar);

        const btnDetener = document.createElement('button');
        btnDetener.innerHTML = '<i class="fas fa-stop"></i>';
        btnDetener.classList.add('btn', 'btn-danger', 'ml-2');
        btnDetener.addEventListener('click', () => {
          if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            span.textContent = archivo.name;
            audioElement = null;
          }
        });
        btnGroup.appendChild(btnDetener);

        const btnBorrar = document.createElement('button');
        btnBorrar.innerHTML = '<i class="fas fa-trash"></i>';
        btnBorrar.classList.add('btn', 'btn-danger', 'ml-2');
        btnBorrar.addEventListener('click', () => {
          archivoAEliminar = archivo.id;
          $('#confirmDeleteModal').modal('show');
        });
        btnGroup.appendChild(btnBorrar);

        li.appendChild(btnGroup);
        listaArchivos.appendChild(li);
      });
    });
}

confirmDeleteButton.addEventListener('click', () => {
  fetch(`/api/archivos/${archivoAEliminar}`, {
    method: 'DELETE'
  }).then(() => {
    $('#confirmDeleteModal').modal('hide');
    actualizarListaArchivos();
  });
});

// Actualizar la lista de archivos automáticamente cada cierto intervalo
updateIntervalId = setInterval(actualizarListaArchivos, updateInterval);

// Actualizar la lista de archivos al cargar la página
actualizarListaArchivos();
