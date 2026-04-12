import toast from 'react-hot-toast';
import { sanitizeHTML, sanitizePlainText } from './sanitize';

interface ExportAsPDFOptions {
  /** Author line shown below the title. If omitted, no author line is rendered. */
  author?: string;
  /** Optional image array. Each entry is a URL (relative or absolute). */
  images?: string[];
  /**
   * Base URL prepended to relative image paths.
   * Pass `process.env.REACT_APP_API_URL?.replace('/api', '')` when images are
   * stored as relative paths on the server.  Leave undefined when images already
   * contain full URLs.
   */
  imageBaseUrl?: string;
}

/**
 * Exports a note as PDF by writing content to a hidden iframe and triggering
 * the browser print dialog.  The caller is responsible for sanitizing inputs —
 * this function applies sanitizePlainText / sanitizeHTML internally.
 */
export function exportAsPDF(
  title: string,
  content: string,
  options: ExportAsPDFOptions = {}
): void {
  try {
    toast('Preparando exportación a PDF...');

    // Remove any existing print iframe
    const existingIframe = document.getElementById('pdf-print-frame');
    if (existingIframe) {
      document.body.removeChild(existingIframe);
    }

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'pdf-print-frame';
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);

    // Sanitize inputs before inserting into HTML
    const safeTitle = sanitizePlainText(title);
    const safeAuthor = options.author ? sanitizePlainText(options.author) : null;
    const formattedContent = sanitizeHTML(
      content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/\n/g, '<br>')
    );

    const { images = [], imageBaseUrl = '' } = options;

    const imagesHTML =
      images.length > 0
        ? `<div class="images">
            <h2>Imágenes adjuntas</h2>
            ${images
              .map(
                (img) =>
                  `<img src="${imageBaseUrl}${img}" alt="Imagen adjunta">`
              )
              .join('')}
          </div>`
        : '';

    const authorHTML = safeAuthor
      ? `<div class="note-info">Por: ${safeAuthor}</div>`
      : '';

    iframe.onload = () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        toast.error('Error al crear el documento PDF');
        return;
      }

      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${safeTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 20px;
              color: #333;
            }
            h1 {
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            .content {
              margin-top: 20px;
            }
            .images {
              margin-top: 30px;
              display: flex;
              flex-direction: column;
              gap: 20px;
              max-width: 20%;
            }
            .images img {
              max-width: 100%;
              height: auto;
              border: 1px solid #ddd;
            }
            .note-info {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <h1>${safeTitle}</h1>
          ${authorHTML}
          <div class="content">${formattedContent}</div>
          ${imagesHTML}
        </body>
        </html>
      `);

      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
          toast.success('Documento preparado para descargar como PDF');
        } catch (err) {
          console.error('Error al imprimir:', err);
          toast.error('Error al generar el PDF');
        }
      }, 500);
    };

    iframe.src = 'about:blank';
  } catch (error) {
    console.error('Error al exportar como PDF:', error);
    toast.error('Error al exportar como PDF');
  }
}
