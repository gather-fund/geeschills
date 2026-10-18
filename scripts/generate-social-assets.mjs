import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Preserve the supplied logo's blue ice panel as the compact browser mark.
const panel = await sharp('public/assets/logo-white-background.jpeg')
  .extract({ left: 310, top: 253, width: 174, height: 174 }).png().toBuffer();
const icon = await sharp({ create: { width:512, height:512, channels:4, background:'#071e2b' } })
  .composite([{ input:await sharp(panel).resize(432,432).png().toBuffer(), left:40, top:40 }]).png().toBuffer();
await writeFile('src/app/icon.png', icon);
const frames = await Promise.all([16,32,48,64].map(size => sharp(icon).resize(size,size).png().toBuffer()));
const directory = Buffer.alloc(6 + frames.length * 16);
directory.writeUInt16LE(1,2); directory.writeUInt16LE(frames.length,4);
let offset=directory.length;
frames.forEach((frame,i)=>{const pos=6+i*16;directory[pos]=[16,32,48,64][i];directory[pos+1]=directory[pos];directory.writeUInt16LE(1,pos+4);directory.writeUInt16LE(32,pos+6);directory.writeUInt32LE(frame.length,pos+8);directory.writeUInt32LE(offset,pos+12);offset+=frame.length;});
await writeFile('src/app/favicon.ico',Buffer.concat([directory,...frames]));
const logo=await sharp('public/assets/logo-white-background.jpeg').extract({left:284,top:214,width:227,height:359}).png().toBuffer();
await sharp({create:{width:180,height:180,channels:3,background:'#fff'}}).composite([{input:await sharp(logo).resize({height:148}).png().toBuffer(),left:43,top:16}]).png().toFile('src/app/apple-icon.png');

const photo=await sharp('public/assets/iced-beer-720.webp').resize(430,630,{fit:'cover',position:'centre'}).toBuffer();
const design=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#071e2b"/>
<rect x="750" width="20" height="630" fill="#00ade0"/>
<g font-family="Arial, Helvetica, sans-serif">
<text x="145" y="83" fill="white" font-size="27" font-weight="700" letter-spacing="1">GEES CHILLS</text>
<text x="145" y="108" fill="#a6c9d7" font-size="11" letter-spacing="2">GOOD TIMES. COLD DRINKS.</text>
<text x="52" y="163" fill="#8bdff6" font-size="12" font-weight="700" letter-spacing="2.5">COOLER HIRE · GHANA</text>
<g font-size="72" font-weight="700" letter-spacing="-3">
<text x="48" y="245" fill="white">You bring</text><text x="48" y="324" fill="white">the people.</text>
<text x="48" y="413" fill="#21c4f1">We bring</text><text x="48" y="492" fill="#21c4f1">the chill.</text>
</g>
<path d="M52 535H698" stroke="#355462"/>
<text x="52" y="578" fill="white" font-size="20" font-weight="700">Every event. The right package.</text>
<text x="52" y="606" fill="#a6c9d7" font-size="14">geeschils.com</text>
</g></svg>`);
await sharp(design).composite([
  {input:photo,left:770,top:0},
  {input:await sharp(logo).resize({height:90}).png().toBuffer(),left:52,top:36},
]).jpeg({quality:90,mozjpeg:true}).toFile('src/app/opengraph-image.jpg');
await writeFile('src/app/opengraph-image.alt.txt','GEES CHILLS — You bring the people. We bring the chill. Cooler hire in Ghana, with drinks chilling on ice.\n');
