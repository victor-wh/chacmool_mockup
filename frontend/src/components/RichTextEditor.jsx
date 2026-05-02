import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import './ckeditor.css';

// Tamaño máximo de imagen: 2 MB (las imágenes se guardan inline como base64 en la descripción)
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Upload adapter que convierte los archivos cargados en data URLs base64.
 * Consistente con el almacenamiento de evidencias del módulo Process.
 */
class Base64UploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(
      (file) => new Promise((resolve, reject) => {
        if (!file) {
          reject('No se recibió ningún archivo.');
          return;
        }
        if (!file.type.startsWith('image/')) {
          reject('El archivo debe ser una imagen.');
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          reject(`La imagen excede el tamaño máximo permitido (${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)} MB).`);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve({ default: reader.result });
        reader.onerror = () => reject('No se pudo leer la imagen.');
        reader.onabort = () => reject('Carga cancelada.');
        reader.readAsDataURL(file);
      })
    );
  }

  abort() { /* no-op para lecturas locales */ }
}

function Base64UploadAdapterPlugin(editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => new Base64UploadAdapter(loader);
}

/**
 * Wrapper reutilizable sobre CKEditor 5 Classic con soporte de imágenes inline.
 */
export const RichTextEditor = ({ value = '', onChange, placeholder = 'Escribe aquí...', testId = 'rich-text-editor' }) => {
  return (
    <div data-testid={testId} className="ckeditor-wrapper">
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{
          licenseKey: 'GPL',
          placeholder,
          extraPlugins: [Base64UploadAdapterPlugin],
          toolbar: {
            items: [
              'heading', '|',
              'bold', 'italic', 'underline', '|',
              'bulletedList', 'numberedList', '|',
              'link', 'blockQuote', '|',
              'uploadImage', '|',
              'undo', 'redo'
            ]
          },
          image: {
            toolbar: [
              'imageStyle:inline',
              'imageStyle:block',
              'imageStyle:side',
              '|',
              'toggleImageCaption',
              'imageTextAlternative',
            ]
          }
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange?.(data);
        }}
      />
    </div>
  );
};

export default RichTextEditor;
