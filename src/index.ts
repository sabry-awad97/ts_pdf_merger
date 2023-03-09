import { PDFDocument } from 'pdf-lib';
import { Readable } from 'stream';
import { promises as fs, createReadStream } from 'fs';

interface PdfFile {
  filename: string;
  content: Buffer;
}

class PdfMerger {
  private pdfFiles: PdfFile[] = [];

  public async loadPdfFile(filename: string, stream: Readable): Promise<void> {
    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks);
      this.pdfFiles.push({ filename, content });
    } catch (error: any) {
      console.error(`Error loading PDF file ${filename}: ${error.message}`);
      throw error;
    }
  }

  public async mergePdfFiles(outputPath: string): Promise<void> {
    try {
      if (this.pdfFiles.length === 0) {
        throw new Error('No PDF files to merge');
      }

      this.pdfFiles.sort((a, b) => a.filename.localeCompare(b.filename));
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of this.pdfFiles) {
        const srcDoc = await PDFDocument.load(pdfFile.content, {
          ignoreEncryption: true,
        });
        const indices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
        copiedPages.forEach(page => {
          mergedPdf.addPage(page);
        });
      }

      const pdfBytes = await mergedPdf.save();
      await fs.writeFile(outputPath, pdfBytes);
      console.log(`Merged PDFs saved to ${outputPath}`);
    } catch (error: any) {
      console.error(`Error merging PDF files: ${error.message}`);
      throw error;
    }
  }
}

async function mergePdfFilesInDirectory() {
  const pdfMerger = new PdfMerger();
  try {
    const files = await fs.readdir(process.cwd());
    const pdfFiles = files.filter(filename => filename.endsWith('.pdf'));
    await Promise.all(
      pdfFiles.map(async filename => {
        const stream = createReadStream(filename);
        await pdfMerger.loadPdfFile(filename, stream);
      })
    );
    await pdfMerger.mergePdfFiles('merged-pdfs.pdf');
  } catch (error: any) {
    console.error(
      `An error occurred while merging PDF files: ${error.message}`
    );
  }
}

mergePdfFilesInDirectory();
