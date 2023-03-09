import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'fs';

interface PdfFile {
  filename: string;
  content: Buffer;
}

class PdfMerger {
  private pdfFiles: PdfFile[] = [];

  public async loadPdfFiles(directoryPath: string): Promise<void> {
    try {
      const filenames = await fs.readdir(directoryPath);
      const pdfFilenames = filenames.filter(filename =>
        filename.endsWith('.pdf')
      );
      const pdfFiles: PdfFile[] = await Promise.all(
        pdfFilenames.map(async filename => {
          const content = await fs.readFile(`${directoryPath}/${filename}`);
          return { filename, content };
        })
      );
      this.pdfFiles = pdfFiles;
    } catch (error: any) {
      console.error(`Error loading PDF files: ${error.message}`);
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
    await pdfMerger.loadPdfFiles(process.cwd());
    await pdfMerger.mergePdfFiles('merged-pdfs.pdf');
  } catch (error: any) {
    console.error(
      `An error occurred while merging PDF files: ${error.message}`
    );
  }
}

mergePdfFilesInDirectory();
