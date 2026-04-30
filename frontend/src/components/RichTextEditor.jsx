import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import './ckeditor.css';

/**
 * Wrapper reutilizable sobre CKEditor 5 Classic.
 * - value: string HTML
 * - onChange: (html) => void
 * - placeholder: texto inicial vacío
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
          toolbar: {
            items: [
              'heading', '|',
              'bold', 'italic', 'underline', '|',
              'bulletedList', 'numberedList', '|',
              'link', 'blockQuote', '|',
              'undo', 'redo'
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
