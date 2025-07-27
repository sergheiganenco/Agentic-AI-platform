import jsPDF from "jspdf";


console.log(
  "jsPDF.prototype.autoTable is",
  typeof ((jsPDF as unknown) as { prototype: { autoTable?: unknown } }).prototype.autoTable
);

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

export function exportTableToPdf(rows: string[][], headers: string[], filename = "scan_result.pdf") {
  const doc = new jsPDF();
  
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 20,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 8 }
  });
  doc.save(filename);
}
