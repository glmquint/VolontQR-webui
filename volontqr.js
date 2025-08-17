function updateProgressMsg(msg) {
  const btn = document.getElementById('generate');
  btn.innerText = msg;
}
function preCreatePdf() {
  const btn = document.getElementById('generate');
  btn.disabled = true;
  btn.innerText = 'Generating...';

  const progress = document.getElementById('progress');
  progress.removeAttribute('max'); 

}
function postCreatePdf() {
  const btn = document.getElementById('generate');
  btn.disabled = false;
  btn.innerText = 'Generate All';

  const progress = document.getElementById('progress');
  progress.value = 0; // Reset progress bar
}
async function createPdf(links, file, bg_color, qr_color, preview = false) {
  updateProgressMsg('Creating PDF...');
  const pdfDoc = await PDFLib.PDFDocument.create();

  bg_color = hexToRgb(bg_color) || {r: 255, g: 255, b: 255};
  qr_color = hexToRgb(qr_color) || {r: 0, g: 0, b: 0};
  links = links.split('\n').map(link => link.trim()).filter(link => link !== '');
  if (preview) {
    links = links.slice(0, 1); // Only preview the first link
  }

  updateProgressMsg(`Generating ${links.length} QR codes...`);
  const filePdfDoc = file ? await PDFLib.PDFDocument.load(file) : null;

  await Promise.all(links.map(async link => {
    let i;
    for (i=1; i<41; i++) {
      try {
        svg_tag = create_qrcode(link, i, 'M', 'Byte', 'UTF-8');
        break;
      } catch {
        continue;
      }
    }
    let svg_path = svg_tag.split('<path d="')[1].split(' " stroke="transparent"')[0];

    width = 350;
    height = 400;
    page = null;
    if (file) {
      pages = await pdfDoc.copyPages(filePdfDoc, [0])
      page = pdfDoc.addPage(pages[0]);
      width = pages[0].getWidth();
      height = pages[0].getHeight();

    } else {
      page = await pdfDoc.addPage([width, height]);
    }
    // TODO: use https://kazuhikoarase.github.io/qrcode-generator/js/demo/
    // to find all generated QR codes sizes
    w = [58, 66, 74, 82, 90, 98, 106, 114, 122, 130][i-1];
    h = w;
    page.moveTo(width/2 - w/2, height/2 - h/2); // (0, 0) is bottom-left corner
    page.drawRectangle({width: w, height: h, color: PDFLib.rgb(bg_color.r/255, bg_color.g/255, bg_color.b/255)});
    page.moveTo(width/2 - w/2, height/2 + h/2); // (0, 0) is bottom-left corner
    page.drawSvgPath(svg_path, {color: PDFLib.rgb(qr_color.r/255, qr_color.g/255, qr_color.b/255)});
    // page.drawText(link);

    console.log('Page created for link:', link);
    // progress.value += 1; // Increment progress bar
    // page.drawText(link);
  })).then(async () => {
    updateProgressMsg('Saving PDF...');
    if (pdfDoc.getPages().length == 0 && filePdfDoc) {
      // If no links were provided, just show the first page of the PDF
      pages = await pdfDoc.copyPages(filePdfDoc, [0])
      pdfDoc.addPage(pages[0]);
    }
    if (preview) {
      const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
      document.getElementById('pdf').src = pdfDataUri;
    } else {
      const pdfBytes = await pdfDoc.save();
      var blob=new Blob([pdfBytes], {type: "application/pdf"});
      var link=document.createElement('a');
      link.href=window.URL.createObjectURL(blob);
      link.target = 'blank'
      // link.download="tickets.pdf";
      link.click();
      link.remove();
    }
  });

}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
function create_qrcode(text, typeNumber, errorCorrectionLevel, mode, mb) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs[mb];
  var qr = qrcode(typeNumber || 4, errorCorrectionLevel || 'M');
  qr.addData(text, mode);
  qr.make();
  r = qr.createSvgTag({ alt: '</svg>puke'});
  return r;
};
async function update(preview = true) {
  preCreatePdf();
  links = document.getElementById('msg').value
  file = document.getElementById('file').files[0];
  bg_color = document.getElementById('bg-color').value;
  qr_color = document.getElementById('qr-color').value;
  if (file) {
    updateProgressMsg('Loading PDF...');
    file = await file.arrayBuffer();
  }
  await createPdf(links, file, bg_color, qr_color, preview);
  postCreatePdf();
}

