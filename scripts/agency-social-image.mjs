// Render a link-preview asset from the existing, approved Fashion After Fabric photograph.
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const path='assets/optimized/agency/agency-social-20261025.jpg';
await mkdir('assets/optimized/agency',{recursive:true});
const photograph=await sharp('assets/optimized/LOOK04.webp').resize(570,630,{fit:'cover',position:'centre'}).toBuffer();
const typography=Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><g fill="#f6f6f4" font-family="Arial,Helvetica,sans-serif"><text x="52" y="56" font-size="16" letter-spacing="2">PARALLEL VISION / AGENCY</text><text x="52" y="163" font-size="88" font-weight="600" letter-spacing="-5">Fashion.</text><text x="52" y="257" font-size="88" font-weight="600" letter-spacing="-5">Film.</text><text x="52" y="351" font-size="88" font-weight="600" letter-spacing="-5">Digital.</text><text x="52" y="446" font-family="Georgia,serif" font-size="90" letter-spacing="-4">Beyond.</text><text x="56" y="546" fill="#c5c5c2" font-size="18">Creative direction, moving image</text><text x="56" y="574" fill="#c5c5c2" font-size="18">and digital worlds. Berlin.</text></g></svg>`);
await sharp({create:{width:1200,height:630,channels:3,background:'#0c0c0c'}}).composite([{input:photograph,left:630,top:0},{input:typography,left:0,top:0}]).jpeg({quality:88,mozjpeg:true}).toFile(path);
console.log(path);
