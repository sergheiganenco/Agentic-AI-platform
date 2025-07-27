// src/utils/registerJspdfPlugins.ts

import jsPDF from "jspdf";
import "jspdf-autotable";

// Optionally, verify patching (remove in prod)
console.log("autoTable type", typeof jsPDF.prototype.autoTable);
