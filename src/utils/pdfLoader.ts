import * as pdfjsLib from "pdfjs-dist";
import { Presentation, Slide } from "../types";

// Set worker path from public CDN if not set
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn("PDF.js worker setup fallback:", e);
  }
}

export async function parsePdfFile(file: File): Promise<Presentation> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const slides: Slide[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    // Render to canvas to create high-res image
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      // @ts-ignore
      await page.render({ canvasContext: context, viewport }).promise;
    }

    const imageUrl = canvas.toDataURL("image/jpeg", 0.85);

    // Extract text content
    const textContent = await page.getTextContent();
    const textItems = textContent.items
      .map((item: any) => item.str?.trim())
      .filter((str: string) => Boolean(str));

    // Derive title & points
    const title = textItems[0] || `Diapositiva ${pageNum}`;
    const subtitle = textItems[1] && textItems[1].length < 80 ? textItems[1] : undefined;
    const bulletPoints = textItems.slice(subtitle ? 2 : 1, 8);

    slides.push({
      id: `pdf-slide-${pageNum}-${Date.now()}`,
      pageNumber: pageNum,
      title: title.length > 90 ? title.substring(0, 90) + "..." : title,
      subtitle,
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : ["Visual de la presentación PDF importada."],
      imageUrl,
      notes: textItems.join(" "),
    });
  }

  const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  return {
    id: "uploaded-" + Date.now(),
    title: cleanName,
    description: `Presentación cargada desde archivo PDF (${totalPages} diapositivas)`,
    author: "Presentador / Usuario",
    totalSlides: totalPages,
    isCustomPdf: true,
    slides,
  };
}
